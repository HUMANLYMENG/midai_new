import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { getGenresWithCache } from '@/lib/genre-service-with-cache';

/**
 * POST /api/genres/fix
 * 批量修复缺失的流派（针对导入失败的歌曲和专辑）
 * 
 * Body: {
 *   "type": "tracks" | "albums" | "both",  // 修复对象类型，默认 both
 *   "mode": "missing" | "all",              // missing=只修复空流派, all=全部重新获取
 *   "batchSize": 10                         // 每批处理数量，默认10（避免API限制）
 * }
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     processed: number,
 *     updated: number,
 *     failed: number,
 *     details: [...]
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    if (userId instanceof NextResponse) {
      return userId;
    }

    const body = await request.json();
    const { 
      type = 'both', 
      mode = 'missing',
      batchSize = 10 
    } = body;

    console.log(`[Genre Fix] Starting fix: type=${type}, mode=${mode}, batchSize=${batchSize}`);

    const results = {
      processed: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{
        type: 'track' | 'album';
        name: string;
        artist: string;
        status: 'updated' | 'failed' | 'skipped' | 'no_genre_found';
        oldGenre?: string;
        newGenre?: string;
        error?: string;
      }>,
    };

    // 1. 获取需要修复的 Tracks
    if (type === 'tracks' || type === 'both') {
      const where: any = { userId };
      
      if (mode === 'missing') {
        where.OR = [
          { genre: null },
          { genre: '' },
          { genre: 'undefined' },
        ];
      }

      const tracks = await prisma.track.findMany({ where });
      console.log(`[Genre Fix] Found ${tracks.length} tracks to process`);

      // 分批处理，避免 API 限制
      for (let i = 0; i < tracks.length; i += batchSize) {
        const batch = tracks.slice(i, i + batchSize);
        
        for (const track of batch) {
          results.processed++;
          
          try {
            const oldGenre = track.genre || '';
            
            // 获取流派
            const genreResult = await getGenresWithCache(
              track.title,
              track.artist,
              track.albumName,
              track.releaseDate
            );

            if (genreResult.genres.length > 0) {
              const newGenre = genreResult.genres.slice(0, 3).join(', ');
              
              // 更新数据库
              await prisma.track.update({
                where: { id: track.id },
                data: { genre: newGenre },
              });

              results.updated++;
              results.details.push({
                type: 'track',
                name: track.title,
                artist: track.artist,
                status: 'updated',
                oldGenre,
                newGenre,
              });
              
              console.log(`[Genre Fix] Updated track: ${track.title} -> ${newGenre}`);
            } else {
              results.skipped++;
              results.details.push({
                type: 'track',
                name: track.title,
                artist: track.artist,
                status: 'no_genre_found',
                oldGenre,
              });
            }
          } catch (error: any) {
            results.failed++;
            results.details.push({
              type: 'track',
              name: track.title,
              artist: track.artist,
              status: 'failed',
              error: error.message,
            });
            console.error(`[Genre Fix] Failed for track ${track.title}:`, error.message);
          }
          
          // 限速：MusicBrainz 限制 1 req/sec
          if (i + batch.indexOf(track) < tracks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1200));
          }
        }
      }
    }

    // 2. 获取需要修复的 Albums
    if (type === 'albums' || type === 'both') {
      const where: any = { userId };
      
      if (mode === 'missing') {
        where.OR = [
          { genre: null },
          { genre: '' },
          { genre: 'undefined' },
        ];
      }

      const albums = await prisma.album.findMany({ where });
      console.log(`[Genre Fix] Found ${albums.length} albums to process`);

      for (let i = 0; i < albums.length; i += batchSize) {
        const batch = albums.slice(i, i + batchSize);
        
        for (const album of batch) {
          results.processed++;
          
          try {
            const oldGenre = album.genre || '';
            
            // 对于专辑，我们使用专辑名作为查询
            const genreResult = await getGenresWithCache(
              album.title,  // 使用专辑名查询
              album.artist,
              album.title,
              album.releaseDate
            );

            if (genreResult.genres.length > 0) {
              const newGenre = genreResult.genres.slice(0, 3).join(', ');
              
              // 更新数据库
              await prisma.album.update({
                where: { id: album.id },
                data: { genre: newGenre },
              });

              results.updated++;
              results.details.push({
                type: 'album',
                name: album.title,
                artist: album.artist,
                status: 'updated',
                oldGenre,
                newGenre,
              });
              
              console.log(`[Genre Fix] Updated album: ${album.title} -> ${newGenre}`);
            } else {
              results.skipped++;
              results.details.push({
                type: 'album',
                name: album.title,
                artist: album.artist,
                status: 'no_genre_found',
                oldGenre,
              });
            }
          } catch (error: any) {
            results.failed++;
            results.details.push({
              type: 'album',
              name: album.title,
              artist: album.artist,
              status: 'failed',
              error: error.message,
            });
            console.error(`[Genre Fix] Failed for album ${album.title}:`, error.message);
          }
          
          // 限速
          if (i + batch.indexOf(album) < albums.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1200));
          }
        }
      }
    }

    console.log(`[Genre Fix] Completed:`, results);

    return NextResponse.json({
      success: true,
      data: results,
    });

  } catch (error: any) {
    console.error('[Genre Fix API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/genres/fix
 * 获取需要修复的统计信息
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    if (userId instanceof NextResponse) {
      return userId;
    }

    // 统计缺失流派的 tracks
    const tracksMissingGenre = await prisma.track.count({
      where: {
        userId,
        OR: [
          { genre: null },
          { genre: '' },
          { genre: 'undefined' },
        ],
      },
    });

    const tracksTotal = await prisma.track.count({ where: { userId } });

    // 统计缺失流派的 albums
    const albumsMissingGenre = await prisma.album.count({
      where: {
        userId,
        OR: [
          { genre: null },
          { genre: '' },
          { genre: 'undefined' },
        ],
      },
    });

    const albumsTotal = await prisma.album.count({ where: { userId } });

    return NextResponse.json({
      success: true,
      data: {
        tracks: {
          missing: tracksMissingGenre,
          total: tracksTotal,
          percentage: tracksTotal > 0 ? Math.round((tracksMissingGenre / tracksTotal) * 100) : 0,
        },
        albums: {
          missing: albumsMissingGenre,
          total: albumsTotal,
          percentage: albumsTotal > 0 ? Math.round((albumsMissingGenre / albumsTotal) * 100) : 0,
        },
      },
    });

  } catch (error: any) {
    console.error('[Genre Fix API] Stats error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
