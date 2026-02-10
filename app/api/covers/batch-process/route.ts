import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId, getOrCreateDefaultUser } from '@/lib/auth';
import { findBestCover } from '@/lib/cover';

// POST /api/covers/batch-process - 批量获取封面（用于 Get X Covers 按钮）
export async function POST(request: NextRequest) {
  console.log('[Covers Batch Process] Starting batch cover fetch...');

  try {
    let userId = await getCurrentUserId(request);
    if (userId instanceof NextResponse) {
      console.log('[Covers Batch Process] Using fallback dev user');
      const defaultUser = await getOrCreateDefaultUser();
      userId = defaultUser.id;
    }

    const body = await request.json();
    const { force = false } = body;

    console.log('[Covers Batch Process] Request params:', { force });

    const results: any[] = [];
    let updated = 0;
    let failed = 0;

    // 获取需要处理的专辑
    const albums = await prisma.album.findMany({
      where: { 
        userId, 
        ...(force ? {} : { coverUrl: null }) 
      },
    });

    console.log(`[Covers Batch Process] Processing ${albums.length} albums`);

    // 逐个处理专辑
    for (const album of albums) {
      try {
        // 跳过已有封面的（除非强制刷新）
        if (album.coverUrl && !force) {
          results.push({
            id: album.id,
            title: album.title,
            type: 'album',
            status: 'skipped',
            message: 'Already has cover',
          });
          continue;
        }

        const coverResult = await findBestCover(album.artist, album.title);

        if (coverResult?.url) {
          await prisma.album.update({
            where: { id: album.id },
            data: { coverUrl: coverResult.url },
          });
          results.push({
            id: album.id,
            title: album.title,
            type: 'album',
            status: 'success',
            coverUrl: coverResult.url,
          });
          updated++;
        } else {
          results.push({
            id: album.id,
            title: album.title,
            type: 'album',
            status: 'failed',
            message: 'Cover not found',
          });
          failed++;
        }

        // 延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`[Covers Batch Process] Error processing album "${album.title}":`, error);
        results.push({
          id: album.id,
          title: album.title,
          type: 'album',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }

    // 处理 tracks - 使用对应 album 的封面
    const tracks = await prisma.track.findMany({
      where: { 
        userId, 
        coverUrl: null // 只处理没有封面的 tracks
      },
    });

    console.log(`[Covers Batch Process] Processing ${tracks.length} tracks without covers`);

    // 获取所有专辑用于匹配
    const allAlbums = await prisma.album.findMany({ where: { userId } });

    for (const track of tracks) {
      try {
        // 查找对应专辑的封面（大小写不敏感）
        const album = allAlbums.find(a => 
          a.title.toLowerCase() === track.albumName.toLowerCase() &&
          a.artist.toLowerCase() === track.artist.toLowerCase()
        );

        if (album?.coverUrl) {
          // 使用专辑的封面
          await prisma.track.update({
            where: { id: track.id },
            data: { coverUrl: album.coverUrl },
          });
          results.push({
            id: track.id,
            title: track.title,
            type: 'track',
            status: 'success',
            coverUrl: album.coverUrl,
          });
          updated++;
        } else {
          // 尝试获取封面
          const searchTitle = track.albumName !== track.title ? track.albumName : track.title;
          const coverResult = await findBestCover(track.artist, searchTitle);

          if (coverResult?.url) {
            await prisma.track.update({
              where: { id: track.id },
              data: { coverUrl: coverResult.url },
            });
            results.push({
              id: track.id,
              title: track.title,
              type: 'track',
              status: 'success',
              coverUrl: coverResult.url,
            });
            updated++;
          } else {
            results.push({
              id: track.id,
              title: track.title,
              type: 'track',
              status: 'failed',
              message: 'Cover not found',
            });
            failed++;
          }
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[Covers Batch Process] Error processing track "${track.title}":`, error);
        results.push({
          id: track.id,
          title: track.title,
          type: 'track',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }

    console.log(`[Covers Batch Process] Completed: ${updated} updated, ${failed} failed`);

    return NextResponse.json({
      success: true,
      data: {
        total: results.length,
        updated,
        failed,
        results,
      },
    });

  } catch (error) {
    console.error('[Covers Batch Process] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Batch fetch failed' },
      { status: 500 }
    );
  }
}
