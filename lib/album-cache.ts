import { prisma } from './db';

/**
 * 专辑缓存服务
 * 
 * 提供共享的专辑信息缓存，包括封面和流派
 * Key: 专辑名-艺术家-发行年份（标准化）
 * Value: 封面URL, 流派
 */

export interface CacheKey {
  albumName: string;
  artist: string;
  year?: string | null;
}

export interface CacheValue {
  coverUrl: string | null;
  genres: string | null;
  coverSource?: string | null;
  genreSource?: string | null;
}

export interface CacheEntry extends CacheValue {
  albumName: string;
  artist: string;
  hitCount: number;
  lastHitAt: Date;
  createdAt: Date;
}

/**
 * 标准化字符串（用于生成缓存 key）
 * - 转为小写
 * - 移除多余空格
 * - 移除特殊字符（保留字母、数字、空格）
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')        // 多个空格合并为一个
    .replace(/[^\w\s]/g, '');    // 移除非字母数字空格字符
}

/**
 * 提取年份
 * 支持格式："2020", "2020-01-01", "2020/01/01"
 */
function extractYear(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{4})/);
  return match ? match[1] : null;
}

/**
 * 生成缓存 key
 */
export function generateCacheKey(albumName: string, artist: string, releaseDate?: string | null): CacheKey {
  return {
    albumName: normalizeString(albumName),
    artist: normalizeString(artist),
    year: extractYear(releaseDate),
  };
}

/**
 * 从缓存查找专辑信息
 * 同时会更新命中统计
 */
export async function findInCache(
  albumName: string,
  artist: string,
  releaseDate?: string | null
): Promise<CacheEntry | null> {
  const key = generateCacheKey(albumName, artist, releaseDate);
  
  // 首先尝试精确匹配（包含年份）
  let cache = await prisma.sharedAlbumCache.findUnique({
    where: {
      albumKey_artistKey_yearKey: {
        albumKey: key.albumName,
        artistKey: key.artist,
        yearKey: key.year || '',
      },
    },
  });

  // 如果没找到且年份不为空，尝试不带年份的匹配
  if (!cache && key.year) {
    cache = await prisma.sharedAlbumCache.findFirst({
      where: {
        albumKey: key.albumName,
        artistKey: key.artist,
      },
      orderBy: {
        hitCount: 'desc', // 优先使用命中次数多的
      },
    });
  }

  if (cache) {
    // 更新命中统计
    await prisma.sharedAlbumCache.update({
      where: { id: cache.id },
      data: {
        hitCount: { increment: 1 },
        lastHitAt: new Date(),
      },
    });

    return {
      albumName: cache.albumName,
      artist: cache.artist,
      coverUrl: cache.coverUrl,
      genres: cache.genres,
      coverSource: cache.coverSource,
      genreSource: cache.genreSource,
      hitCount: cache.hitCount + 1,
      lastHitAt: new Date(),
      createdAt: cache.createdAt,
    };
  }

  return null;
}

/**
 * 保存专辑信息到缓存
 */
export async function saveToCache(
  albumName: string,
  artist: string,
  releaseDate: string | null | undefined,
  data: CacheValue
): Promise<void> {
  const key = generateCacheKey(albumName, artist, releaseDate);
  
  await prisma.sharedAlbumCache.upsert({
    where: {
      albumKey_artistKey_yearKey: {
        albumKey: key.albumName,
        artistKey: key.artist,
        yearKey: key.year || '',
      },
    },
    create: {
      albumKey: key.albumName,
      artistKey: key.artist,
      yearKey: key.year || '',
      albumName: albumName.trim(),
      artist: artist.trim(),
      coverUrl: data.coverUrl,
      genres: data.genres,
      coverSource: data.coverSource,
      genreSource: data.genreSource,
      hitCount: 1,
      lastHitAt: new Date(),
    },
    update: {
      // 只有新数据不为空时才更新
      ...(data.coverUrl && { coverUrl: data.coverUrl }),
      ...(data.coverUrl && data.coverSource && { coverSource: data.coverSource }),
      ...(data.genres && { genres: data.genres }),
      ...(data.genres && data.genreSource && { genreSource: data.genreSource }),
      lastHitAt: new Date(),
    },
  });
}

/**
 * 批量查找缓存
 * 返回找到的缓存和未找到的列表
 */
export async function findManyInCache(
  items: Array<{ albumName: string; artist: string; releaseDate?: string | null }>
): Promise<{
  found: Array<{ index: number; data: CacheEntry }>;
  notFound: Array<{ index: number; albumName: string; artist: string; releaseDate?: string | null }>;
}> {
  const found: Array<{ index: number; data: CacheEntry }> = [];
  const notFound: Array<{ index: number; albumName: string; artist: string; releaseDate?: string | null }> = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const cache = await findInCache(item.albumName, item.artist, item.releaseDate);
    
    if (cache) {
      found.push({ index: i, data: cache });
    } else {
      notFound.push({ index: i, ...item });
    }
  }

  return { found, notFound };
}

/**
 * 获取缓存统计信息
 */
export async function getCacheStats(): Promise<{
  total: number;
  withCover: number;
  withGenres: number;
  withBoth: number;
  totalHits: number;
  topAlbums: Array<{ albumName: string; artist: string; hitCount: number }>;
}> {
  const [
    total,
    withCover,
    withGenres,
    withBoth,
    hitsAgg,
    topAlbums,
  ] = await Promise.all([
    prisma.sharedAlbumCache.count(),
    prisma.sharedAlbumCache.count({ where: { coverUrl: { not: null } } }),
    prisma.sharedAlbumCache.count({ where: { genres: { not: null } } }),
    prisma.sharedAlbumCache.count({
      where: { coverUrl: { not: null }, genres: { not: null } },
    }),
    prisma.sharedAlbumCache.aggregate({
      _sum: { hitCount: true },
    }),
    prisma.sharedAlbumCache.findMany({
      orderBy: { hitCount: 'desc' },
      take: 10,
      select: {
        albumName: true,
        artist: true,
        hitCount: true,
      },
    }),
  ]);

  return {
    total,
    withCover,
    withGenres,
    withBoth,
    totalHits: hitsAgg._sum.hitCount || 0,
    topAlbums,
  };
}

/**
 * 清理长期未使用的缓存
 */
export async function cleanupCache(daysOld: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.sharedAlbumCache.deleteMany({
    where: {
      lastHitAt: { lt: cutoffDate },
      hitCount: { lt: 5 }, // 保留热门数据
    },
  });

  return result.count;
}

/**
 * 根据专辑名和艺术家搜索缓存（模糊搜索）
 */
export async function searchCache(
  query: string,
  limit: number = 10
): Promise<CacheEntry[]> {
  const normalizedQuery = normalizeString(query);
  
  const results = await prisma.sharedAlbumCache.findMany({
    where: {
      OR: [
        { albumKey: { contains: normalizedQuery } },
        { artistKey: { contains: normalizedQuery } },
      ],
    },
    orderBy: { hitCount: 'desc' },
    take: limit,
  });

  return results.map(r => ({
    albumName: r.albumName,
    artist: r.artist,
    coverUrl: r.coverUrl,
    genres: r.genres,
    coverSource: r.coverSource,
    genreSource: r.genreSource,
    hitCount: r.hitCount,
    lastHitAt: r.lastHitAt,
    createdAt: r.createdAt,
  }));
}
