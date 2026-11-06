import { PrismaClient } from '@prisma/client';
import { logger } from '../core/logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'test' ? [] : ['error']
});

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // Light-weight connectivity query
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.warn({ error }, 'Database health check failed');
    return false;
  }
}
