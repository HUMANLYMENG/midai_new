// 数据迁移脚本：将现有专辑关联到默认用户
// 运行：npx ts-node scripts/migrate-to-multiuser.ts

import { prisma } from '../lib/db';

async function migrate() {
  console.log('Starting migration...');

  // 1. 检查是否已有用户
  const existingUsers = await prisma.user.count();

  if (existingUsers > 0) {
    console.log(`Found ${existingUsers} existing users.`);

    // 检查是否有未关联用户的专辑
    const orphanedAlbums = await prisma.album.count({
      where: { userId: { not: undefined } }
    });

    if (orphanedAlbums === 0) {
      console.log('All albums already have user associations.');
      console.log('Migration not needed.');
      return;
    }
  }

  // 2. 创建默认用户
  console.log('Creating default user...');
  const defaultUser = await prisma.user.create({
    data: {
      email: 'legacy@midai.app',
      name: 'Legacy User',
    }
  });

  console.log(`Created default user: ${defaultUser.id}`);

  // 3. 获取所有未关联用户的专辑
  // 注意：这里使用原始 SQL 因为 Prisma 可能还没有 userId 字段的迁移
  try {
    const result = await prisma.$executeRaw`
      UPDATE Album SET userId = ${defaultUser.id} WHERE userId IS NULL
    `;
    console.log(`Migrated ${result} albums to default user.`);
  } catch (error) {
    console.error('Migration failed:', error);
    console.log('You may need to run this manually in your database.');
  }

  console.log('Migration completed!');
}

migrate()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
