import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 创建 Prisma Client
// 如果是 PostgreSQL，使用 adapter；如果是 SQLite，使用普通客户端
function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL || '';
  
  // 检测是否为 PostgreSQL
  if (databaseUrl.startsWith('postgres') || databaseUrl.startsWith('postgresql')) {
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    return new PrismaClient({ adapter });
  }
  
  // SQLite 或其他数据库使用普通客户端
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
