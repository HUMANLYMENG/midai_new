import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId, getOrCreateDefaultUser } from '@/lib/auth';

// GET /api/tracks - 获取当前用户的所有单曲
export async function GET(request: NextRequest) {
  try {
    let userId = await getCurrentUserId(request);
    if (userId instanceof NextResponse) {
      const defaultUser = await getOrCreateDefaultUser();
      userId = defaultUser.id;
    }

    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'default';

    let orderBy: any = {};

    switch (sort) {
      case 'alphabet':
        orderBy = { title: 'asc' };
        break;
      case 'genre':
        orderBy = { genre: 'asc' };
        break;
      case 'artist':
        orderBy = { artist: 'asc' };
        break;
      case 'album':
        orderBy = { albumName: 'asc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    const tracks = await prisma.track.findMany({
      where: { userId },
      orderBy,
    });

    return NextResponse.json({ success: true, data: tracks });
  } catch (error) {
    console.error('Failed to fetch tracks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tracks' },
      { status: 500 }
    );
  }
}

// POST /api/tracks - 创建单曲
export async function POST(request: NextRequest) {
  try {
    let userId = await getCurrentUserId(request);
    if (userId instanceof NextResponse) {
      const defaultUser = await getOrCreateDefaultUser();
      userId = defaultUser.id;
    }

    const body = await request.json();

    const track = await prisma.track.create({
      data: {
        title: body.title,
        artist: body.artist,
        albumName: body.albumName,
        releaseDate: body.releaseDate,
        genre: body.genre,
        length: body.length,
        label: body.label,
        tag: body.tag,
        comment: body.comment,
        coverUrl: body.coverUrl,
        userId: userId,
      },
    });

    return NextResponse.json({ success: true, data: track });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Track already exists in your collection' },
        { status: 409 }
      );
    }

    console.error('Failed to create track:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create track' },
      { status: 500 }
    );
  }
}
