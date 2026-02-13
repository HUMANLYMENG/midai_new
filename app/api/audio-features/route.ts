import { NextRequest, NextResponse } from 'next/server';
import { MusicAudioFeaturesClient, SongAudioFeatures } from '@/lib/acousticbrainz';

// 初始化客户端
const client = new MusicAudioFeaturesClient(
  process.env.MUSICBRAINZ_APP_NAME,
  process.env.MUSICBRAINZ_APP_VERSION,
  process.env.MUSICBRAINZ_CONTACT
);

/**
 * GET /api/audio-features
 * 获取歌曲的 Tempo (BPM) 和 Key (调性)
 * 使用 AcousticBrainz API（免费，无需 API Key）
 * 
 * Query Parameters:
 * - song: 歌曲名称
 * - artist: 艺人名称（可选）
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "mbid": "xxx",
 *     "title": "Shape of You",
 *     "artist": "Ed Sheeran",
 *     "bpm": 96,
 *     "key": "F# minor",
 *     "scale": "minor",
 *     "duration": 277.18
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const song = searchParams.get('song');
    const artist = searchParams.get('artist');

    if (!song) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: song' },
        { status: 400 }
      );
    }

    const info = await client.getTempoAndKey(song, artist || undefined);

    if (!info) {
      return NextResponse.json(
        { success: false, error: 'Audio features not found for this song' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: info,
    });

  } catch (error) {
    console.error('[Audio Features API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/audio-features
 * 批量获取歌曲的 Tempo 和 Key
 * 
 * Body:
 * {
 *   "songs": [
 *     { "name": "Song 1", "artist": "Artist 1" },
 *     { "name": "Song 2" }
 *   ]
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     { "mbid": "xxx", "title": "...", "bpm": 96, "key": "F# minor", ... },
 *     null // 未找到的歌曲返回 null
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { songs, song, artist } = body;

    // 单首歌曲查询
    if (song) {
      const result = await client.getTempoAndKey(song, artist);
      
      if (!result) {
        return NextResponse.json(
          { success: false, error: 'Audio features not found for this song' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    // 批量查询
    if (!songs || !Array.isArray(songs) || songs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: songs (array) or song (string)' },
        { status: 400 }
      );
    }

    // 限制批量请求数量（避免速率限制）
    if (songs.length > 20) {
      return NextResponse.json(
        { success: false, error: 'Too many songs. Maximum is 20.' },
        { status: 400 }
      );
    }

    const results = await client.getMultipleTempoAndKey(songs);

    return NextResponse.json({
      success: true,
      data: results,
    });

  } catch (error) {
    console.error('[Audio Features API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
