import { PrismaClient } from '@prisma/client';

export * from './dal';
export * from './segmentEvaluator';
export * from '@prisma/client';

/**
 * Singleton instance of PrismaClient to prevent multiple connections in serverless environments.
 */
let prisma: PrismaClient;

/**
 * Returns the PrismaClient singleton.
 */
export const getPrisma = () => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prisma;
};
