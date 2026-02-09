import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId, getOrCreateDefaultUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    let userId = await getCurrentUserId(request);
    // Fallback for development if not authenticated
    if (userId instanceof NextResponse) {
      const defaultUser = await getOrCreateDefaultUser();
      userId = defaultUser.id;
    }

    // 只获取当前用户的专辑的流派
    const albums = await prisma.album.findMany({
      where: { userId },
    });

    // Extract unique genres
    const genreSet = new Set<string>();

    albums.forEach((album) => {
      if (album.genre) {
        album.genre.split(/[,/]/).forEach((g) => {
          genreSet.add(g.trim().toLowerCase());
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: Array.from(genreSet),
    });
  } catch (error) {
    console.error('Failed to fetch genres:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch genres' },
      { status: 500 }
    );
  }
}
