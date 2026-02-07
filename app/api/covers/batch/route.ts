import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { findBestCover } from '@/lib/cover';

// POST /api/covers/batch - 批量获取专辑封面
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { albumIds, force = false } = body;

    // 获取需要处理的专辑
    let albums;
    if (albumIds && albumIds.length > 0) {
      albums = await prisma.album.findMany({
        where: { id: { in: albumIds } },
      });
    } else {
      // 如果没有指定ID，获取所有缺少封面的专辑
      albums = await prisma.album.findMany({
        where: force ? undefined : { coverUrl: null },
      });
    }

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
        // 如果已经有封面且不强制更新，跳过
        if (album.coverUrl && !force) {
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

        if (coverResult?.url) {
          // 更新数据库
          await prisma.album.update({
            where: { id: album.id },
            data: { coverUrl: coverResult.url },
          });

          results.push({
            id: album.id,
            title: album.title,
            artist: album.artist,
            status: 'success',
            coverUrl: coverResult.url,
          });
          updated++;
        } else {
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

// GET /api/covers/batch/status - 获取缺少封面的专辑统计
export async function GET() {
  try {
    const totalAlbums = await prisma.album.count();
    const albumsWithoutCover = await prisma.album.count({
      where: { coverUrl: null },
    });

    return NextResponse.json({
      success: true,
      data: {
        total: totalAlbums,
        withoutCover: albumsWithoutCover,
        withCover: totalAlbums - albumsWithoutCover,
      },
    });
  } catch (error) {
    console.error('Get cover status failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
