import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { MusicLinkParser } from '@/lib/music-link-parser';
import { getGenresWithCache } from '@/lib/genre-service-with-cache';
import { getCoverWithCache } from '@/lib/cover-service';

/**
 * GET /api/playlist/import/sse?url=xxx&limit=100
 * SSE 版本的歌单导入，支持实时进度推送
 */
export async function GET(request: NextRequest) {
  try {
    // 获取用户ID
    const userId = await requireUserId(request);
    if (userId instanceof Response) {
      return userId;
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const limit = parseInt(searchParams.get('limit') || '1000', 10);

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing url parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 创建 SSE 流
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // 发送初始消息
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', message: 'Parsing playlist...' })}\n\n`));

        try {
          // 1. 解析歌单
          const parser = new MusicLinkParser();
          const parseResult = await parser.parse(url);

          if (!parseResult.success || !parseResult.data) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              error: parseResult.error || 'Failed to parse playlist' 
            })}\n\n`));
            controller.close();
            return;
          }

          if (parseResult.type !== 'playlist') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              error: 'URL is not a playlist' 
            })}\n\n`));
            controller.close();
            return;
          }

          const playlist = parseResult.data;
          const songs = playlist.songs?.slice(0, limit) || [];

          // 发送歌单信息
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'playlist',
            playlistName: playlist.name,
            total: songs.length,
          })}\n\n`));

          // 统计
          const results = {
            imported: 0,
            skipped: 0,
            skippedSongs: [] as Array<{ name: string; artist: string; album: string }>,
            errors: [] as string[],
            albumsCreated: 0,
            cacheHits: { cover: 0, genre: 0 },
          };

          // 2. 处理每首歌
          for (let i = 0; i < songs.length; i++) {
            const song = songs[i];
            
            // 发送进度更新
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              current: i + 1,
              total: songs.length,
              song: song.name,
              artist: song.artists[0],
            })}\n\n`));

            try {
              const artist = song.artists[0] || 'Unknown Artist';
              const albumName = song.album || '';
              const year = song.year ? `${song.year}` : undefined;

              // 1. 从缓存/API 获取流派
              let genre = '';
              try {
                const genreResult = await getGenresWithCache(
                  song.name,
                  artist,
                  albumName,
                  year
                );
                
                if (genreResult.genres.length > 0) {
                  genre = genreResult.genres.slice(0, 3).join(', ');
                  if (genreResult.source === 'cache') {
                    results.cacheHits.genre++;
                  }
                }
              } catch (e) {
                console.log(`  Genre lookup failed: ${e}`);
              }

              // 2. 从缓存/API 获取封面
              let coverUrl: string | null = null;
              try {
                if (albumName) {
                  const coverResult = await getCoverWithCache(artist, albumName, year);
                  if (coverResult) {
                    coverUrl = coverResult.url;
                    if (coverResult.source === 'cache') {
                      results.cacheHits.cover++;
                    }
                  }
                }
              } catch (e) {
                console.log(`  Cover lookup failed: ${e}`);
              }

              // 3. 检查 track 是否已存在
              const existingTracks = await prisma.track.findMany({
                where: { userId },
              });
              
              const existingTrack = existingTracks.find(t => 
                t.title.toLowerCase() === song.name.toLowerCase() &&
                t.artist.toLowerCase() === artist.toLowerCase() &&
                t.albumName.toLowerCase() === albumName.toLowerCase()
              );

              if (existingTrack) {
                results.skipped++;
                results.skippedSongs.push({
                  name: song.name,
                  artist: artist,
                  album: albumName,
                });
                continue;
              }

              // 4. 检查专辑是否存在，不存在则创建
              let albumId: number | null = null;
              if (albumName && artist) {
                const userAlbums = await prisma.album.findMany({
                  where: { userId },
                });
                
                const existingAlbum = userAlbums.find(a => 
                  a.title.toLowerCase() === albumName.toLowerCase() &&
                  a.artist.toLowerCase() === artist.toLowerCase()
                );

                if (existingAlbum) {
                  albumId = existingAlbum.id;
                  // 如果专辑没有封面，更新封面
                  if (!existingAlbum.coverUrl && coverUrl) {
                    await prisma.album.update({
                      where: { id: existingAlbum.id },
                      data: { coverUrl },
                    });
                  }
                  // 如果专辑没有流派，更新流派
                  if (!existingAlbum.genre && genre) {
                    await prisma.album.update({
                      where: { id: existingAlbum.id },
                      data: { genre },
                    });
                  }
                } else {
                  // 创建新专辑
                  try {
                    const newAlbum = await prisma.album.create({
                      data: {
                        title: albumName,
                        artist: artist,
                        releaseDate: song.year ? `${song.year}-01-01` : undefined,
                        genre: genre,
                        coverUrl: coverUrl,
                        userId: userId,
                      },
                    });
                    albumId = newAlbum.id;
                    results.albumsCreated++;
                  } catch (e) {
                    console.error(`  Failed to create album:`, e);
                  }
                }
              }

              // 5. 创建 track
              await prisma.track.create({
                data: {
                  title: song.name,
                  artist: artist,
                  albumName: albumName,
                  releaseDate: song.year ? `${song.year}-01-01` : undefined,
                  genre: genre,
                  length: song.duration || '',
                  coverUrl: coverUrl,
                  userId: userId,
                },
              });

              results.imported++;

              // 限速：MusicBrainz 限制 1 req/sec
              if (i < songs.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1200));
              }

            } catch (error: any) {
              const errorMsg = `Failed to import "${song.name}": ${error.message}`;
              results.errors.push(errorMsg);
            }
          }

          // 发送完成消息
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            success: true,
            data: {
              playlistName: playlist.name,
              totalSongs: songs.length,
              ...results,
            },
          })}\n\n`));

        } catch (error: any) {
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
    console.error('[Playlist Import SSE] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
