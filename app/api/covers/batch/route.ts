import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId, getOrCreateDefaultUser } from '@/lib/auth';
import { findBestCover } from '@/lib/cover';

// 存储进度信息（内存中，仅用于开发测试）
const progressMap = new Map<string, {
  current: number;
  total: number;
  message: string;
  completed: boolean;
}>();

// 生成唯一进度 ID
function generateProgressId(): string {
  return `progress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// GET /api/covers/batch/progress - 获取进度（SSE）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const progressId = searchParams.get('id');

  if (!progressId) {
    // 获取统计信息
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

  // SSE 进度流
  const progress = progressMap.get(progressId);
  
  if (!progress) {
    return NextResponse.json({ success: false, error: 'Progress not found' }, { status: 404 });
  }

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      const sendProgress = () => {
        const currentProgress = progressMap.get(progressId);
        if (!currentProgress) {
          controller.close();
          return;
        }

        const data = JSON.stringify({
          current: currentProgress.current,
          total: currentProgress.total,
          message: currentProgress.message,
          completed: currentProgress.completed,
        });

        controller.enqueue(encoder.encode(`data: ${data}\n\n`));

        if (currentProgress.completed) {
          // 完成后清理
          setTimeout(() => progressMap.delete(progressId), 5000);
          controller.close();
        }
      };

      // 立即发送一次
      sendProgress();

      // 如果未完成，设置轮询
      if (!progress.completed) {
        const interval = setInterval(() => {
          const current = progressMap.get(progressId);
          if (current) {
            sendProgress();
            if (current.completed) {
              clearInterval(interval);
            }
          } else {
            clearInterval(interval);
            controller.close();
          }
        }, 100);

        // 30秒后超时
        setTimeout(() => {
          clearInterval(interval);
          controller.close();
        }, 30000);
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
}

// POST /api/covers/batch - 批量获取封面
export async function POST(request: NextRequest) {
  console.log('[Covers Batch] Starting batch cover fetch...');

  try {
    let userId = await getCurrentUserId(request);
    if (userId instanceof NextResponse) {
      console.log('[Covers Batch] Using fallback dev user');
      const defaultUser = await getOrCreateDefaultUser();
      userId = defaultUser.id;
    }

    const body = await request.json();
    const { albumIds, trackIds, force = false, type = 'all', progressId } = body;

    console.log('[Covers Batch] Request params:', { albumIds: albumIds?.length || 0, trackIds: trackIds?.length || 0, force, type, progressId });

    // 如果有 progressId，说明是后台任务，返回进度流 URL
    if (!progressId) {
      const newProgressId = generateProgressId();
      return NextResponse.json({
        success: true,
        progressId: newProgressId,
        streamUrl: `/api/covers/batch?id=${newProgressId}`,
      });
    }

    // 后台处理任务
    const processCovers = async () => {
      let itemsToProcess: any[] = [];

      // 收集专辑
      if (type === 'all' || type === 'albums') {
        let albums;
        if (albumIds && albumIds.length > 0) {
          albums = await prisma.album.findMany({
            where: { id: { in: albumIds }, userId },
          });
        } else {
          albums = await prisma.album.findMany({
            where: { userId, ...(force ? {} : { coverUrl: null }) },
          });
        }
        itemsToProcess = [...itemsToProcess, ...albums.map(a => ({ ...a, itemType: 'album' }))];
      }

      // 收集单曲
      if (type === 'all' || type === 'tracks') {
        let tracks;
        if (trackIds && trackIds.length > 0) {
          tracks = await prisma.track.findMany({
            where: { id: { in: trackIds }, userId },
          });
        } else {
          tracks = await prisma.track.findMany({
            where: { userId, ...(force ? {} : { coverUrl: null }) },
          });
        }
        itemsToProcess = [...itemsToProcess, ...tracks.map(t => ({ ...t, itemType: 'track' }))];
      }

      const total = itemsToProcess.length;
      
      // 初始化进度
      progressMap.set(progressId, {
        current: 0,
        total,
        message: force ? 'Refreshing all covers...' : 'Fetching missing covers...',
        completed: false,
      });

      let updated = 0;
      let failed = 0;

      // 逐个处理
      for (let i = 0; i < itemsToProcess.length; i++) {
        const item = itemsToProcess[i];
        
        try {
          // 更新进度
          progressMap.set(progressId, {
            current: i,
            total,
            message: `Fetching: ${item.title}`,
            completed: false,
          });

          // 如果已经有封面且不强制更新，跳过
          if (item.coverUrl && !force) {
            progressMap.set(progressId, {
              current: i + 1,
              total,
              message: `Skipped: ${item.title}`,
              completed: false,
            });
            continue;
          }

          // 获取封面
          const searchTitle = item.itemType === 'track' && item.albumName !== item.title 
            ? item.albumName 
            : item.title;
          const coverResult = await findBestCover(item.artist, searchTitle);

          if (coverResult?.url) {
            // 更新数据库
            if (item.itemType === 'album') {
              await prisma.album.update({ where: { id: item.id }, data: { coverUrl: coverResult.url } });
            } else {
              await prisma.track.update({ where: { id: item.id }, data: { coverUrl: coverResult.url } });
            }
            updated++;
          } else {
            failed++;
          }

          // 更新进度
          progressMap.set(progressId, {
            current: i + 1,
            total,
            message: `Progress: ${i + 1}/${total}`,
            completed: false,
          });

          // 添加延迟避免请求过快
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          console.error(`[Covers Batch] Error processing "${item.title}":`, error);
          failed++;
        }
      }

      // 标记完成
      progressMap.set(progressId, {
        current: total,
        total,
        message: `Completed! Updated: ${updated}, Failed: ${failed}`,
        completed: true,
      });

      console.log(`[Covers Batch] Completed: ${updated} updated, ${failed} failed`);
    };

    // 启动后台任务
    processCovers();

    return NextResponse.json({ success: true, message: 'Processing started' });

  } catch (error) {
    console.error('Batch fetch covers failed:', error);
    return NextResponse.json({ success: false, error: 'Batch fetch failed' }, { status: 500 });
  }
}
