import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/albums/:id - 获取单个专辑
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const album = await prisma.album.findUnique({
      where: { id: parseInt(params.id) },
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

// PUT /api/albums/:id - 更新专辑
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const album = await prisma.album.update({
      where: { id: parseInt(params.id) },
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

// DELETE /api/albums/:id - 删除专辑
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.album.delete({
      where: { id: parseInt(params.id) },
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
