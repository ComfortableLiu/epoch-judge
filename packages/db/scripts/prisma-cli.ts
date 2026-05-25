import { spawnSync } from 'child_process';
import { ensureDatabaseUrl } from '../src/database-url';

ensureDatabaseUrl();

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: tsx scripts/prisma-cli.ts <prisma-command> [args...]');
  process.exit(1);
}

const result = spawnSync('prisma', args, {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
