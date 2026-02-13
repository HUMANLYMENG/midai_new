import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId, getOrCreateDefaultUser } from '@/lib/auth';
import { MusicLinkParser } from '@/lib/music-link-parser';
import { GenreService } from '@/lib/genre-service';

/**
 * POST /api/playlist/import
 * 导入 QQ音乐/网易云音乐歌单到 tracks
 * 所有流派信息都从 MusicBrainz 获取
 * 
 * Body: { 
 *   "url": "https://c6.y.qq.com/...",
 *   "limit": 50  // 可选：最多导入多少首，默认100
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 获取用户ID
    let userId = await getCurrentUserId(request);
    if (userId instanceof NextResponse) {
      const defaultUser = await getOrCreateDefaultUser();
      userId = defaultUser.id;
    }

    const body = await request.json();
    const { url, limit = 1000 } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    console.log('[Playlist Import] Starting import:', { url, limit });

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

    // 2. 初始化流派服务（必须从 MusicBrainz 获取）
    const { createGenreServiceFromEnv } = await import('@/lib/genre-service');
    const genreService = createGenreServiceFromEnv();

    // 3. 批量导入歌曲
    const results = {
      imported: 0,
      skipped: 0,
      skippedSongs: [] as Array<{ name: string; artist: string; album: string }>,
      errors: [] as string[],
      albumsCreated: 0,
    };

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      
      try {
        console.log(`[Playlist Import] Processing ${i + 1}/${songs.length}: ${song.name}`);

        // 从 MusicBrainz 获取流派（不再使用 QQ/网易云的流派信息）
        let genre = '';
        try {
          const genreResult = await genreService.getTrackGenres(
            song.name,
            song.artists[0] || '',
            'musicbrainz'
          );
          if (genreResult && genreResult.genres.length > 0) {
            // 取前3个流派，用逗号分隔
            genre = genreResult.genres.slice(0, 3).join(', ');
            console.log(`  MusicBrainz genre: ${genre}`);
          } else {
            console.log(`  No genre found from MusicBrainz`);
          }
        } catch (e) {
          console.log(`  Genre lookup failed: ${e}`);
        }

        // 检查 track 是否已存在（SQLite 不支持 mode: 'insensitive'，手动比较）
        const existingTracks = await prisma.track.findMany({
          where: { userId },
        });
        
        const existingTrack = existingTracks.find(t => 
          t.title.toLowerCase() === song.name.toLowerCase() &&
          t.artist.toLowerCase() === (song.artists[0] || '').toLowerCase() &&
          t.albumName.toLowerCase() === (song.album || '').toLowerCase()
        );

        if (existingTrack) {
          console.log(`  Skipped (already exists): ${song.name}`);
          results.skipped++;
          results.skippedSongs.push({
            name: song.name,
            artist: song.artists[0] || '',
            album: song.album || '',
          });
          continue;
        }

        // 检查专辑是否存在，不存在则创建
        let albumId: number | null = null;
        if (song.album && song.artists[0]) {
          const userAlbums = await prisma.album.findMany({
            where: { userId },
          });
          
          const existingAlbum = userAlbums.find(a => 
            a.title.toLowerCase() === (song.album || '').toLowerCase() &&
            a.artist.toLowerCase() === (song.artists[0] || '').toLowerCase()
          );

          if (existingAlbum) {
            albumId = existingAlbum.id;
          } else {
            // 创建新专辑（也使用 MusicBrainz 的流派）
            try {
              const newAlbum = await prisma.album.create({
                data: {
                  title: song.album,
                  artist: song.artists[0],
                  releaseDate: song.year ? `${song.year}-01-01` : undefined,
                  genre: genre, // 使用 MusicBrainz 流派
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

        // 创建 track
        await prisma.track.create({
          data: {
            title: song.name,
            artist: song.artists[0] || 'Unknown Artist',
            albumName: song.album || '',
            releaseDate: song.year ? `${song.year}-01-01` : undefined,
            genre: genre, // 使用 MusicBrainz 流派
            length: song.duration || '',
            userId: userId,
          },
        });

        results.imported++;
        console.log(`  Imported: ${song.name}`);

        // MusicBrainz 限速：每秒最多1个请求
        if (i < songs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1100));
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
