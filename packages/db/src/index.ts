import { PrismaClient } from '@prisma/client';

export * from './dal';
export * from './segmentEvaluator';
export * from '@prisma/client';

let prisma: PrismaClient;

export const getPrisma = (url?: string) => {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
};

// Legacy support (will be refactored)
export const createDbClient = (url: string, key: string) => {
  // This originally returned a Supabase client. 
  // We'll keep the signature but maybe throw or return something else if needed.
  // For now, it's better to refactor consumers to use getPrisma().
  return null as any; 
};
