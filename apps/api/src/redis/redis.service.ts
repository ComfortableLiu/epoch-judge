import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createRedisClient } from '@epoch-judge/redis';
import type Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;
  readonly subscriber: Redis;

  constructor() {
    this.client = createRedisClient({ maxRetriesPerRequest: 3 });
    this.subscriber = createRedisClient({ maxRetriesPerRequest: 3 });
  }

  async onModuleDestroy() {
    await this.client.quit();
    await this.subscriber.quit();
  }
}
