import { PrismaClient } from '@prisma/client';
import { ensureDatabaseUrl } from './database-url';

ensureDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from '@prisma/client';
export {
  buildDatabaseUrl,
  ensureDatabaseUrl,
  resolveDatabaseConfig,
  type DatabaseConfig,
} from './database-url';
export { syncDatabaseSchema } from './sync-schema';
export { prisma as db };
