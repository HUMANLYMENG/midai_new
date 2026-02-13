import { NextRequest, NextResponse } from 'next/server';
import { createGenreServiceFromEnv, TrackGenresResult } from '@/lib/genre-service';

/**
 * GET /api/genres?track=歌曲名&artist=歌手名&prefer=spotify|musicbrainz
 * POST /api/genres { track: "歌曲名", artist: "歌手名", prefer?: "spotify"|"musicbrainz" }
 * 
 * 返回歌曲流派信息（从 Spotify 或 MusicBrainz 获取）
 */

// GET 方式
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const track = searchParams.get('track');
    const artist = searchParams.get('artist');
    const prefer = searchParams.get('prefer') as 'spotify' | 'musicbrainz' | 'auto' | null;

    if (!track || !artist) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: track and artist' },
        { status: 400 }
      );
    }

    const service = createGenreServiceFromEnv();
    const result = await service.getTrackGenres(track, artist, prefer || 'auto');

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'No genres found for this track' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('[Genres API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST 方式（支持批量查询）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 单条查询
    if (body.track && body.artist) {
      const { track, artist, prefer = 'auto' } = body;
      
      const service = createGenreServiceFromEnv();
      const result = await service.getTrackGenres(track, artist, prefer);

      if (!result) {
        return NextResponse.json(
          { success: false, error: 'No genres found for this track' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result,
      });
    }
    
    // 批量查询
    if (body.tracks && Array.isArray(body.tracks)) {
      const { tracks, prefer = 'auto' } = body;
      
      if (tracks.length > 50) {
        return NextResponse.json(
          { success: false, error: 'Too many tracks. Maximum is 50.' },
          { status: 400 }
        );
      }

      const service = createGenreServiceFromEnv();
      const results = await service.getMultipleGenres(tracks, { prefer });

      return NextResponse.json({
        success: true,
        data: results,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request body. Provide either (track, artist) or tracks array.' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[Genres API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
