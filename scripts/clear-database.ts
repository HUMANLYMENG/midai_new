/**
 * 清空数据库所有数据（保留表结构）
 * 
 * 使用方法: npx ts-node scripts/clear-database.ts
 */

import { prisma } from '../lib/db';

async function clearDatabase() {
  console.log('🗑️  开始清空数据库...\n');

  try {
    // 按依赖关系顺序删除（先删子表，再删父表）
    
    // 1. 删除 Tracks（单曲）
    const tracksResult = await prisma.track.deleteMany();
    console.log(`✅ 已删除 ${tracksResult.count} 首单曲`);

    // 2. 删除 Albums（专辑）
    const albumsResult = await prisma.album.deleteMany();
    console.log(`✅ 已删除 ${albumsResult.count} 张专辑`);

    // 3. 删除 Sessions（会话）
    const sessionsResult = await prisma.session.deleteMany();
    console.log(`✅ 已删除 ${sessionsResult.count} 个会话`);

    // 4. 删除 Accounts（账户）
    const accountsResult = await prisma.account.deleteMany();
    console.log(`✅ 已删除 ${accountsResult.count} 个账户`);

    // 5. 删除 VerificationTokens（验证令牌）
    const tokensResult = await prisma.verificationToken.deleteMany();
    console.log(`✅ 已删除 ${tokensResult.count} 个验证令牌`);

    // 6. 删除 Users（用户）- 最后删除，因为其他表依赖它
    const usersResult = await prisma.user.deleteMany();
    console.log(`✅ 已删除 ${usersResult.count} 个用户`);

    console.log('\n🎉 数据库清空完成！');
    console.log('表结构保留，所有数据已删除。');

  } catch (error) {
    console.error('❌ 清空数据库失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase();
