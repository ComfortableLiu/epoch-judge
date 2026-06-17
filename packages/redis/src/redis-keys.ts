import { resolveRedisConfig } from './redis-config';

/** 当前 Redis key 全局前缀（不含尾部冒号） */
export function getRedisKeyPrefix(env: NodeJS.ProcessEnv = process.env): string {
  return resolveRedisConfig(env).keyPrefix;
}

/**
 * 生成带服务前缀的 Redis key，例如 prefix=`epoch-judge` → `epoch-judge:judge:tasks`
 */
export function redisKey(...parts: string[]): string {
  const prefix = getRedisKeyPrefix();
  const body = parts
    .map((p) => p.replace(/^:+|:+$/g, ''))
    .filter(Boolean)
    .join(':');
  return body ? `${prefix}:${body}` : prefix;
}

/** BullMQ 队列名（不可包含 `:`，与 prefix 组合成 Redis 中的完整 key） */
export const BULLMQ_JUDGE_QUEUE_NAME = 'judge-tasks';

/** 业务 key 定义 */
export const RedisKeys = {
  /** BullMQ 队列名（传给 `new Queue(name)`） */
  judgeQueueName: () => BULLMQ_JUDGE_QUEUE_NAME,
  /** BullMQ Redis key 前缀（`REDIS_KEY_PREFIX`） */
  judgeQueuePrefix: () => getRedisKeyPrefix(),
  /** 判题状态 pub/sub 频道 */
  judgeEvents: () => redisKey('judge', 'events'),
  /** 全局在途判题计数 */
  judgeInflight: () => redisKey('judge', 'inflight'),
  /** SSE 用户连接数（Sorted Set，score=时间戳，member=instanceId:connectionId） */
  sseConnections: (userId: string) => redisKey('sse', 'conns', userId),
  /** SSE 连接 eviction Pub/Sub 频道 */
  sseEvict: () => redisKey('sse', 'evict'),
  /** 用户推荐结果缓存 */
  recommendations: (userId: string) => redisKey('recommendations', userId),
} as const;

/** BullMQ Queue / Worker 共用选项 */
export function getBullMqQueueOptions() {
  return {
    prefix: RedisKeys.judgeQueuePrefix(),
  };
}
