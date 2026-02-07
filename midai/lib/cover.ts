/**
 * 专辑封面获取工具
 * 使用 album-art 库 (基于 Spotify)
 */

import albumArt from 'album-art';

export interface CoverSearchResult {
  coverUrl: string;
  thumbnailUrl: string;
  size: 'small' | 'medium' | 'large';
}

/**
 * 获取专辑封面
 * @param artist 艺术家名称
 * @param album 专辑名称（可选）
 * @param size 图片尺寸
 * @returns 封面图片 URL
 */
export async function getCover(
  artist: string,
  album?: string,
  size: 'small' | 'medium' | 'large' = 'large'
): Promise<string | null> {
  if (!artist.trim()) {
    return null;
  }

  try {
    const url = await albumArt(artist, {
      album: album || undefined,
      size,
    });
    return url || null;
  } catch (error) {
    console.error('Failed to get cover:', error);
    return null;
  }
}

/**
 * 获取多种尺寸的封面
 */
export async function getCovers(
  artist: string,
  album?: string
): Promise<{
  small: string | null;
  medium: string | null;
  large: string | null;
}> {
  const [small, medium, large] = await Promise.all([
    getCover(artist, album, 'small'),
    getCover(artist, album, 'medium'),
    getCover(artist, album, 'large'),
  ]);

  return { small, medium, large };
}

/**
 * 查找最佳封面（尝试不同组合）
 */
export async function findBestCover(
  artist: string,
  album?: string
): Promise<{ url: string; source: string } | null> {
  if (!artist.trim()) {
    return null;
  }

  // 1. 尝试艺术家 + 专辑
  if (album?.trim()) {
    const url = await getCover(artist, album, 'large');
    if (url) {
      return { url, source: `${artist} - ${album}` };
    }
  }

  // 2. 仅尝试艺术家
  const url = await getCover(artist, undefined, 'large');
  if (url) {
    return { url, source: artist };
  }

  return null;
}
