import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

// GET /api/albums/:id - 获取单个专辑（只能获取自己的）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId(request);
    if (userId instanceof NextResponse) return userId;

    const album = await prisma.album.findFirst({
      where: {
        id: parseInt(id),
        userId, // 只能获取自己的专辑
      },
    });

    if (!album) {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: album });
  } catch (error) {
    console.error('Failed to fetch album:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch album' },
      { status: 500 }
    );
  }
}

// PUT /api/albums/:id - 更新专辑（只能更新自己的）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId(request);
    if (userId instanceof NextResponse) return userId;

    const body = await request.json();

    // 先检查专辑是否属于当前用户
    const existingAlbum = await prisma.album.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!existingAlbum) {
      return NextResponse.json(
        { success: false, error: 'Album not found or not authorized' },
        { status: 404 }
      );
    }

    const album = await prisma.album.update({
      where: { id: parseInt(id) },
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
      },
    });

    return NextResponse.json({ success: true, data: album });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 }
      );
    }

    console.error('Failed to update album:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update album' },
      { status: 500 }
    );
  }
}

// DELETE /api/albums/:id - 删除专辑（只能删除自己的）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId(request);
    if (userId instanceof NextResponse) return userId;

    // 先检查专辑是否属于当前用户
    const existingAlbum = await prisma.album.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!existingAlbum) {
      return NextResponse.json(
        { success: false, error: 'Album not found or not authorized' },
        { status: 404 }
      );
    }

    await prisma.album.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 }
      );
    }

    console.error('Failed to delete album:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete album' },
      { status: 500 }
    );
  }
}
