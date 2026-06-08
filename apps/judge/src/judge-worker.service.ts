import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import { LRUCache } from 'lru-cache';
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
  type JudgeTestcasePayload,
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
  private readonly logger = new Logger(JudgeWorkerService.name);
  private worker?: Worker<JudgeTaskPayload>;
  private publisher?: ReturnType<typeof createRedisClient>;
  /** 同题测例元数据 LRU 缓存，防止内存无限增长 */
  private readonly problemTestcasesCache: LRUCache<string, JudgeTestcasePayload[]>;

  constructor(private readonly config: ConfigService) {
    const maxSize = Number(this.config.get('JUDGE_CACHE_MAX_SIZE', 1000));
    this.problemTestcasesCache = new LRUCache<string, JudgeTestcasePayload[]>({
      max: maxSize,
    });
    this.logger.log(`LRU cache initialized with maxSize=${maxSize}`);
  }

  onModuleInit() {
    const conn = getRedisConnectionOptions(undefined, { bullMq: true });
    this.publisher = createRedisClient({ maxRetriesPerRequest: null });
    const storage = createStorageProvider(
      storageConfigFromEnv({
        STORAGE_TYPE: this.config.get('STORAGE_TYPE'),
        STORAGE_LOCAL_ROOT: this.config.get('STORAGE_LOCAL_ROOT'),
        S3_ENDPOINT: this.config.get('S3_ENDPOINT'),
        S3_BUCKET: this.config.get('S3_BUCKET'),
        S3_ACCESS_KEY: this.config.get('S3_ACCESS_KEY'),
        S3_SECRET_KEY: this.config.get('S3_SECRET_KEY'),
        S3_PREFIX: this.config.get('S3_PREFIX'),
        S3_REGION: this.config.get('S3_REGION'),
      }),
    );
    const concurrency = Number(this.config.get('JUDGE_WORKER_CONCURRENCY', 2));
    const mock = this.config.get('JUDGE_MOCK', 'false') === 'true';
    const nodeName = this.config.get('HOSTNAME', 'judge-1');
    const queueName = RedisKeys.judgeQueueName();
    const queuePrefix = RedisKeys.judgeQueuePrefix();

    const storageCfg = storageConfigFromEnv({
      STORAGE_TYPE: this.config.get('STORAGE_TYPE'),
      STORAGE_LOCAL_ROOT: this.config.get('STORAGE_LOCAL_ROOT'),
    });
    this.logger.log(
      `Worker starting node=${nodeName} queue=${queueName} prefix=${queuePrefix} concurrency=${concurrency} mock=${mock} redis=${conn.host}:${conn.port} storageLocalRoot=${storageCfg.type === 'local' ? storageCfg.localRoot : 's3'}`,
    );

    void this.registerHeartbeat(nodeName, concurrency);

    this.worker = new Worker<JudgeTaskPayload>(
      queueName,
      async (job) => this.runJob(job.id ?? 'unknown', job.data, storage, mock),
      { connection: conn, concurrency, ...getBullMqQueueOptions() },
    );

    this.worker.on('active', (job) => {
      this.logger.log(
        `BullMQ active jobId=${job.id} submission=${job.data.submissionId} problem=${job.data.problemId}`,
      );
    });
    this.worker.on('completed', (job) => {
      this.logger.log(
        `BullMQ completed jobId=${job.id} submission=${job.data.submissionId}`,
      );
    });
    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `BullMQ failed jobId=${job?.id ?? '?'} submission=${job?.data?.submissionId ?? '?'}`,
        err instanceof Error ? err.stack : String(err),
      );
    });
    this.worker.on('error', (err) => {
      this.logger.error(
        'BullMQ worker connection error',
        err instanceof Error ? err.stack : String(err),
      );
    });

    setInterval(
      () => void this.registerHeartbeat(nodeName, concurrency),
      15000,
    );

    this.logger.log('Worker ready and listening for jobs');
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

  private log(submissionId: string, message: string) {
    this.logger.log(`[${submissionId}] ${message}`);
  }

  private logError(submissionId: string, message: string, err: unknown) {
    const detail =
      err instanceof Error ? err.stack ?? err.message : String(err);
    this.logger.error(`[${submissionId}] ${message} — ${detail}`);
  }

  private async releaseInflight(submissionId: string) {
    const inflightKey = RedisKeys.judgeInflight();
    const after = await this.publisher?.decr(inflightKey);
    const n = await this.publisher?.get(inflightKey);
    if (n !== null && Number(n) < 0) await this.publisher?.set(inflightKey, '0');
    this.log(submissionId, `inflight released (counter=${after ?? '?'})`);
  }

  private async resolveTestcases(
    task: JudgeTaskPayload,
    submissionId: string,
  ): Promise<JudgeTestcasePayload[]> {
    if (task.testcases?.length) {
      return task.testcases;
    }
    const cached = this.problemTestcasesCache.get(task.problemId);
    if (cached) {
      this.log(submissionId, `testcases cache hit problem=${task.problemId} count=${cached.length}`);
      return cached;
    }
    const problem = await prisma.problem.findUnique({
      where: { id: task.problemId },
      include: { testcases: { orderBy: { ordinal: 'asc' } } },
    });
    if (!problem) {
      throw new Error(`Problem ${task.problemId} not found`);
    }
    const testcases = problem.testcases.map((tc) => ({
      id: tc.id,
      inputKey: tc.inputKey,
      outputKey: tc.outputKey,
      score: tc.score,
    }));
    this.problemTestcasesCache.set(task.problemId, testcases);
    this.log(
      submissionId,
      `testcases loaded from DB problem=${task.problemId} count=${testcases.length}`,
    );
    return testcases;
  }

  private async failSubmission(
    submissionId: string,
    err: unknown,
    priorStatus?: SubmissionStatus,
  ) {
    this.logError(submissionId, `judge failed (was ${priorStatus ?? 'unknown'})`, err);
    try {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: SubmissionStatus.SYSTEM_ERROR },
      });
      await this.publish(submissionId, {
        type: 'done',
        status: SubmissionStatus.SYSTEM_ERROR,
        score: 0,
      });
    } catch (updateErr) {
      this.logError(submissionId, 'failed to persist SYSTEM_ERROR', updateErr);
    }
  }

  private async runJob(
    bullJobId: string,
    task: JudgeTaskPayload,
    storage: ReturnType<typeof createStorageProvider>,
    mock: boolean,
  ) {
    const { submissionId } = task;
    let priorStatus: SubmissionStatus | undefined;
    try {
      const testcases = await this.resolveTestcases(task, submissionId);
      this.log(
        submissionId,
        `runJob start bullJobId=${bullJobId} problem=${task.problemId} lang=${task.language} mode=${task.judgeMode} testcases=${testcases.length} mock=${mock}`,
      );
      const current = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: { status: true },
      });
      if (!current) {
        this.logger.warn(`[${submissionId}] submission not found, skipping job`);
        return;
      }
      priorStatus = current.status;
      const isRejudge = current.status === SubmissionStatus.REJUDGE_QUEUED;
      const activeStatus = isRejudge
        ? SubmissionStatus.REJUDGING
        : SubmissionStatus.JUDGING;
      this.log(
        submissionId,
        `status ${current.status} -> ${activeStatus} (rejudge=${isRejudge})`,
      );

      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: activeStatus },
      });
      await this.publish(submissionId, {
        type: 'status',
        status: activeStatus,
      });

      let totalScore = 0;
      let allAc = true;
      let maxTime = 0;
      let maxMem = 0;
      let firstFail: TestcaseVerdict | null = null;

      for (let i = 0; i < testcases.length; i++) {
        const tc = testcases[i];
        let verdict: TestcaseVerdict = TestcaseVerdict.ACCEPTED;
        let score = 0;
        let timeMs = 0;
        let memoryKb = 0;

        this.log(
          submissionId,
          `testcase ${i + 1}/${testcases.length} id=${tc.id} inputKey=${tc.inputKey}`,
        );

        if (mock) {
          verdict = TestcaseVerdict.ACCEPTED;
          score = tc.score;
          timeMs = 1;
          memoryKb = 1024;
        } else {
          const t0 = Date.now();
          const input = await storage.read(tc.inputKey);
          const expected = await storage.read(tc.outputKey);
          this.log(
            submissionId,
            `storage read ok (${Date.now() - t0}ms) input=${input.content.length}b expected=${expected.content.length}b`,
          );
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
          this.log(
            submissionId,
            `sandbox verdict=${result.verdict} mapped=${verdict} time=${timeMs}ms mem=${memoryKb}kb`,
          );
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
              submissionId,
              testcaseId: tc.id,
            },
          },
          data: { verdict, score, timeMs, memoryKb },
        });

        await this.publish(submissionId, {
          type: 'testcase',
          testcaseId: tc.id,
          verdict,
          score,
          timeMs,
          memoryKb,
        });

        if (task.judgeMode === JudgeMode.ACM && !allAc) {
          this.log(submissionId, 'ACM early exit after first failure');
          break;
        }
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
        where: { id: submissionId },
        data: {
          status: finalStatus,
          score: isOi ? totalScore : allAc ? totalScore : 0,
          timeMs: maxTime,
          memoryKb: maxMem,
        },
      });

      await this.publish(submissionId, {
        type: 'done',
        status: finalStatus,
        score: isOi ? totalScore : allAc ? totalScore : 0,
      });

      this.log(
        submissionId,
        `runJob done finalStatus=${finalStatus} score=${isOi ? totalScore : allAc ? totalScore : 0}`,
      );
    } catch (err) {
      await this.failSubmission(submissionId, err, priorStatus);
      throw err;
    } finally {
      await this.releaseInflight(submissionId);
    }
  }
}
