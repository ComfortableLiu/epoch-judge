import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createRedisClient } from '@epoch-judge/redis';
import type Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;
  readonly subscriber: Redis;

  constructor() {
    this.client = createRedisClient({ maxRetriesPerRequest: null });
    this.subscriber = createRedisClient({ maxRetriesPerRequest: null });
  }

  async onModuleDestroy() {
    await this.client.quit();
    await this.subscriber.quit();
  }
}
