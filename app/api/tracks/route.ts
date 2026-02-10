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

// POST /api/tracks - 创建单曲，自动创建所属专辑（如果不存在）
export async function POST(request: NextRequest) {
  try {
    let userId = await getCurrentUserId(request);
    if (userId instanceof NextResponse) {
      const defaultUser = await getOrCreateDefaultUser();
      userId = defaultUser.id;
    }

    const body = await request.json();

    // 检查所属专辑是否存在，如果不存在则自动创建
    let albumId: number | null = null;
    
    // 查找是否已存在该专辑
    const existingAlbum = await prisma.album.findFirst({
      where: {
        userId,
        title: { equals: body.albumName, mode: 'insensitive' },
        artist: { equals: body.artist, mode: 'insensitive' },
      },
    });

    if (existingAlbum) {
      albumId = existingAlbum.id;
      console.log(`[Track API] Found existing album: ${existingAlbum.title}`);
    } else {
      // 自动创建专辑
      try {
        const newAlbum = await prisma.album.create({
          data: {
            title: body.albumName,
            artist: body.artist,
            releaseDate: body.releaseDate,
            genre: body.genre,
            length: body.length,
            label: body.label,
            coverUrl: body.coverUrl,
            userId: userId,
          },
        });
        albumId = newAlbum.id;
        console.log(`[Track API] Auto-created album: ${newAlbum.title}`);
      } catch (albumError) {
        console.error('[Track API] Failed to auto-create album:', albumError);
        // 即使创建专辑失败，也继续创建 track
      }
    }

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

    return NextResponse.json({ 
      success: true, 
      data: track,
      albumCreated: albumId !== null && !existingAlbum,
      albumId: albumId,
    });
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
