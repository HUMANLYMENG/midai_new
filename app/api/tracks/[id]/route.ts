import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId, getOrCreateDefaultUser } from '@/lib/auth';

// GET /api/tracks/[id] - 获取单个单曲
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    let userId = await getCurrentUserId(request);
    if (userId instanceof NextResponse) {
      const defaultUser = await getOrCreateDefaultUser();
      userId = defaultUser.id;
    }

    const track = await prisma.track.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!track) {
      return NextResponse.json(
        { success: false, error: 'Track not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: track });
  } catch (error) {
    console.error('Failed to fetch track:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch track' },
      { status: 500 }
    );
  }
}

// PUT /api/tracks/[id] - 更新单曲
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    let userId = await getCurrentUserId(request);
    if (userId instanceof NextResponse) {
      const defaultUser = await getOrCreateDefaultUser();
      userId = defaultUser.id;
    }

    // 检查权限
    const existingTrack = await prisma.track.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!existingTrack) {
      return NextResponse.json(
        { success: false, error: 'Track not found or unauthorized' },
        { status: 404 }
      );
    }

    const body = await request.json();

    const track = await prisma.track.update({
      where: { id: parseInt(id) },
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

    console.error('Failed to update track:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update track' },
      { status: 500 }
    );
  }
}

// DELETE /api/tracks/[id] - 删除单曲
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    let userId = await getCurrentUserId(request);
    if (userId instanceof NextResponse) {
      const defaultUser = await getOrCreateDefaultUser();
      userId = defaultUser.id;
    }

    // 检查权限
    const existingTrack = await prisma.track.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!existingTrack) {
      return NextResponse.json(
        { success: false, error: 'Track not found or unauthorized' },
        { status: 404 }
      );
    }

    await prisma.track.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete track:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete track' },
      { status: 500 }
    );
  }
}
