import { loadMonorepoEnv } from '@epoch-judge/shared';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

/**
 * 从环境变量读取数据库连接项。若已设置 `DATABASE_URL` 则优先使用该完整 URL。
 */
export function resolveDatabaseConfig(
  env: NodeJS.ProcessEnv = process.env,
): DatabaseConfig {
  loadMonorepoEnv();
  return {
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 3306),
    user: env.DB_USER ?? 'epoch',
    password: env.DB_PASSWORD ?? 'epoch_secret',
    database: env.DB_NAME ?? 'epoch_judge',
  };
}

export function buildDatabaseUrl(config?: DatabaseConfig): string {
  const c = config ?? resolveDatabaseConfig();
  const user = encodeURIComponent(c.user);
  const password = encodeURIComponent(c.password);
  return `mysql://${user}:${password}@${c.host}:${c.port}/${c.database}`;
}

/**
 * 确保 `process.env.DATABASE_URL` 已设置，供 Prisma CLI 与 PrismaClient 使用。
 */
export function ensureDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.DATABASE_URL?.trim();
  if (explicit) {
    return explicit;
  }
  const url = buildDatabaseUrl(resolveDatabaseConfig(env));
  env.DATABASE_URL = url;
  return url;
}
