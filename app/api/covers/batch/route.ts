import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId, getOrCreateDefaultUser } from '@/lib/auth';
import { findBestCover } from '@/lib/cover';

// GET /api/covers/batch - 获取封面统计
export async function GET(request: NextRequest) {
  console.log('[Covers Batch] Getting cover status...');

  try {
    let userId = await getCurrentUserId(request);
    if (userId instanceof NextResponse) {
      console.log('[Covers Batch] Using fallback dev user for status');
      const defaultUser = await getOrCreateDefaultUser();
      userId = defaultUser.id;
    }

    console.log('[Covers Batch] Status check for user:', userId);

    const totalAlbums = await prisma.album.count({ where: { userId } });
    const albumsWithoutCover = await prisma.album.count({ where: { userId, coverUrl: null } });

    const totalTracks = await prisma.track.count({ where: { userId } });
    const tracksWithoutCover = await prisma.track.count({ where: { userId, coverUrl: null } });

    const totalWithoutCover = albumsWithoutCover + tracksWithoutCover;

    console.log(`[Covers Batch] Status: ${totalAlbums} albums (${albumsWithoutCover} without cover), ${totalTracks} tracks (${tracksWithoutCover} without cover)`);

    return NextResponse.json({
      success: true,
      data: {
        albums: { total: totalAlbums, withoutCover: albumsWithoutCover, withCover: totalAlbums - albumsWithoutCover },
        tracks: { total: totalTracks, withoutCover: tracksWithoutCover, withCover: totalTracks - tracksWithoutCover },
        total: totalAlbums + totalTracks,
        withoutCover: totalWithoutCover,
        withCover: (totalAlbums + totalTracks) - totalWithoutCover,
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
    let userId = await getCurrentUserId(request);
    if (userId instanceof NextResponse) {
      console.log('[Covers Batch] Using fallback dev user');
      const defaultUser = await getOrCreateDefaultUser();
      userId = defaultUser.id;
    }

    const body = await request.json();
    const { albumIds, trackIds, force = false } = body;

    console.log('[Covers Batch] Request params:', { albumIds: albumIds?.length || 0, trackIds: trackIds?.length || 0, force });

    const results: any[] = [];

    // 处理专辑
    if (albumIds && albumIds.length > 0) {
      const albums = await prisma.album.findMany({
        where: { id: { in: albumIds }, userId },
      });

      for (const album of albums) {
        try {
          const coverResult = await findBestCover(album.artist, album.title);

          if (coverResult?.url) {
            // 更新专辑封面
            await prisma.album.update({
              where: { id: album.id },
              data: { coverUrl: coverResult.url },
            });
            
            // 同时更新该专辑对应的所有 track 的封面
            // SQLite 不支持 mode: 'insensitive'，先查询再更新
            const tracksToUpdate = await prisma.track.findMany({
              where: {
                userId,
              },
            });
            
            const matchingTracks = tracksToUpdate.filter(t => 
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

    // 处理单曲
    if (trackIds && trackIds.length > 0) {
      const tracks = await prisma.track.findMany({
        where: { id: { in: trackIds }, userId },
      });

      for (const track of tracks) {
        try {
          // 使用专辑名搜索封面
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
          } else {
            results.push({
              id: track.id,
              title: track.title,
              type: 'track',
              status: 'failed',
              message: 'Cover not found',
            });
          }

          await new Promise(resolve => setTimeout(resolve, 200));
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
