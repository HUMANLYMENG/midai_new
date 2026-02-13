import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { getCacheStats, cleanupCache, searchCache } from '@/lib/album-cache';

/**
 * GET /api/cache
 * 获取缓存统计信息
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    if (userId instanceof NextResponse) {
      return userId;
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // 搜索缓存
    if (action === 'search') {
      const query = searchParams.get('q');
      const limit = parseInt(searchParams.get('limit') || '10');
      
      if (!query) {
        return NextResponse.json(
          { success: false, error: 'Missing query parameter' },
          { status: 400 }
        );
      }

      const results = await searchCache(query, limit);
      return NextResponse.json({
        success: true,
        data: results,
      });
    }

    // 获取统计信息
    const stats = await getCacheStats();
    return NextResponse.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    console.error('[Cache API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cache
 * 清理缓存
 * 
 * Body: { 
 *   "action": "cleanup",
 *   "daysOld": 90  // 删除超过多少天未使用的缓存
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    if (userId instanceof NextResponse) {
      return userId;
    }

    const body = await request.json();
    const { action, daysOld = 90 } = body;

    if (action === 'cleanup') {
      const deletedCount = await cleanupCache(daysOld);
      return NextResponse.json({
        success: true,
        data: {
          deletedCount,
          message: `Cleaned up ${deletedCount} cache entries older than ${daysOld} days`,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[Cache API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cleanup cache' },
      { status: 500 }
    );
  }
}
