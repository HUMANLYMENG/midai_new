import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { getCoverWithCache } from '@/lib/cover-service';
import { findInCache } from '@/lib/album-cache';

// POST /api/covers/batch-process - 批量获取封面（带缓存）
export async function POST(request: NextRequest) {
  console.log('[Covers Batch Process] Starting batch cover fetch with cache...');

  try {
    const userId = await requireUserId(request);
    if (userId instanceof NextResponse) {
      return userId;
    }

    const body = await request.json();
    const { force = false } = body;

    console.log('[Covers Batch Process] Request params:', { force });

    const results: any[] = [];
    let updated = 0;
    let failed = 0;
    let cacheHits = 0;
    let syncedTracks = 0;

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

        // 使用带缓存的封面获取
        const coverResult = await getCoverWithCache(
          album.artist,
          album.title,
          album.releaseDate,
          force
        );

        if (coverResult?.url) {
          // 更新专辑封面
          await prisma.album.update({
            where: { id: album.id },
            data: { coverUrl: coverResult.url },
          });
          
          // 同步更新该专辑对应的所有 track 的封面
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
          
          syncedTracks += matchingTracks.length;
          
          if (coverResult.source === 'cache') cacheHits++;
          
          results.push({
            id: album.id,
            title: album.title,
            type: 'album',
            status: 'success',
            coverUrl: coverResult.url,
            source: coverResult.source,
            syncedTracks: matchingTracks.length,
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
        if (coverResult?.source !== 'cache') {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
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

    console.log(`[Covers Batch Process] Completed: ${updated} albums updated (${cacheHits} from cache), ${syncedTracks} tracks synced, ${failed} failed`);

    return NextResponse.json({
      success: true,
      data: {
        total: results.length,
        updated,
        cacheHits,
        syncedTracks,
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

// GET /api/covers/batch-process - SSE 实时进度推送（带缓存）
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  try {
    const userId = await requireUserId(request);
    if (userId instanceof NextResponse) {
      return userId;
    }

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // 只获取需要处理的专辑
    const albums = await prisma.album.findMany({
      where: { 
        userId, 
        ...(force ? {} : { coverUrl: null }) 
      },
    });

    const itemsToProcess = albums.map(album => ({
      type: 'album' as const,
      id: album.id,
      title: album.title,
      artist: album.artist,
      releaseDate: album.releaseDate,
      coverUrl: album.coverUrl,
    }));

    const total = itemsToProcess.length;

    // 创建 SSE 流
    const stream = new ReadableStream({
      async start(controller) {
        let current = 0;
        let updated = 0;
        let cacheHits = 0;
        let syncedTracks = 0;
        let failed = 0;
        const results: any[] = [];

        // 发送初始状态
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'start', 
          total,
          message: force ? 'Refreshing all covers...' : `Fetching ${total} album covers...`
        })}

`));

        // 逐个处理专辑
        for (const item of itemsToProcess) {
          current++;
          
          try {
            let result: any;

            // 跳过已有封面的（除非强制刷新）
            if (item.coverUrl && !force) {
              result = { status: 'skipped', message: 'Already has cover' };
            } else {
              const coverResult = await getCoverWithCache(
                item.artist,
                item.title,
                item.releaseDate,
                force
              );
              
              if (coverResult?.url) {
                // 更新专辑封面
                await prisma.album.update({
                  where: { id: item.id },
                  data: { coverUrl: coverResult.url },
                });
                
                // 同步更新该专辑对应的所有 track 的封面
                const allTracks = await prisma.track.findMany({ where: { userId } });
                const matchingTracks = allTracks.filter(t => 
                  t.albumName.toLowerCase() === item.title.toLowerCase() &&
                  t.artist.toLowerCase() === item.artist.toLowerCase()
                );
                
                for (const track of matchingTracks) {
                  await prisma.track.update({
                    where: { id: track.id },
                    data: { coverUrl: coverResult.url },
                  });
                }
                
                syncedTracks += matchingTracks.length;
                
                if (coverResult.source === 'cache') cacheHits++;
                
                result = { 
                  status: 'success', 
                  coverUrl: coverResult.url, 
                  source: coverResult.source,
                  syncedTracks: matchingTracks.length 
                };
                updated++;
              } else {
                result = { status: 'failed', message: 'Cover not found' };
                failed++;
              }
            }
            
            // 延迟避免请求过快（仅对 API 调用）
            if (result?.source !== 'cache' && result?.status === 'success') {
              await new Promise(resolve => setTimeout(resolve, 200));
            }

            results.push({
              id: item.id,
              title: item.title,
              type: item.type,
              ...result,
            });

            // 发送进度更新
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'progress', 
              current, 
              total,
              item: item.title,
              result
            })}

`));

          } catch (error) {
            console.error(`[SSE] Error processing "${item.title}":`, error);
            failed++;
            results.push({
              id: item.id,
              title: item.title,
              type: item.type,
              status: 'error',
              message: error instanceof Error ? error.message : 'Unknown error',
            });

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'progress', 
              current, 
              total,
              item: item.title,
              result: { status: 'error', message: 'Unknown error' }
            })}

`));
          }
        }

        // 发送完成状态
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'complete', 
          total,
          updated,
          cacheHits,
          syncedTracks,
          failed,
          results,
          message: `Completed! ${updated} albums updated (${cacheHits} from cache), ${syncedTracks} tracks synced`
        })}

`));

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[Covers Batch Process SSE] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Batch fetch failed' },
      { status: 500 }
    );
  }
}
