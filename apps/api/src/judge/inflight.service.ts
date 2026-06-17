import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisKeys } from '@epoch-judge/redis';
import { MetricsService } from '../metrics/metrics.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class InflightService {
  private readonly logger = new Logger(InflightService.name);
  private readonly max: number;

  constructor(
    private readonly redis: RedisService,
    private readonly metrics: MetricsService,
    config: ConfigService,
  ) {
    this.max = Number(config.get('JUDGE_GLOBAL_MAX_INFLIGHT', 10));
  }

  async acquire(): Promise<void> {
    const key = RedisKeys.judgeInflight();
    const n = await this.redis.client.incr(key);
    this.metrics.judgeInflight.set(n);
    this.logger.log(`inflight acquire key=${key} count=${n} max=${this.max}`);
    if (n > this.max) {
      await this.redis.client.decr(key);
      this.metrics.judgeInflight.set(n - 1);
      this.logger.warn(`inflight rejected count=${n} max=${this.max}`);
      throw new BadRequestException('Judge queue is full, try again later');
    }
  }

  async release(): Promise<void> {
    const key = RedisKeys.judgeInflight();
    const n = await this.redis.client.decr(key);
    if (n < 0) await this.redis.client.set(key, '0');
    this.metrics.judgeInflight.set(Math.max(n, 0));
    this.logger.log(`inflight release key=${key} count=${n}`);
  }
}
