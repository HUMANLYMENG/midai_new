/**
 * 封面获取服务（集成缓存）
 * 
 * 优先级：
 * 1. 本地缓存 (SharedAlbumCache)
 * 2. Spotify (album-art)
 * 3. MusicBrainz (备用)
 * 
 * 获取成功后自动写入缓存
 */

import albumArt from 'album-art';
import { findInCache, saveToCache } from './album-cache';

export interface CoverResult {
  url: string;
  source: 'cache' | 'spotify' | 'musicbrainz';
}

// 备用封面源：MusicBrainz Cover Art Archive
async function getMusicBrainzCover(artist: string, album?: string): Promise<string | null> {
  try {
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

    const coverUrl = `https://coverartarchive.org/release/${release.id}/front-500`;

    // 验证封面是否存在
    const coverResponse = await fetch(coverUrl, { method: 'HEAD' });
    if (coverResponse.ok) {
      return coverUrl;
    }

    return null;
  } catch (error) {
    console.error('[MusicBrainz] Cover fetch failed:', error);
    return null;
  }
}

/**
 * 获取专辑封面（带缓存）
 * 
 * @param artist 艺术家名称
 * @param album 专辑名称
 * @param releaseDate 发行日期（用于缓存 key）
 * @param skipCache 是否跳过缓存（强制刷新）
 */
export async function getCoverWithCache(
  artist: string,
  album?: string,
  releaseDate?: string | null,
  skipCache: boolean = false
): Promise<CoverResult | null> {
  if (!artist || !artist.trim()) {
    console.log('[CoverService] Empty artist, skipping');
    return null;
  }

  const trimmedArtist = artist.trim();
  const trimmedAlbum = album?.trim() || '';

  console.log(`[CoverService] Getting cover for: "${trimmedArtist}" - "${trimmedAlbum || 'N/A'}"`);

  // 1. 检查缓存
  if (!skipCache && trimmedAlbum) {
    const cached = await findInCache(trimmedAlbum, trimmedArtist, releaseDate);
    if (cached?.coverUrl) {
      console.log(`[CoverService] ✅ Cache hit: "${trimmedAlbum}" - "${trimmedArtist}"`);
      return {
        url: cached.coverUrl,
        source: 'cache',
      };
    }
  }

  // 2. 尝试 Spotify (album-art)
  console.log(`[CoverService] Trying Spotify...`);
  try {
    const url = await albumArt(trimmedArtist, {
      album: trimmedAlbum || undefined,
      size: 'large',
    });

    if (url && typeof url === 'string' && url.startsWith('http')) {
      console.log(`[CoverService] ✅ Found via Spotify: ${url.substring(0, 60)}...`);
      
      // 保存到缓存
      if (trimmedAlbum) {
        await saveToCache(trimmedAlbum, trimmedArtist, releaseDate, {
          coverUrl: url,
          genres: null,
          coverSource: 'spotify',
        });
      }

      return { url, source: 'spotify' };
    }
  } catch (error) {
    console.error(`[CoverService] Spotify failed:`, error);
  }

  // 3. 尝试 MusicBrainz (备用)
  console.log(`[CoverService] Trying MusicBrainz...`);
  const mbUrl = await getMusicBrainzCover(trimmedArtist, trimmedAlbum || undefined);
  if (mbUrl) {
    console.log(`[CoverService] ✅ Found via MusicBrainz: ${mbUrl}`);
    
    // 保存到缓存
    if (trimmedAlbum) {
      await saveToCache(trimmedAlbum, trimmedArtist, releaseDate, {
        coverUrl: mbUrl,
        genres: null,
        coverSource: 'musicbrainz',
      });
    }

    return { url: mbUrl, source: 'musicbrainz' };
  }

  console.log(`[CoverService] ❌ No cover found for: "${trimmedArtist}" - "${trimmedAlbum || 'N/A'}"`);
  return null;
}

/**
 * 批量获取封面（带缓存优化）
 * 
 * @param items 专辑列表
 * @returns 封面结果数组，顺序与输入一致
 */
export async function getCoversBatch(
  items: Array<{
    artist: string;
    album?: string;
    releaseDate?: string | null;
  }>
): Promise<Array<CoverResult | null>> {
  console.log(`[CoverService] Batch fetching ${items.length} covers...`);
  
  const results: Array<CoverResult | null> = new Array(items.length).fill(null);
  let cacheHits = 0;
  let apiCalls = 0;

  // 使用 Promise.allSettled 并发处理，但控制并发数
  const CONCURRENT_LIMIT = 5;
  
  for (let i = 0; i < items.length; i += CONCURRENT_LIMIT) {
    const batch = items.slice(i, i + CONCURRENT_LIMIT);
    
    const batchPromises = batch.map(async (item, batchIndex) => {
      const index = i + batchIndex;
      const result = await getCoverWithCache(
        item.artist,
        item.album,
        item.releaseDate
      );
      
      if (result) {
        results[index] = result;
        if (result.source === 'cache') cacheHits++;
        else apiCalls++;
      }
      
      return result;
    });

    await Promise.all(batchPromises);
    
    // 延迟避免请求过快
    if (i + CONCURRENT_LIMIT < items.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`[CoverService] Batch complete: ${cacheHits} cache hits, ${apiCalls} API calls`);
  return results;
}

/**
 * 强制刷新缓存
 * 
 * @param artist 艺术家名称
 * @param album 专辑名称
 * @param releaseDate 发行日期
 */
export async function refreshCoverCache(
  artist: string,
  album?: string,
  releaseDate?: string | null
): Promise<CoverResult | null> {
  console.log(`[CoverService] Force refreshing cover for: "${artist}" - "${album || 'N/A'}"`);
  return getCoverWithCache(artist, album, releaseDate, true);
}
