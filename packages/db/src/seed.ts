import * as bcrypt from 'bcryptjs';
import { ensureDatabaseUrl } from './database-url';
import { prisma, Role } from './index';

ensureDatabaseUrl();

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME ?? 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@epoch.local';

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { username },
    create: {
      username,
      email,
      passwordHash,
      displayName: 'Administrator',
      role: Role.ADMIN,
    },
    update: {
      passwordHash,
      role: Role.ADMIN,
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'judge.global_max_inflight' },
    create: { key: 'judge.global_max_inflight', value: '10' },
    update: {},
  });

  await prisma.problem.upsert({
    where: { slug: 'a-plus-b' },
    create: {
      slug: 'a-plus-b',
      title: 'A+B Problem',
      statement:
        'Given two integers A and B, output their sum.\n\n## Input\nTwo integers.\n\n## Output\nOne integer.',
      difficulty: 1,
      visibility: 'PUBLIC',
      defaultJudgeMode: 'ACM',
      timeLimitMs: 1000,
      memoryLimitKb: 262144,
    },
    update: {},
  });

  console.log(`Seeded admin user: ${username}`);
  console.log('Seeded sample problem: a-plus-b');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
