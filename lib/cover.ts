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

// 备用封面源：MusicBrainz Cover Art Archive
async function getMusicBrainzCover(artist: string, album?: string): Promise<string | null> {
  try {
    // 搜索 MusicBrainz
    const query = album
      ? `artist:"${artist}" AND release:"${album}"`
      : `artist:"${artist}"`;

    const searchUrl = `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(query)}&fmt=json&limit=1`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'MidaiApp/1.0 (midai@example.com)',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const release = data.releases?.[0];

    if (!release?.id) {
      return null;
    }

    // 获取封面
    const coverUrl = `https://coverartarchive.org/release/${release.id}/front-500`;

    // 验证封面是否存在
    const coverResponse = await fetch(coverUrl, { method: 'HEAD' });
    if (coverResponse.ok) {
      return coverUrl;
    }

    return null;
  } catch (error) {
    console.error('MusicBrainz cover fetch failed:', error);
    return null;
  }
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
  if (!artist || !artist.trim()) {
    console.log('[Cover] Empty artist, skipping');
    return null;
  }

  const trimmedArtist = artist.trim();
  const trimmedAlbum = album?.trim();

  console.log(`[Cover] Fetching cover for: "${trimmedArtist}" - "${trimmedAlbum || 'N/A'}" (${size})`);

  // 1. 尝试 album-art (Spotify)
  try {
    const url = await albumArt(trimmedArtist, {
      album: trimmedAlbum || undefined,
      size,
    });

    if (url && typeof url === 'string' && url.startsWith('http')) {
      console.log(`[Cover] Found via Spotify: ${url.substring(0, 60)}...`);
      return url;
    }
  } catch (error) {
    console.error(`[Cover] album-art failed for "${trimmedArtist}":`, error);
  }

  // 2. 尝试 MusicBrainz (备用)
  console.log(`[Cover] Trying MusicBrainz for: "${trimmedArtist}"`);
  const mbUrl = await getMusicBrainzCover(trimmedArtist, trimmedAlbum);
  if (mbUrl) {
    console.log(`[Cover] Found via MusicBrainz: ${mbUrl}`);
    return mbUrl;
  }

  console.log(`[Cover] No cover found for: "${trimmedArtist}" - "${trimmedAlbum || 'N/A'}"`);
  return null;
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
  if (!artist || !artist.trim()) {
    console.log('[findBestCover] Empty artist, returning null');
    return null;
  }

  const trimmedArtist = artist.trim();
  const trimmedAlbum = album?.trim();

  console.log(`[findBestCover] Searching for: "${trimmedArtist}" - "${trimmedAlbum || 'N/A'}"`);

  // 1. 尝试艺术家 + 专辑
  if (trimmedAlbum) {
    console.log(`[findBestCover] Trying artist + album: "${trimmedArtist}" - "${trimmedAlbum}"`);
    const url = await getCover(trimmedArtist, trimmedAlbum, 'large');
    if (url) {
      console.log(`[findBestCover] Found with artist + album`);
      return { url, source: `${trimmedArtist} - ${trimmedAlbum}` };
    }
  }

  // 2. 仅尝试艺术家
  console.log(`[findBestCover] Trying artist only: "${trimmedArtist}"`);
  const url = await getCover(trimmedArtist, undefined, 'large');
  if (url) {
    console.log(`[findBestCover] Found with artist only`);
    return { url, source: trimmedArtist };
  }

  console.log(`[findBestCover] No cover found for: "${trimmedArtist}"`);
  return null;
}
