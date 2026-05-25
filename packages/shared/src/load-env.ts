import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * 从当前工作目录向上查找仓库根目录的 `.env`（monorepo 根通常有 package.json + apps/）。
 */
export function findMonorepoEnvPath(startDir = process.cwd()): string | undefined {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const envFile = join(dir, '.env');
    if (existsSync(envFile)) {
      return envFile;
    }
    const parent = join(dir, '..');
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return undefined;
}

let loaded = false;

/**
 * 加载 monorepo 根目录 `.env` 到 `process.env`（不覆盖已存在的环境变量）。
 * 应在应用入口最前面调用。
 */
export function loadMonorepoEnv(): string | undefined {
  if (loaded) {
    return findMonorepoEnvPath();
  }
  const path = findMonorepoEnvPath();
  if (path) {
    config({ path, override: false });
  }
  loaded = true;
  return path;
}
