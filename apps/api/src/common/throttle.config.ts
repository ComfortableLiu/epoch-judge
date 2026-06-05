import type { ConfigService } from '@nestjs/config';

/** 默认限流窗口（秒） */
export const THROTTLE_TTL_DEFAULT = 60;
/** 默认全局每窗口请求数 */
export const THROTTLE_LIMIT_DEFAULT = 60;
/** 认证端点每窗口请求数 */
export const THROTTLE_AUTH_LIMIT_DEFAULT = 5;
/** 提交端点每窗口请求数 */
export const THROTTLE_SUBMISSION_LIMIT_DEFAULT = 10;

/**
 * 从 ConfigService 读取限流相关环境变量，供 ThrottlerModule.forRootAsync 使用。
 */
export function createThrottleConfig(config: ConfigService) {
  const enabled = config.get<string>('THROTTLE_ENABLED', 'true') !== 'false';
  const ttl = Number(config.get<string>('THROTTLE_TTL', String(THROTTLE_TTL_DEFAULT))) * 1000;
  const limit = Number(config.get<string>('THROTTLE_LIMIT', String(THROTTLE_LIMIT_DEFAULT)));

  return {
    throttlers: [{ name: 'default', ttl, limit }],
    skipIf: () => !enabled,
  };
}

/**
 * 从 process.env 读取认证端点限流配置。
 * 使用 @nestjs/throttler v6 的 Resolvable<number> 特性：
 * limit/ttl 可以是 async 函数，在每个请求时调用，从而读取运行时环境变量。
 * process.env 在 main.ts 的 loadMonorepoEnv() 之后已就绪。
 */
export const AUTH_THROTTLE = {
  default: {
    ttl: async () =>
      Number(process.env.THROTTLE_TTL ?? THROTTLE_TTL_DEFAULT) * 1000,
    limit: async () =>
      Number(process.env.THROTTLE_AUTH_LIMIT ?? THROTTLE_AUTH_LIMIT_DEFAULT),
  },
};

/**
 * 从 process.env 读取提交端点限流配置。
 */
export const SUBMISSION_THROTTLE = {
  default: {
    ttl: async () =>
      Number(process.env.THROTTLE_TTL ?? THROTTLE_TTL_DEFAULT) * 1000,
    limit: async () =>
      Number(
        process.env.THROTTLE_SUBMISSION_LIMIT ??
          THROTTLE_SUBMISSION_LIMIT_DEFAULT,
      ),
  },
};
