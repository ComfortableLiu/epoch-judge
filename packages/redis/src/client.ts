import { loadMonorepoEnv } from '@epoch-judge/shared';
import Redis, { type RedisOptions } from 'ioredis';
import { ensureRedisUrl, getRedisConnectionOptions } from './redis-config';

export interface CreateRedisClientOptions {
  maxRetriesPerRequest?: number | null;
  /** 订阅客户端建议设为 true */
  lazyConnect?: boolean;
}

export function createRedisClient(
  options: CreateRedisClientOptions = {},
): Redis {
  loadMonorepoEnv();
  ensureRedisUrl();
  const base = getRedisConnectionOptions();
  const redisOptions: RedisOptions = {
    host: base.host,
    port: base.port,
    password: base.password,
    db: base.db,
    maxRetriesPerRequest:
      options.maxRetriesPerRequest === null
        ? null
        : (options.maxRetriesPerRequest ?? undefined),
    lazyConnect: options.lazyConnect,
  };
  return new Redis(redisOptions);
}
