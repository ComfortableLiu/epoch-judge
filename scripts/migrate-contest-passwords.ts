/**
 * 一次性迁移脚本：将 Contest.accessPassword 中的明文密码批量哈希为 bcrypt。
 *
 * 通过 bcrypt 哈希前缀（$2a$ / $2b$）检测是否已哈希，已哈希的跳过。
 * 幂等：可安全重复执行。
 *
 * 用法：npx tsx scripts/migrate-contest-passwords.ts
 */

import { loadMonorepoEnv } from '@epoch-judge/shared';
loadMonorepoEnv();

import * as bcrypt from 'bcryptjs';
import { prisma } from '@epoch-judge/db';

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10);
const BCRYPT_PREFIX = /^\$2[aby]\$/;

async function main() {
  const contests = await prisma.contest.findMany({
    where: { accessPassword: { not: null } },
    select: { id: true, number: true, accessPassword: true },
  });

  console.log(`Found ${contests.length} contests with accessPassword set.`);

  let hashed = 0;
  let skipped = 0;

  for (const contest of contests) {
    const pw = contest.accessPassword!;
    if (BCRYPT_PREFIX.test(pw)) {
      skipped++;
      continue;
    }
    const hash = await bcrypt.hash(pw, BCRYPT_ROUNDS);
    await prisma.contest.update({
      where: { id: contest.id },
      data: { accessPassword: hash },
    });
    hashed++;
    console.log(`  Hashed password for contest #${contest.number} (id=${contest.id})`);
  }

  console.log(`\nDone. Hashed: ${hashed}, Already hashed: ${skipped}, Total: ${contests.length}`);
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
