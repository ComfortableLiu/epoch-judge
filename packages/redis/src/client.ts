import { loadMonorepoEnv } from '@epoch-judge/shared';
import Redis, { type RedisOptions } from 'ioredis';
import { ensureRedisUrl, getRedisConnectionOptions } from './redis-config';

export interface CreateRedisClientOptions {
  maxRetriesPerRequest?: number | null;
  connectTimeout?: number;
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
    connectTimeout: options.connectTimeout ?? 10_000,
    enableReadyCheck: true,
    maxRetriesPerRequest:
      options.maxRetriesPerRequest === null
        ? null
        : (options.maxRetriesPerRequest ?? 3),
    lazyConnect: options.lazyConnect,
  };
  return new Redis(redisOptions);
}
