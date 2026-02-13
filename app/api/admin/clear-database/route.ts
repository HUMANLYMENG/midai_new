import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * POST /api/admin/clear-database
 * 清空所有数据（保留表结构）
 * 
 * ⚠️ 警告：这将删除所有数据！
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🗑️  开始清空数据库...\n');

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

    return NextResponse.json({
      success: true,
      message: 'Database cleared successfully',
      details: {
        tracks: tracksResult.count,
        albums: albumsResult.count,
        sessions: sessionsResult.count,
        accounts: accountsResult.count,
        verificationTokens: tokensResult.count,
        users: usersResult.count,
      }
    });

  } catch (error: any) {
    console.error('❌ 清空数据库失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
