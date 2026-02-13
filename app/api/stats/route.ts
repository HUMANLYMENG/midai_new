import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId, getOrCreateDefaultUser } from '@/lib/auth';

// GET /api/stats - 获取用户收藏的统计数据
export async function GET(request: NextRequest) {
  try {
    let userId = await getCurrentUserId(request);
    if (userId instanceof NextResponse) {
      const defaultUser = await getOrCreateDefaultUser();
      userId = defaultUser.id;
    }

    // 基础统计
    const [albumCount, trackCount] = await Promise.all([
      prisma.album.count({ where: { userId } }),
      prisma.track.count({ where: { userId } }),
    ]);

    // 获取唯一艺术家数量
    const albums = await prisma.album.findMany({ where: { userId }, select: { artist: true } });
    const tracks = await prisma.track.findMany({ where: { userId }, select: { artist: true } });
    const uniqueArtists = new Set([...albums.map(a => a.artist), ...tracks.map(t => t.artist)]).size;

    // 获取流派统计（解析 genre 字段，可能是逗号分隔的）
    const allAlbums = await prisma.album.findMany({ where: { userId }, select: { genre: true } });
    const genreMap = new Map<string, number>();
    allAlbums.forEach(album => {
      if (album.genre) {
        const genres = album.genre.split(/[,/]/).map(g => g.trim()).filter(Boolean);
        genres.forEach(g => {
          genreMap.set(g, (genreMap.get(g) || 0) + 1);
        });
      }
    });
    const topGenres = Array.from(genreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({ name, count }));

    // 最近添加的专辑（带封面）
    const recentAlbums = await prisma.album.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        title: true,
        artist: true,
        coverUrl: true,
        genre: true,
        releaseDate: true,
      },
    });

    // 最近添加的单曲（如果有封面也带上）
    const recentTracks = await prisma.track.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: {
        id: true,
        title: true,
        artist: true,
        coverUrl: true,
        albumName: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        counts: {
          albums: albumCount,
          tracks: trackCount,
          artists: uniqueArtists,
          genres: genreMap.size,
        },
        topGenres,
        recentAlbums,
        recentTracks,
      },
    });
  } catch (error) {
    console.error('[Stats API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
