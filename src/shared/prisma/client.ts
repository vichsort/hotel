import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { env } from '@/config/env.js';
import { softDeleteExtension } from '@/shared/prisma/softDelete.extension.js';

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const basePrisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export const prisma = basePrisma.$extends(softDeleteExtension);

export type ExtendedPrismaClient = typeof prisma;
export { basePrisma };
