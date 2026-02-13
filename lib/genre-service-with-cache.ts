/**
 * 流派获取服务（集成缓存）
 * 
 * 优先级：
 * 1. 本地缓存 (SharedAlbumCache)
 * 2. MusicBrainz (主要来源)
 * 3. Spotify (备用)
 * 
 * 获取成功后自动写入缓存
 */

import axios from 'axios';
import { findInCache, saveToCache } from './album-cache';

export interface GenreResult {
  genres: string[];
  source: 'cache' | 'musicbrainz' | 'spotify' | 'none';
  confidence: number;
}

// ============ MusicBrainz API (主要来源) ============

class MusicBrainzClient {
  private userAgent: string;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 1100; // MusicBrainz 限速 1 req/sec

  constructor(appName: string, appVersion: string, contactInfo: string) {
    this.userAgent = `${appName}/${appVersion} ( ${contactInfo} )`;
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  async searchRecording(trackName: string, artistName: string): Promise<GenreResult | null> {
    await this.rateLimit();

    try {
      const query = `recording:"${trackName}" AND artist:"${artistName}"`;
      const searchRes = await axios.get('https://musicbrainz.org/ws/2/recording', {
        headers: { 'User-Agent': this.userAgent },
        params: { query, fmt: 'json', limit: 3 },
      });

      const recordings = searchRes.data.recordings;
      if (!recordings || recordings.length === 0) {
        return null;
      }

      return await this.getRecordingDetails(recordings[0].id);
    } catch (error) {
      console.error('[MusicBrainz] Search error:', error);
      return null;
    }
  }

  private async getRecordingDetails(recordingId: string): Promise<GenreResult | null> {
    await this.rateLimit();

    try {
      const detailRes = await axios.get(`https://musicbrainz.org/ws/2/recording/${recordingId}`, {
        headers: { 'User-Agent': this.userAgent },
        params: {
          fmt: 'json',
          inc: 'artists+releases+tags+genres',
        },
      });

      const data = detailRes.data;
      const genres = this.extractGenres(data);
      
      // 获取专辑流派
      if (data.releases?.[0]) {
        await this.addReleaseGenres(data.releases[0].id, genres);
      }

      if (genres.size === 0) return null;

      return {
        genres: Array.from(genres),
        source: 'musicbrainz',
        confidence: Math.min(0.5 + genres.size * 0.1, 1.0),
      };
    } catch (error) {
      return null;
    }
  }

  private extractGenres(data: any): Set<string> {
    const genres = new Set<string>();
    
    data.tags?.forEach((tag: any) => genres.add(tag.name.toLowerCase()));
    data.genres?.forEach((genre: any) => genres.add(genre.name.toLowerCase()));

    if (data['artist-credit']?.[0]?.artist) {
      const artist = data['artist-credit'][0].artist;
      artist.tags?.forEach((tag: any) => genres.add(tag.name.toLowerCase()));
      artist.genres?.forEach((genre: any) => genres.add(genre.name.toLowerCase()));
    }

    return genres;
  }

  private async addReleaseGenres(releaseId: string, genres: Set<string>): Promise<void> {
    await this.rateLimit();

    try {
      const releaseRes = await axios.get(`https://musicbrainz.org/ws/2/release/${releaseId}`, {
        headers: { 'User-Agent': this.userAgent },
        params: { fmt: 'json', inc: 'tags+genres' },
      });

      releaseRes.data.tags?.forEach((tag: any) => genres.add(tag.name.toLowerCase()));
      releaseRes.data.genres?.forEach((genre: any) => genres.add(genre.name.toLowerCase()));
    } catch (e) {
      // 忽略错误
    }
  }
}

// ============ Spotify API (备用) ============

class SpotifyClient {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    return this.accessToken!;
  }

  async searchTrack(trackName: string, artistName: string): Promise<GenreResult | null> {
    try {
      const token = await this.getAccessToken();
      
      const query = `track:${trackName} artist:${artistName}`;
      const searchRes = await axios.get('https://api.spotify.com/v1/search', {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { q: query, type: 'track', limit: 1 },
      });

      const track = searchRes.data.tracks?.items?.[0];
      if (!track) return null;

      // Spotify Client Credentials Flow 不返回流派
      // 只能通过艺术家获取
      if (track.artists?.[0]?.id) {
        return await this.getArtistGenres(track.artists[0].id);
      }

      return null;
    } catch (error) {
      console.error('[Spotify] Search error:', error);
      return null;
    }
  }

