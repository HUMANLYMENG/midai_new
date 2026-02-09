import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId, getOrCreateDefaultUser } from '@/lib/auth';

// GET /api/albums - 获取当前用户的所有专辑
export async function GET(request: NextRequest) {
  try {
    // Use session auth, fallback to default user for development
    let userId = await getCurrentUserId(request);
    if (userId instanceof NextResponse) {
      // Fallback to default dev user
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
      case 'label':
        orderBy = { label: 'asc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    const albums = await prisma.album.findMany({
      where: { userId },
      orderBy,
    });

    return NextResponse.json({ success: true, data: albums });
  } catch (error) {
    console.error('Failed to fetch albums:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch albums' },
      { status: 500 }
    );
  }
}

// POST /api/albums - 创建专辑（关联当前用户）
export async function POST(request: NextRequest) {
  try {
    let userId = await getCurrentUserId(request);
    // Fallback for development if not authenticated
    if (userId instanceof NextResponse) {
      const defaultUser = await getOrCreateDefaultUser();
      userId = defaultUser.id;
    }

    const body = await request.json();

    const album = await prisma.album.create({
      data: {
        title: body.title,
        artist: body.artist,
        releaseDate: body.releaseDate,
        genre: body.genre,
        length: body.length,
        label: body.label,
        tag: body.tag,
        comment: body.comment,
        coverUrl: body.coverUrl,
        userId: userId, // 关联当前用户
      },
    });

    return NextResponse.json({ success: true, data: album });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Album already exists in your collection' },
        { status: 409 }
      );
    }

    console.error('Failed to create album:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create album' },
      { status: 500 }
    );
  }
}
