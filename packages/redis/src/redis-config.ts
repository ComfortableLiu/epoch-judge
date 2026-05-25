export interface RedisConfig {
  host: string;
  port: number;
  password: string;
  /** 拼接到所有 Redis key 前的服务级前缀，用于区分不同部署/服务 */
  keyPrefix: string;
  db?: number;
}

import { loadMonorepoEnv } from '@epoch-judge/shared';

export function resolveRedisConfig(env: NodeJS.ProcessEnv = process.env): RedisConfig {
  loadMonorepoEnv();
  const prefix = (env.REDIS_KEY_PREFIX ?? 'epoch-judge').replace(/:+$/, '');
  return {
    host: env.REDIS_HOST ?? 'localhost',
    port: Number(env.REDIS_PORT ?? 6379),
    password: env.REDIS_PASSWORD ?? '',
    keyPrefix: prefix,
    db: env.REDIS_DB ? Number(env.REDIS_DB) : 0,
  };
}

export function buildRedisUrl(config?: RedisConfig): string {
  const c = config ?? resolveRedisConfig();
  const auth = c.password
    ? `:${encodeURIComponent(c.password)}@`
    : '';
  const db = c.db && c.db > 0 ? `/${c.db}` : '';
  return `redis://${auth}${c.host}:${c.port}${db}`;
}

/** 若未设置 REDIS_URL，则根据分项配置生成并写入环境变量 */
export function ensureRedisUrl(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.REDIS_URL?.trim();
  if (explicit) return explicit;
  const url = buildRedisUrl(resolveRedisConfig(env));
  env.REDIS_URL = url;
  return url;
}

export function getRedisConnectionOptions(config?: RedisConfig) {
  const c = config ?? resolveRedisConfig();
  return {
    host: c.host,
    port: c.port,
    password: c.password || undefined,
    db: c.db ?? 0,
  };
}
