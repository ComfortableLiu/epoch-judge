import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  JudgeMode,
  Language,
  SubmissionStatus,
  TestcaseVerdict,
} from '@epoch-judge/db';
import type { JudgeTaskPayload } from '@epoch-judge/shared';
import { RedisKeys } from '@epoch-judge/redis';
import { PrismaService } from '../prisma/prisma.service';
import { InflightService } from '../judge/inflight.service';
import { JudgeQueueService } from '../judge/judge-queue.service';
import { scanSourceCode } from '../judge/security.scanner';
import { t } from '../common/messages';
import { CreateSubmissionDto } from './submissions.dto';
import { ContestsService } from '../contests/contests.service';

const SUPPORTED = new Set<string>(Object.values(Language));

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly judgeQueue: JudgeQueueService,
    private readonly inflight: InflightService,
    private readonly contests: ContestsService,
  ) {}

  async create(userId: string, dto: CreateSubmissionDto, locale: string) {
    if (!SUPPORTED.has(dto.language)) {
      throw new BadRequestException('Unsupported language');
    }
    const violation = scanSourceCode(dto.language, dto.sourceCode);
    if (violation) {
      throw new BadRequestException({
        messageKey: 'security.forbidden_pattern',
        message: t('security.forbidden_pattern', locale),
      });
    }

    const problem = await this.prisma.client.problem.findUnique({
      where: { id: dto.problemId },
      include: { testcases: { orderBy: { ordinal: 'asc' } } },
    });
    if (!problem) throw new NotFoundException();

    if (dto.contestId) {
      const active = await this.contests.isActiveForSubmit(dto.contestId);
      if (!active) {
        throw new ForbiddenException({
          messageKey: 'contest.not_active',
          message: t('contest.not_active', locale),
        });
      }
    }

    const judgeMode = dto.judgeMode ?? problem.defaultJudgeMode;
    const submission = await this.prisma.client.submission.create({
      data: {
        userId,
        problemId: problem.id,
        contestId: dto.contestId,
        language: dto.language,
        judgeMode,
        sourceCode: dto.sourceCode,
        status: SubmissionStatus.QUEUED,
      },
    });

    await this.prisma.client.submissionTestcaseResult.createMany({
      data: problem.testcases.map((tc) => ({
        submissionId: submission.id,
        testcaseId: tc.id,
        verdict: TestcaseVerdict.PENDING,
      })),
    });

    await this.inflight.acquire();
    const task: JudgeTaskPayload = {
      submissionId: submission.id,
      problemId: problem.id,
      language: dto.language as JudgeTaskPayload['language'],
      judgeMode: judgeMode as JudgeTaskPayload['judgeMode'],
      sourceCode: dto.sourceCode,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitKb: problem.memoryLimitKb,
      testcases: problem.testcases.map((tc) => ({
        id: tc.id,
        inputKey: tc.inputKey,
        outputKey: tc.outputKey,
        score: tc.score,
      })),
    };
    await this.judgeQueue.enqueue(task);

    return { id: submission.id, status: submission.status };
  }

  async listForUser(userId: string, problemId?: string) {
    return this.prisma.client.submission.findMany({
      where: { userId, problemId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        status: true,
        language: true,
        score: true,
        createdAt: true,
        problem: { select: { slug: true, title: true } },
        user: { select: { username: true, displayName: true } },
      },
    });
  }

  async getDetail(id: string, userId?: string) {
    const sub = await this.prisma.client.submission.findUnique({
      where: { id },
      include: {
        testcaseResults: { include: { testcase: true } },
        problem: { select: { slug: true, title: true } },
      },
    });
    if (!sub) throw new NotFoundException();
    if (userId && sub.userId !== userId) {
      const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'ADMIN') throw new ForbiddenException();
    }
    return sub;
  }

  streamChannel() {
    return RedisKeys.judgeEvents();
  }
}
