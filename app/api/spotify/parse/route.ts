import { NextRequest, NextResponse } from 'next/server';
import { parseSpotifyUrl } from '@/lib/spotify-parser';

/**
 * POST /api/spotify/parse
 * 解析 Spotify 链接（歌曲、歌单、专辑、艺术家）
 * 
 * Body: { "url": "https://open.spotify.com/playlist/xxx" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    const result = await parseSpotifyUrl(url);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('[Spotify Parse API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/spotify/parse?url=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Missing url query parameter' },
        { status: 400 }
      );
    }

    const result = await parseSpotifyUrl(url);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('[Spotify Parse API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
