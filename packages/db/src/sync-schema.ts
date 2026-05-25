import { spawnSync } from 'child_process';
import { join } from 'path';
import { loadMonorepoEnv } from '@epoch-judge/shared';
import { ensureDatabaseUrl } from './database-url';

const DB_PACKAGE_ROOT = join(__dirname, '..');

function isAutoMigrateEnabled(): boolean {
  const flag = process.env.DB_AUTO_MIGRATE;
  if (flag === 'false' || flag === '0') return false;
  return true;
}

/**
 * 启动时同步数据库结构：执行 `prisma migrate deploy`（只应用未执行的迁移）。
 * 通过 `DB_AUTO_MIGRATE=false` 关闭。
 */
export function syncDatabaseSchema(): void {
  if (!isAutoMigrateEnabled()) {
    return;
  }

  loadMonorepoEnv();
  ensureDatabaseUrl();

  const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(cmd, ['prisma', 'migrate', 'deploy'], {
    cwd: DB_PACKAGE_ROOT,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error('prisma migrate deploy failed (see output above)');
  }
}
