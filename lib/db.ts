import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 检测是否为 PostgreSQL
function isPostgres(): boolean {
  const url = process.env.DATABASE_URL || '';
  return url.startsWith('postgres') || url.startsWith('postgresql');
}

// 延迟创建 Prisma Client（避免 Edge Runtime 问题）
function createPrismaClient(): PrismaClient {
  // 在 Edge Runtime 或非 PostgreSQL 环境下使用普通客户端
  if (!isPostgres() || process.env.NEXT_RUNTIME === 'edge') {
    return new PrismaClient();
  }
  
  // 在 Node.js Runtime 且 PostgreSQL 环境下使用 adapter
  try {
    const { PrismaPg } = require('@prisma/adapter-pg');
    const adapter = new PrismaPg({ 
      connectionString: process.env.DATABASE_URL 
    });
    return new PrismaClient({ adapter });
  } catch (e) {
    // Fallback to regular client if adapter fails
    console.warn('Failed to load PrismaPg adapter, using regular client');
    return new PrismaClient();
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
