import { NextRequest, NextResponse } from 'next/server';
import { getCover, getCovers, findBestCover } from '@/lib/cover';

// GET /api/cover?artist=xxx&album=xxx&size=large
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artist = searchParams.get('artist') || '';
    const album = searchParams.get('album') || '';
    const size = (searchParams.get('size') as 'small' | 'medium' | 'large') || 'large';

    if (!artist.trim()) {
      return NextResponse.json(
        { success: false, error: 'Artist is required' },
        { status: 400 }
      );
    }

    const result = await findBestCover(artist, album || undefined);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'No cover found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        coverUrl: result.url,
        artist,
        album: album || undefined,
        source: result.source,
      },
    });
  } catch (error) {
    console.error('Failed to fetch cover:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cover' },
      { status: 500 }
    );
  }
}

// POST /api/cover - 获取多种尺寸的封面
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { artist, album } = body;

    if (!artist?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Artist is required' },
        { status: 400 }
      );
    }

    const covers = await getCovers(artist, album || undefined);

    return NextResponse.json({
      success: true,
      data: covers,
    });
  } catch (error) {
    console.error('Failed to fetch covers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch covers' },
      { status: 500 }
    );
  }
}
