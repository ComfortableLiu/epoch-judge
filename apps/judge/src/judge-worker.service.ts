import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import { judgeOneTestcase } from '@epoch-judge/judge-sandbox';
import {
  createRedisClient,
  getBullMqQueueOptions,
  getRedisConnectionOptions,
  RedisKeys,
} from '@epoch-judge/redis';
import {
  JudgeMode,
  Language,
  type JudgeTaskPayload,
} from '@epoch-judge/shared';
import { SubmissionStatus, TestcaseVerdict, prisma } from '@epoch-judge/db';
import {
  createStorageProvider,
  storageConfigFromEnv,
} from '@epoch-judge/storage';

function mapVerdict(code: string): TestcaseVerdict {
  const m: Record<string, TestcaseVerdict> = {
    ACCEPTED: TestcaseVerdict.ACCEPTED,
    WRONG_ANSWER: TestcaseVerdict.WRONG_ANSWER,
    TIME_LIMIT_EXCEEDED: TestcaseVerdict.TIME_LIMIT_EXCEEDED,
    MEMORY_LIMIT_EXCEEDED: TestcaseVerdict.MEMORY_LIMIT_EXCEEDED,
    RUNTIME_ERROR: TestcaseVerdict.RUNTIME_ERROR,
    COMPILE_ERROR: TestcaseVerdict.COMPILE_ERROR,
    SYSTEM_ERROR: TestcaseVerdict.RUNTIME_ERROR,
  };
  return m[code] ?? TestcaseVerdict.RUNTIME_ERROR;
}

@Injectable()
export class JudgeWorkerService implements OnModuleInit {
  private worker?: Worker<JudgeTaskPayload>;
  private publisher?: ReturnType<typeof createRedisClient>;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const conn = getRedisConnectionOptions();
    this.publisher = createRedisClient({ maxRetriesPerRequest: null });
    const storage = createStorageProvider(storageConfigFromEnv(process.env));
    const concurrency = Number(this.config.get('JUDGE_WORKER_CONCURRENCY', 2));
    const mock = this.config.get('JUDGE_MOCK', 'false') === 'true';
    const nodeName = this.config.get('HOSTNAME', 'judge-1');

    void this.registerHeartbeat(nodeName, concurrency);

    this.worker = new Worker<JudgeTaskPayload>(
      RedisKeys.judgeQueueName(),
      async (job) => this.runJob(job.data, storage, mock),
      { connection: conn, concurrency, ...getBullMqQueueOptions() },
    );

    setInterval(
      () => void this.registerHeartbeat(nodeName, concurrency),
      15000,
    );
  }

  private async registerHeartbeat(name: string, concurrency: number) {
    await prisma.judgeNode.upsert({
      where: { id: name },
      create: {
        id: name,
        name,
        lastHeartbeat: new Date(),
        concurrency,
        isOnline: true,
      },
      update: {
        lastHeartbeat: new Date(),
        concurrency,
        isOnline: true,
      },
    });
  }

  private async publish(submissionId: string, payload: Record<string, unknown>) {
    await this.publisher?.publish(
      RedisKeys.judgeEvents(),
      JSON.stringify({ submissionId, ...payload }),
    );
  }

  private async runJob(
    task: JudgeTaskPayload,
    storage: ReturnType<typeof createStorageProvider>,
    mock: boolean,
  ) {
    await prisma.submission.update({
      where: { id: task.submissionId },
      data: { status: SubmissionStatus.JUDGING },
    });
    await this.publish(task.submissionId, { type: 'status', status: 'JUDGING' });

    let totalScore = 0;
    let allAc = true;
    let maxTime = 0;
    let maxMem = 0;
    let firstFail: TestcaseVerdict | null = null;

    for (const tc of task.testcases) {
      let verdict: TestcaseVerdict = TestcaseVerdict.ACCEPTED;
      let score = 0;
      let timeMs = 0;
      let memoryKb = 0;

      if (mock) {
        verdict = TestcaseVerdict.ACCEPTED;
        score = tc.score;
        timeMs = 1;
        memoryKb = 1024;
      } else {
        const input = await storage.read(tc.inputKey);
        const expected = await storage.read(tc.outputKey);
        const result = await judgeOneTestcase({
          language: task.language as Language,
          sourceCode: task.sourceCode,
          input: input.content,
          expectedOutput: expected.content,
          timeLimitMs: task.timeLimitMs,
          memoryLimitKb: task.memoryLimitKb,
        });
        verdict = mapVerdict(result.verdict);
        timeMs = result.timeMs;
        memoryKb = result.memoryKb;
        score = verdict === TestcaseVerdict.ACCEPTED ? tc.score : 0;
        if (verdict !== TestcaseVerdict.ACCEPTED) {
          allAc = false;
          if (!firstFail) firstFail = verdict;
        }
      }

      totalScore += score;
      maxTime = Math.max(maxTime, timeMs);
      maxMem = Math.max(maxMem, memoryKb);

      await prisma.submissionTestcaseResult.update({
        where: {
          submissionId_testcaseId: {
            submissionId: task.submissionId,
            testcaseId: tc.id,
          },
        },
        data: { verdict, score, timeMs, memoryKb },
      });

      await this.publish(task.submissionId, {
        type: 'testcase',
        testcaseId: tc.id,
        verdict,
        score,
        timeMs,
        memoryKb,
      });

      if (task.judgeMode === JudgeMode.ACM && !allAc) break;
    }

    const isOi = task.judgeMode === JudgeMode.OI;
    let finalStatus: SubmissionStatus;
    if (allAc) {
      finalStatus = SubmissionStatus.ACCEPTED;
    } else if (isOi && totalScore > 0) {
      finalStatus = SubmissionStatus.WRONG_ANSWER;
    } else {
      finalStatus =
        firstFail === TestcaseVerdict.TIME_LIMIT_EXCEEDED
          ? SubmissionStatus.TIME_LIMIT_EXCEEDED
          : firstFail === TestcaseVerdict.COMPILE_ERROR
            ? SubmissionStatus.COMPILE_ERROR
            : firstFail === TestcaseVerdict.MEMORY_LIMIT_EXCEEDED
              ? SubmissionStatus.MEMORY_LIMIT_EXCEEDED
              : firstFail === TestcaseVerdict.RUNTIME_ERROR
                ? SubmissionStatus.RUNTIME_ERROR
                : SubmissionStatus.WRONG_ANSWER;
    }

    await prisma.submission.update({
      where: { id: task.submissionId },
      data: {
        status: finalStatus,
        score: isOi ? totalScore : allAc ? totalScore : 0,
        timeMs: maxTime,
        memoryKb: maxMem,
      },
    });

    await this.publish(task.submissionId, {
      type: 'done',
      status: finalStatus,
      score: isOi ? totalScore : allAc ? totalScore : 0,
    });

    const inflightKey = RedisKeys.judgeInflight();
    await this.publisher?.decr(inflightKey);
    const n = await this.publisher?.get(inflightKey);
    if (n !== null && Number(n) < 0) await this.publisher?.set(inflightKey, '0');
  }
}
