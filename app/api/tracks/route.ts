import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

// GET /api/tracks - 获取当前用户的所有单曲
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    if (userId instanceof NextResponse) {
      return userId;
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

// 辅助函数：查找专辑（大小写不敏感）
async function findAlbumCaseInsensitive(userId: string, title: string, artist: string) {
  // SQLite 不支持 mode: 'insensitive'，手动比较
  const albums = await prisma.album.findMany({
    where: { userId },
  });
  
  return albums.find(a => 
    a.title.toLowerCase() === title.toLowerCase() &&
    a.artist.toLowerCase() === artist.toLowerCase()
  );
}

// POST /api/tracks - 创建单曲，自动创建所属专辑（如果不存在）
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    if (userId instanceof NextResponse) {
      return userId;
    }

    const body = await request.json();
    console.log('[Track API] Creating track:', body);

    // 检查所属专辑是否存在，如果不存在则自动创建
    let albumId: number | null = null;
    let albumCreated = false;
    
    if (body.albumName) {
      // 查找是否已存在该专辑（大小写不敏感）
      const existingAlbum = await findAlbumCaseInsensitive(userId, body.albumName, body.artist);

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
          albumCreated = true;
          console.log(`[Track API] Auto-created album: ${newAlbum.title}`);
        } catch (albumError: any) {
          console.error('[Track API] Failed to auto-create album:', albumError);
          // 继续创建 track，不阻塞
        }
      }
    }

    const track = await prisma.track.create({
      data: {
        title: body.title,
        artist: body.artist,
        albumName: body.albumName || '',
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
      albumCreated,
      albumId,
    });
  } catch (error: any) {
    console.error('[Track API] Error:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Track already exists in your collection' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create track' },
      { status: 500 }
    );
  }
}
