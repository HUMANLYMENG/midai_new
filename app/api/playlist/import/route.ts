import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { MusicLinkParser } from '@/lib/music-link-parser';
import { getGenresWithCache } from '@/lib/genre-service-with-cache';
import { getCoverWithCache } from '@/lib/cover-service';

/**
 * POST /api/playlist/import
 * 导入 QQ音乐/网易云音乐歌单到 tracks
 * 使用缓存优化的封面和流派获取
 * 
 * Body: { 
 *   "url": "https://c6.y.qq.com/...",
 *   "limit": 50  // 可选：最多导入多少首，默认100
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 获取用户ID
    const userId = await requireUserId(request);
    if (userId instanceof NextResponse) {
      return userId;
    }

    const body = await request.json();
    const { url, limit = 1000 } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    console.log('[Playlist Import] Starting import with cache:', { url, limit });

    // 1. 解析歌单
    const parser = new MusicLinkParser();
    const parseResult = await parser.parse(url);

    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json(
        { success: false, error: parseResult.error || 'Failed to parse playlist' },
        { status: 422 }
      );
    }

    if (parseResult.type !== 'playlist') {
      return NextResponse.json(
        { success: false, error: 'URL is not a playlist' },
        { status: 400 }
      );
    }

    const playlist = parseResult.data;
    const songs = playlist.songs?.slice(0, limit) || [];

    console.log(`[Playlist Import] Parsed ${songs.length} songs from "${playlist.name}"`);

    // 统计
    const results = {
      imported: 0,
      skipped: 0,
      skippedSongs: [] as Array<{ name: string; artist: string; album: string }>,
      errors: [] as string[],
      albumsCreated: 0,
      cacheHits: { cover: 0, genre: 0 },
    };

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      
      try {
        console.log(`[Playlist Import] Processing ${i + 1}/${songs.length}: ${song.name}`);

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
            console.log(`  Genre: ${genre} (source: ${genreResult.source})`);
            
            if (genreResult.source === 'cache') {
              results.cacheHits.genre++;
            }
          } else {
            console.log(`  No genre found`);
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
              console.log(`  Cover: ${coverResult.source}`);
              
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
          console.log(`  Skipped (already exists): ${song.name}`);
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
              console.log(`  Created album: ${newAlbum.title}`);
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
        console.log(`  Imported: ${song.name}`);

        // 如果使用的是缓存数据，可以减少延迟
        // 否则遵守 MusicBrainz 限速
        const usedCache = results.cacheHits.genre > 0 || results.cacheHits.cover > 0;
        if (i < songs.length - 1 && !usedCache) {
          await new Promise(resolve => setTimeout(resolve, 1100));
        } else if (i < songs.length - 1) {
          // 即使是缓存，也加一点小延迟避免数据库压力
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error: any) {
        const errorMsg = `Failed to import "${song.name}": ${error.message}`;
        console.error(`  ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }

    console.log('[Playlist Import] Completed:', results);

    return NextResponse.json({
      success: true,
      data: {
        playlistName: playlist.name,
        totalSongs: songs.length,
        ...results,
      },
    });

  } catch (error: any) {
    console.error('[Playlist Import API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
