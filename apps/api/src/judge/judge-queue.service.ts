import { Injectable } from '@nestjs/common';
import {
  getBullMqQueueOptions,
  getRedisConnectionOptions,
  RedisKeys,
} from '@epoch-judge/redis';
import type { JudgeTaskPayload } from '@epoch-judge/shared';
import { Queue } from 'bullmq';

@Injectable()
export class JudgeQueueService {
  private readonly queue: Queue<JudgeTaskPayload>;

  constructor() {
    this.queue = new Queue<JudgeTaskPayload>(RedisKeys.judgeQueueName(), {
      connection: getRedisConnectionOptions(),
      ...getBullMqQueueOptions(),
    });
  }

  async enqueue(task: JudgeTaskPayload) {
    await this.queue.add('judge', task, {
      jobId: task.submissionId,
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }
}
