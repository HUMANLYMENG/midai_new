import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { findBestCover } from '@/lib/cover';

// GET /api/covers/batch - 获取封面统计（只统计专辑，单曲从专辑同步）
export async function GET(request: NextRequest) {
  console.log('[Covers Batch] Getting cover status...');

  try {
    const userId = await requireUserId(request);
    if (userId instanceof NextResponse) {
      return userId;
    }

    console.log('[Covers Batch] Status check for user:', userId);

    const totalAlbums = await prisma.album.count({ where: { userId } });
    const albumsWithoutCover = await prisma.album.count({ where: { userId, coverUrl: null } });

    console.log(`[Covers Batch] Status: ${totalAlbums} albums (${albumsWithoutCover} without cover)`);

    return NextResponse.json({
      success: true,
      data: {
        albums: { total: totalAlbums, withoutCover: albumsWithoutCover, withCover: totalAlbums - albumsWithoutCover },
        withoutCover: albumsWithoutCover, // 只返回专辑缺失数量
      },
    });
  } catch (error) {
    console.error('[Covers Batch] Get cover status failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to get status' }, { status: 500 });
  }
}

// POST /api/covers/batch - 批量或单个获取封面
export async function POST(request: NextRequest) {
  console.log('[Covers Batch] Starting cover fetch...');

  try {
    const userId = await requireUserId(request);
    if (userId instanceof NextResponse) {
      return userId;
    }

    const body = await request.json();
    const { albumIds, trackIds, force = false } = body;

    console.log('[Covers Batch] Request params:', { albumIds: albumIds?.length || 0, trackIds: trackIds?.length || 0, force });

    const results: any[] = [];

    // 获取所有专辑用于同步单曲
    const allAlbums = await prisma.album.findMany({ where: { userId } });

    // 处理专辑
    if (albumIds && albumIds.length > 0) {
      const albums = await prisma.album.findMany({
        where: { id: { in: albumIds }, userId },
      });

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
            // 更新专辑封面
            await prisma.album.update({
              where: { id: album.id },
              data: { coverUrl: coverResult.url },
            });
            
            // 同步更新该专辑对应的所有 track 的封面
            // SQLite 不支持 mode: 'insensitive'，先查询再过滤
            const allTracks = await prisma.track.findMany({ where: { userId } });
            const matchingTracks = allTracks.filter(t => 
              t.albumName.toLowerCase() === album.title.toLowerCase() &&
              t.artist.toLowerCase() === album.artist.toLowerCase()
            );
            
            for (const track of matchingTracks) {
              await prisma.track.update({
                where: { id: track.id },
                data: { coverUrl: coverResult.url },
              });
            }
            
            results.push({
              id: album.id,
              title: album.title,
              type: 'album',
              status: 'success',
              coverUrl: coverResult.url,
              syncedTracks: matchingTracks.length,
            });
          } else {
            results.push({
              id: album.id,
              title: album.title,
              type: 'album',
              status: 'failed',
              message: 'Cover not found',
            });
          }

          // 延迟避免请求过快
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`[Covers Batch] Error processing album "${album.title}":`, error);
          results.push({
            id: album.id,
            title: album.title,
            type: 'album',
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    // 处理单曲 - 只同步专辑封面，不单独获取
    if (trackIds && trackIds.length > 0) {
      const tracks = await prisma.track.findMany({
        where: { id: { in: trackIds }, userId },
      });

      for (const track of tracks) {
        try {
          // 查找对应专辑的封面
          const album = allAlbums.find(a => 
            a.title.toLowerCase() === track.albumName.toLowerCase() &&
            a.artist.toLowerCase() === track.artist.toLowerCase()
          );

          if (album?.coverUrl) {
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
              source: 'album_sync',
            });
          } else {
            results.push({
              id: track.id,
              title: track.title,
              type: 'track',
              status: 'failed',
              message: 'No album cover found to sync',
            });
          }
        } catch (error) {
          console.error(`[Covers Batch] Error processing track "${track.title}":`, error);
          results.push({
            id: track.id,
            title: track.title,
            type: 'track',
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: results.length,
        updated: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed' || r.status === 'error').length,
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
