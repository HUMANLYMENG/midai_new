import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { findBestCover } from '@/lib/cover';

// POST /api/covers/batch - 批量获取专辑封面（只能处理自己的专辑）
export async function POST(request: NextRequest) {
  console.log('[Covers Batch] Starting batch cover fetch...');

  try {
    let userId = await getCurrentUserId(request);
    // Fallback for development if not authenticated
    if (userId instanceof NextResponse) {
      console.log('[Covers Batch] Using fallback test user ID');
      userId = 'cmldzuxxa0000qd3we3uq8e6r';
    }

    console.log('[Covers Batch] User ID:', userId);

    const body = await request.json();
    const { albumIds, force = false } = body;

    console.log('[Covers Batch] Request params:', { albumIds: albumIds?.length || 0, force });

    // 获取需要处理的专辑（只能处理自己的）
    let albums;
    if (albumIds && albumIds.length > 0) {
      albums = await prisma.album.findMany({
        where: {
          id: { in: albumIds },
          userId,
        },
      });
    } else {
      // 如果没有指定ID，获取当前用户所有缺少封面的专辑
      albums = await prisma.album.findMany({
        where: {
          userId,
          ...(force ? {} : { coverUrl: null }),
        },
      });
    }

    console.log(`[Covers Batch] Found ${albums.length} albums to process`);

    if (albums.length === 0) {
      return NextResponse.json({
        success: true,
        data: { total: 0, updated: 0, failed: 0, results: [] },
      });
    }

    const results = [];
    let updated = 0;
    let failed = 0;

    // 逐个处理专辑（避免并发请求过多）
    for (const album of albums) {
      try {
        console.log(`[Covers Batch] Processing: "${album.title}" by "${album.artist}"`);

        // 如果已经有封面且不强制更新，跳过
        if (album.coverUrl && !force) {
          console.log(`[Covers Batch] Skipping (already has cover): ${album.title}`);
          results.push({
            id: album.id,
            title: album.title,
            artist: album.artist,
            status: 'skipped',
            message: 'Already has cover',
          });
          continue;
        }

        // 获取封面
        const coverResult = await findBestCover(album.artist, album.title);
        console.log(`[Covers Batch] Cover result for "${album.title}":`, coverResult);

        if (coverResult?.url) {
          // 更新数据库
          await prisma.album.update({
            where: { id: album.id },
            data: { coverUrl: coverResult.url },
          });
          console.log(`[Covers Batch] Updated cover for: ${album.title}`);

          results.push({
            id: album.id,
            title: album.title,
            artist: album.artist,
            status: 'success',
            coverUrl: coverResult.url,
          });
          updated++;
        } else {
          console.log(`[Covers Batch] Cover not found for: ${album.title}`);
          results.push({
            id: album.id,
            title: album.title,
            artist: album.artist,
            status: 'failed',
            message: 'Cover not found',
          });
          failed++;
        }

        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`[Covers Batch] Error processing "${album.title}":`, error);
        results.push({
          id: album.id,
          title: album.title,
          artist: album.artist,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }

    console.log(`[Covers Batch] Completed: ${updated} updated, ${failed} failed`);

    return NextResponse.json({
      success: true,
      data: {
        total: albums.length,
        updated,
        failed,
        results,
      },
    });

  } catch (error) {
    console.error('Batch fetch covers failed:', error);
    return NextResponse.json(
      { success: false, error: 'Batch fetch failed' },
      { status: 500 }
    );
  }
}

// GET /api/covers/batch/status - 获取当前用户缺少封面的专辑统计
export async function GET(request: NextRequest) {
  console.log('[Covers Batch] Getting cover status...');

  try {
    let userId = await getCurrentUserId(request);
    // Fallback for development if not authenticated
    if (userId instanceof NextResponse) {
      console.log('[Covers Batch] Using fallback test user ID for status');
      userId = 'cmldzuxxa0000qd3we3uq8e6r';
    }

    console.log('[Covers Batch] Status check for user:', userId);

    const totalAlbums = await prisma.album.count({
      where: { userId },
    });
    const albumsWithoutCover = await prisma.album.count({
      where: { userId, coverUrl: null },
    });

    console.log(`[Covers Batch] Status: ${totalAlbums} total, ${albumsWithoutCover} without cover`);

    return NextResponse.json({
      success: true,
      data: {
        total: totalAlbums,
        withoutCover: albumsWithoutCover,
        withCover: totalAlbums - albumsWithoutCover,
      },
    });
  } catch (error) {
    console.error('[Covers Batch] Get cover status failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