  private async getArtistGenres(artistId: string): Promise<GenreResult | null> {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(`https://api.spotify.com/v1/artists/${artistId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const genres = response.data.genres;
      if (!genres || genres.length === 0) return null;

      return {
        genres: genres.map((g: string) => g.toLowerCase()),
        source: 'spotify',
        confidence: 0.6,
      };
    } catch (error) {
      return null;
    }
  }
}

// ============ 统一的带缓存的流派服务 ============

interface ServiceConfig {
  spotify?: {
    clientId: string;
    clientSecret: string;
  };
  musicbrainz?: {
    appName: string;
    appVersion: string;
    contactInfo: string;
  };
}

class CachedGenreService {
  private spotify?: SpotifyClient;
  private musicbrainz?: MusicBrainzClient;

  constructor(config: ServiceConfig) {
    if (config.spotify) {
      this.spotify = new SpotifyClient(config.spotify.clientId, config.spotify.clientSecret);
    }
    if (config.musicbrainz) {
      this.musicbrainz = new MusicBrainzClient(
        config.musicbrainz.appName,
        config.musicbrainz.appVersion,
        config.musicbrainz.contactInfo
      );
    }
  }

  /**
   * 获取专辑流派（带缓存）
   * 
   * @param trackName 歌曲名
   * @param artistName 艺术家名
   * @param albumName 专辑名（用于缓存 key）
   * @param releaseDate 发行日期（用于缓存 key）
   * @param skipCache 是否跳过缓存
   */
  async getGenres(
    trackName: string,
    artistName: string,
    albumName?: string,
    releaseDate?: string | null,
    skipCache: boolean = false
  ): Promise<GenreResult> {
    // 1. 检查缓存（如果有专辑名）
    if (!skipCache && albumName) {
      const cached = await findInCache(albumName, artistName, releaseDate);
      if (cached?.genres) {
        console.log(`[GenreService] ✅ Cache hit: "${albumName}" - "${artistName}"`);
        return {
          genres: cached.genres.split(',').map(g => g.trim()),
          source: 'cache',
          confidence: 0.9,
        };
      }
    }

    // 2. 尝试 MusicBrainz
    if (this.musicbrainz) {
      console.log(`[GenreService] Trying MusicBrainz for: "${trackName}" - "${artistName}"`);
      const result = await this.musicbrainz.searchRecording(trackName, artistName);
      
      if (result && result.genres.length > 0) {
        // 保存到缓存
        if (albumName) {
          await saveToCache(albumName, artistName, releaseDate, {
            coverUrl: null,
            genres: result.genres.join(', '),
            genreSource: 'musicbrainz',
          });
        }
        return result;
      }
    }

    // 3. 尝试 Spotify
    if (this.spotify) {
      console.log(`[GenreService] Trying Spotify for: "${trackName}" - "${artistName}"`);
      const result = await this.spotify.searchTrack(trackName, artistName);
      
      if (result && result.genres.length > 0) {
        // 保存到缓存
        if (albumName) {
          await saveToCache(albumName, artistName, releaseDate, {
            coverUrl: null,
            genres: result.genres.join(', '),
            genreSource: 'spotify',
          });
        }
        return result;
      }
    }

    // 都没找到
    return {
      genres: [],
      source: 'none',
      confidence: 0,
    };
  }

  /**
   * 批量获取流派（带缓存优化）
   */
  async getGenresBatch(
    items: Array<{
      trackName: string;
      artistName: string;
      albumName?: string;
      releaseDate?: string | null;
    }>,
    onProgress?: (current: number, total: number) => void
  ): Promise<GenreResult[]> {
    const results: GenreResult[] = [];
    let cacheHits = 0;
    let apiCalls = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const result = await this.getGenres(
        item.trackName,
        item.artistName,
        item.albumName,
        item.releaseDate
      );
      
      results.push(result);
      
      if (result.source === 'cache') cacheHits++;
      else if (result.source !== 'none') apiCalls++;
      
      onProgress?.(i + 1, items.length);
      
      // MusicBrainz 限速
      if (this.musicbrainz && result.source !== 'cache') {
        await new Promise(resolve => setTimeout(resolve, 1100));
      }
    }

    console.log(`[GenreService] Batch complete: ${cacheHits} cache hits, ${apiCalls} API calls`);
    return results;
  }
}

// ============ 便捷函数 ============

function createServiceFromEnv(): CachedGenreService {
  const config: ServiceConfig = {};

  if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    config.spotify = {
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    };
  }

  config.musicbrainz = {
    appName: process.env.MUSICBRAINZ_APP_NAME || 'MidAI',
    appVersion: process.env.MUSICBRAINZ_APP_VERSION || '1.0.0',
    contactInfo: process.env.MUSICBRAINZ_CONTACT || 'hello@example.com',
  };

  return new CachedGenreService(config);
}

// 单例实例
let serviceInstance: CachedGenreService | null = null;

function getService(): CachedGenreService {
  if (!serviceInstance) {
    serviceInstance = createServiceFromEnv();
  }
  return serviceInstance;
}

// ============ 导出函数 ============

export async function getGenresWithCache(
  trackName: string,
  artistName: string,
  albumName?: string,
  releaseDate?: string | null,
  skipCache?: boolean
): Promise<GenreResult> {
  return getService().getGenres(trackName, artistName, albumName, releaseDate, skipCache);
}

export async function getGenresBatch(
  items: Array<{
    trackName: string;
    artistName: string;
    albumName?: string;
    releaseDate?: string | null;
  }>,
  onProgress?: (current: number, total: number) => void
): Promise<GenreResult[]> {
  return getService().getGenresBatch(items, onProgress);
}

export { CachedGenreService };
