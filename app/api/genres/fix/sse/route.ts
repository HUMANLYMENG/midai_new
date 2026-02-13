import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { getGenresWithCache } from '@/lib/genre-service-with-cache';

/**
 * GET /api/genres/fix/sse?type=both&mode=missing
 * SSE 版本的批量修复流派，支持实时进度推送
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    if (userId instanceof Response) {
      return userId;
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'both';
    const mode = searchParams.get('mode') || 'missing';

    console.log(`[Genre Fix SSE] Starting: type=${type}, mode=${mode}`);

    // 创建 SSE 流
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // 发送初始消息
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', message: 'Analyzing missing genres...' })}\n\n`));

        try {
          const itemsToFix: Array<{
            id: number;
            type: 'track' | 'album';
            name: string;
            artist: string;
            albumName?: string;
            releaseDate?: string | null;
          }> = [];

          // 1. 收集需要修复的 Tracks
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
            
            tracks.forEach(track => {
              itemsToFix.push({
                id: track.id,
                type: 'track',
                name: track.title,
                artist: track.artist,
                albumName: track.albumName,
                releaseDate: track.releaseDate,
              });
            });
          }

          // 2. 收集需要修复的 Albums
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
            
            albums.forEach(album => {
              itemsToFix.push({
                id: album.id,
                type: 'album',
                name: album.title,
                artist: album.artist,
                albumName: album.title,
                releaseDate: album.releaseDate,
              });
            });
          }

          const totalItems = itemsToFix.length;

          // 发送总数
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'total',
            total: totalItems,
            tracks: itemsToFix.filter(i => i.type === 'track').length,
            albums: itemsToFix.filter(i => i.type === 'album').length,
          })}\n\n`));

          if (totalItems === 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'complete',
              success: true,
              data: {
                processed: 0,
                updated: 0,
                failed: 0,
                skipped: 0,
              },
            })}\n\n`));
            controller.close();
            return;
          }

          console.log(`[Genre Fix SSE] Found ${totalItems} items to fix`);

          // 3. 逐个处理，实时发送进度
          const results = {
            processed: 0,
            updated: 0,
            failed: 0,
            skipped: 0,
          };

          // 使用批量大小控制并发
          const BATCH_SIZE = 5;
          
          for (let i = 0; i < itemsToFix.length; i += BATCH_SIZE) {
            const batch = itemsToFix.slice(i, i + BATCH_SIZE);
            
            // 并发处理这一批
            await Promise.all(
              batch.map(async (item) => {
                try {
                  console.log(`[Genre Fix SSE] Processing: ${item.name} - ${item.artist}`);
                  
                  // 获取流派
                  const genreResult = await getGenresWithCache(
                    item.name,
                    item.artist,
                    item.albumName,
                    item.releaseDate
                  );

                  if (genreResult.genres.length > 0) {
                    const newGenre = genreResult.genres.slice(0, 3).join(', ');
                    
                    // 更新数据库
                    if (item.type === 'track') {
                      await prisma.track.update({
                        where: { id: item.id },
                        data: { genre: newGenre },
                      });
                    } else {
                      await prisma.album.update({
                        where: { id: item.id },
                        data: { genre: newGenre },
                      });
                    }
                    
                    results.updated++;
                    console.log(`[Genre Fix SSE] ✅ Updated: ${item.name} -> ${newGenre}`);
                  } else {
                    results.skipped++;
                    console.log(`[Genre Fix SSE] ⚠️ No genre found: ${item.name}`);
                  }
                } catch (error) {
                  results.failed++;
                  console.error(`[Genre Fix SSE] ❌ Failed: ${item.name}`, error);
                }
                
                results.processed++;
              })
            );

            // 发送进度更新（每批完成后）
            const currentItem = batch[batch.length - 1];
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              current: results.processed,
              total: totalItems,
              item: currentItem?.name || '',
            })}\n\n`));

            // 小延迟避免数据库压力过大
            if (i + BATCH_SIZE < itemsToFix.length) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

          console.log(`[Genre Fix SSE] Completed:`, results);

          // 发送完成消息
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            success: true,
            data: results,
          })}\n\n`));

        } catch (error: any) {
          console.error('[Genre Fix SSE] Error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: error.message || 'Internal server error',
          })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('[Genre Fix SSE] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
