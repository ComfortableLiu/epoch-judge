import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  SubmissionStatus,
  TestcaseVerdict,
  type Problem,
  type Submission,
} from '@epoch-judge/db';
import type { JudgeTaskPayload } from '@epoch-judge/shared';
import { PrismaService } from '../prisma/prisma.service';
import { InflightService } from './inflight.service';
import { JudgeQueueService } from './judge-queue.service';
import { ProblemTestcasesCacheService } from './problem-testcases-cache.service';

type ProblemWithTestcases = Problem & {
  testcases: { id: string; inputKey: string; outputKey: string; score: number }[];
};

type SubmissionWithProblem = Submission & {
  problem: ProblemWithTestcases;
  testcaseResults: { id: string; testcaseId: string }[];
};

@Injectable()
export class JudgeTaskService {
  private readonly logger = new Logger(JudgeTaskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly judgeQueue: JudgeQueueService,
    private readonly inflight: InflightService,
    private readonly testcasesCache: ProblemTestcasesCacheService,
  ) {}

  buildPayload(sub: {
    id: string;
    problemId: string;
    language: string;
    judgeMode: string;
    sourceCode: string;
    problem: { timeLimitMs: number; memoryLimitKb: number };
  }): JudgeTaskPayload {
    return {
      submissionId: sub.id,
      problemId: sub.problemId,
      language: sub.language as JudgeTaskPayload['language'],
      judgeMode: sub.judgeMode as JudgeTaskPayload['judgeMode'],
      sourceCode: sub.sourceCode,
      timeLimitMs: sub.problem.timeLimitMs,
      memoryLimitKb: sub.problem.memoryLimitKb,
    };
  }

  async syncTestcaseResults(
    submissionId: string,
    testcases: ProblemWithTestcases['testcases'],
    existing: { id: string; testcaseId: string }[],
  ) {
    const testcaseIds = new Set(testcases.map((tc) => tc.id));
    const stale = existing.filter((r) => !testcaseIds.has(r.testcaseId));
    if (stale.length) {
      await this.prisma.client.submissionTestcaseResult.deleteMany({
        where: { id: { in: stale.map((r) => r.id) } },
      });
    }
    const existingIds = new Set(
      existing.filter((r) => testcaseIds.has(r.testcaseId)).map((r) => r.testcaseId),
    );
    const missing = testcases.filter((tc) => !existingIds.has(tc.id));
    if (missing.length) {
      await this.prisma.client.submissionTestcaseResult.createMany({
        data: missing.map((tc) => ({
          submissionId,
          testcaseId: tc.id,
          verdict: TestcaseVerdict.PENDING,
        })),
      });
    }
  }

  async resetTestcaseResults(submissionId: string) {
    await this.prisma.client.submissionTestcaseResult.updateMany({
      where: { submissionId },
      data: {
        verdict: TestcaseVerdict.PENDING,
        score: 0,
        timeMs: null,
        memoryKb: null,
      },
    });
  }

  async loadSubmission(submissionId: string): Promise<SubmissionWithProblem> {
    const sub = await this.prisma.client.submission.findUnique({
      where: { id: submissionId },
      include: {
        problem: true,
        testcaseResults: true,
      },
    });
    if (!sub) throw new NotFoundException(`Submission ${submissionId} not found`);

    // Use cached testcases
    const testcases = await this.testcasesCache.getTestcases(sub.problemId);

    return {
      ...sub,
      problem: {
        ...sub.problem,
        testcases,
      },
    };
  }

  async enqueuePrepared(
    sub: SubmissionWithProblem,
    opts: {
      queueStatus: SubmissionStatus;
      jobId?: string;
      clearScore?: boolean;
      rejudgeMeta?: { rejudgeCount: number; lastRejudgedAt: Date };
    },
  ) {
    await this.syncTestcaseResults(sub.id, sub.problem.testcases, sub.testcaseResults);
    await this.resetTestcaseResults(sub.id);

    await this.prisma.client.submission.update({
      where: { id: sub.id },
      data: {
        status: opts.queueStatus,
        ...(opts.clearScore
          ? { score: null, timeMs: null, memoryKb: null }
          : {}),
        ...(opts.rejudgeMeta ?? {}),
      },
    });

    const task = this.buildPayload(sub);
    await this.inflight.acquire();
    try {
      await this.judgeQueue.enqueue(task, opts.jobId ?? sub.id);
      this.logger.log(
        `Enqueued submission=${sub.id} problem=${sub.problemId} jobId=${opts.jobId ?? sub.id} status=${opts.queueStatus}`,
      );
    } catch (e) {
      await this.inflight.release();
      throw e;
    }
  }

  /** 新提交入队（测例行已创建，仅重置为 PENDING 并入队） */
  async enqueueNewSubmission(submissionId: string) {
    const sub = await this.loadSubmission(submissionId);
    await this.enqueuePrepared(sub, {
      queueStatus: SubmissionStatus.QUEUED,
      jobId: sub.id,
    });
  }

  /** 重判终态提交 */
  async enqueueRejudge(submissionId: string) {
    const sub = await this.loadSubmission(submissionId);
    const nextRejudgeCount = sub.rejudgeCount + 1;
    await this.enqueuePrepared(sub, {
      queueStatus: SubmissionStatus.REJUDGE_QUEUED,
      jobId: `${sub.id}:rejudge:${nextRejudgeCount}`,
      clearScore: true,
      rejudgeMeta: {
        rejudgeCount: nextRejudgeCount,
        lastRejudgedAt: new Date(),
      },
    });
  }

  /** 恢复未终态提交（启动时或异常中断后） */
  async recoverSubmission(submissionId: string) {
    const sub = await this.loadSubmission(submissionId);
    const isRejudge =
      sub.status === SubmissionStatus.REJUDGE_QUEUED ||
      sub.status === SubmissionStatus.REJUDGING;
    const queueStatus = isRejudge
      ? SubmissionStatus.REJUDGE_QUEUED
      : SubmissionStatus.QUEUED;
    const jobId = isRejudge
      ? `${sub.id}:rejudge:${sub.rejudgeCount + 1}`
      : `${sub.id}:recover:${Date.now()}`;

    await this.enqueuePrepared(sub, {
      queueStatus,
      jobId,
      clearScore: true,
      ...(isRejudge
        ? {
            rejudgeMeta: {
              rejudgeCount: sub.rejudgeCount + 1,
              lastRejudgedAt: new Date(),
            },
          }
        : {}),
    });
  }
}
