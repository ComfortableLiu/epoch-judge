import { Injectable, Logger } from '@nestjs/common';
import {
  getBullMqQueueOptions,
  getRedisConnectionOptions,
  RedisKeys,
} from '@epoch-judge/redis';
import type { JudgeTaskPayload } from '@epoch-judge/shared';
import { Queue } from 'bullmq';

@Injectable()
export class JudgeQueueService {
  private readonly logger = new Logger(JudgeQueueService.name);
  private readonly queue: Queue<JudgeTaskPayload>;

  constructor() {
    const queueName = RedisKeys.judgeQueueName();
    const prefix = RedisKeys.judgeQueuePrefix();
    this.queue = new Queue<JudgeTaskPayload>(queueName, {
      connection: getRedisConnectionOptions(undefined, { bullMq: true }),
      ...getBullMqQueueOptions(),
    });
    this.logger.log(`Judge queue ready name=${queueName} prefix=${prefix}`);
  }

  async enqueue(task: JudgeTaskPayload, jobId?: string) {
    const id = jobId ?? task.submissionId;
    const existing = await this.queue.getJob(id);
    if (existing) {
      await existing.remove().catch(() => undefined);
      this.logger.warn(`Removed stale queue job id=${id} before re-enqueue`);
    }
    const job = await this.queue.add('judge', task, {
      jobId: id,
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
    this.logger.log(
      `Enqueued job id=${id} submission=${task.submissionId} problem=${task.problemId} bullId=${job.id}`,
    );
  }
}
