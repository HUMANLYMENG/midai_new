import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const albums = await prisma.album.findMany();
    
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
