/**
 * Startup credential check — detects default/weak credentials
 * and warns or blocks startup accordingly.
 */

interface CredentialRule {
  envVar: string;
  defaultValue: string;
  description: string;
}

const DEFAULT_CREDENTIALS: CredentialRule[] = [
  {
    envVar: 'JWT_SECRET',
    defaultValue: 'change-me-in-production',
    description: 'JWT 签名密钥（用于伪造 Token）',
  },
  {
    envVar: 'DB_PASSWORD',
    defaultValue: 'epoch_secret',
    description: '数据库密码',
  },
  {
    envVar: 'REDIS_PASSWORD',
    defaultValue: 'epoch_redis_secret',
    description: 'Redis 密码',
  },
  {
    envVar: 'SEED_ADMIN_PASSWORD',
    defaultValue: 'admin123',
    description: '管理员初始密码',
  },
];

const isTty = process.stdout.isTTY;

const RED = isTty ? '\x1b[31m' : '';
const YELLOW = isTty ? '\x1b[33m' : '';
const BOLD = isTty ? '\x1b[1m' : '';
const RESET = isTty ? '\x1b[0m' : '';

/**
 * Check whether critical environment variables are still set to known defaults.
 * - Default mode: print warnings and continue.
 * - Enforce mode (ENFORCE_SECURE_CREDENTIALS=true): print errors and exit(1).
 */
export function checkDefaultCredentials(): void {
  const violations: string[] = [];

  for (const rule of DEFAULT_CREDENTIALS) {
    const actual = process.env[rule.envVar];
    if (!actual || actual === rule.defaultValue) {
      violations.push(
        `  ${YELLOW}⚠${RESET} ${BOLD}${rule.envVar}${RESET} = "${actual ?? '(not set)'}" （默认值：${rule.description}）`,
      );
    }
  }

  if (violations.length === 0) return;

  const enforce = process.env.ENFORCE_SECURE_CREDENTIALS === 'true';

  const header = enforce
    ? `${RED}${BOLD}✖ 安全检查失败：以下环境变量仍为默认值，拒绝启动${RESET}`
    : `${YELLOW}${BOLD}⚠ 安全警告：以下环境变量仍为默认值，生产环境请务必修改${RESET}`;

  console.log('');
  console.log(header);
  console.log(violations.join('\n'));
  console.log('');

  if (enforce) {
    console.log(`${RED}设置 ENFORCE_SECURE_CREDENTIALS=false 可跳过此检查（不推荐）。${RESET}`);
    process.exit(1);
  }
}
