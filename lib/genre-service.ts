import axios from 'axios';

// ============ 类型定义 ============

export interface GenreServiceConfig {
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

export interface TrackGenresResult {
  track: string;
  artists: string[];
  album?: string;
  genres: string[];
  source: 'spotify' | 'musicbrainz' | 'none';
  confidence: number;
  rawData?: any;
}

// ============ MusicBrainz API (主要来源) ============

class MusicBrainzAPI {
  private userAgent: string;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 1100;

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

  async searchRecording(trackName: string, artistName: string): Promise<TrackGenresResult | null> {
    await this.rateLimit();

    try {
      // 搜索录音
      const query = `recording:"${trackName}" AND artist:"${artistName}"`;
      const searchRes = await axios.get('https://musicbrainz.org/ws/2/recording', {
        headers: { 'User-Agent': this.userAgent },
        params: { query, fmt: 'json', limit: 5 },
      });

      const recordings = searchRes.data.recordings;
      if (!recordings || recordings.length === 0) {
        return this.looseSearch(trackName, artistName);
      }

      return await this.getRecordingDetails(recordings[0].id, recordings[0]);
    } catch (error) {
      console.error('[MusicBrainz] Search error:', error);
      return null;
    }
  }

  private async looseSearch(trackName: string, artistName: string): Promise<TrackGenresResult | null> {
    await this.rateLimit();

    try {
      const query = `${trackName} ${artistName}`;
      const searchRes = await axios.get('https://musicbrainz.org/ws/2/recording', {
        headers: { 'User-Agent': this.userAgent },
        params: { query, fmt: 'json', limit: 3 },
      });

      const recordings = searchRes.data.recordings;
      if (!recordings || recordings.length === 0) return null;

      return await this.getRecordingDetails(recordings[0].id, recordings[0]);
    } catch (error) {
      return null;
    }
  }

  private async getRecordingDetails(recordingId: string, recordingData: any): Promise<TrackGenresResult> {
    await this.rateLimit();

    try {
      const detailRes = await axios.get(`https://musicbrainz.org/ws/2/recording/${recordingId}`, {
        headers: { 'User-Agent': this.userAgent },
        params: {
          fmt: 'json',
          inc: 'artists+releases+tags+genres+ratings',
        },
      });

      const data = detailRes.data;
      const genres = this.extractGenres(data);
      
      // 获取专辑流派
      if (data.releases?.[0]) {
        await this.addReleaseGenres(data.releases[0].id, genres);
      }

      return {
        track: data.title,
        artists: data['artist-credit']?.map((ac: any) => ac.name) || [],
        album: data.releases?.[0]?.title,
        genres: Array.from(genres),
        source: 'musicbrainz',
        confidence: this.calculateConfidence(data, recordingData),
        rawData: data,
      };
    } catch (error) {
      // 使用搜索结果中的基本信息
      return {
        track: recordingData.title,
        artists: recordingData['artist-credit']?.map((ac: any) => ac.name) || [],
        genres: recordingData.tags?.map((t: any) => t.name.toLowerCase()) || [],
        source: 'musicbrainz',
        confidence: 0.5,
      };
    }
  }

  private extractGenres(data: any): Set<string> {
    const genres = new Set<string>();
    
    // 从录音获取
    data.tags?.forEach((tag: any) => genres.add(tag.name.toLowerCase()));
    data.genres?.forEach((genre: any) => genres.add(genre.name.toLowerCase()));

    // 从艺术家获取
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

  private calculateConfidence(data: any, originalData: any): number {
    let score = 0.5;
    if (data.tags?.length > 0 || data.genres?.length > 0) score += 0.2;
    if (data.releases?.length > 0) score += 0.1;
    if (data.rating?.value) score += 0.2;
    return Math.min(score, 1.0);
  }
}

// ============ Spotify API (备用) ============

class SpotifyAPI {
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

  async searchTrack(trackName: string, artistName: string): Promise<TrackGenresResult | null> {
    try {
      const token = await this.getAccessToken();
      
      const query = `track:${trackName} artist:${artistName}`;
      const searchRes = await axios.get('https://api.spotify.com/v1/search', {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { q: query, type: 'track', limit: 1 },
      });

      const track = searchRes.data.tracks?.items?.[0];
      if (!track) {
        // 宽松搜索
        const looseRes = await axios.get('https://api.spotify.com/v1/search', {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { q: `${trackName} ${artistName}`, type: 'track', limit: 1 },
        });
        const looseTrack = looseRes.data.tracks?.items?.[0];
        if (!looseTrack) return null;
        return this.getTrackGenres(looseTrack);
      }

      return this.getTrackGenres(track);
    } catch (error) {
      console.error('[Spotify] Search error:', error);
      return null;
    }
  }

  private async getTrackGenres(track: any): Promise<TrackGenresResult> {
    // 注意: 当前Spotify API在Client Credentials Flow下可能不返回genres
    // 保留此代码以备将来使用
    
    return {
      track: track.name,
      artists: track.artists.map((a: any) => a.name),
      album: track.album?.name,
      genres: [], // Spotify当前不返回流派
      source: 'spotify',
      confidence: 0.5,
      rawData: track,
    };
  }
}

// ============ 统一流派服务 ============

export class GenreService {
  private spotify?: SpotifyAPI;
  private musicbrainz?: MusicBrainzAPI;

  constructor(config?: GenreServiceConfig) {
    if (config?.spotify) {
      this.spotify = new SpotifyAPI(config.spotify.clientId, config.spotify.clientSecret);
    }
    if (config?.musicbrainz) {
      this.musicbrainz = new MusicBrainzAPI(
        config.musicbrainz.appName,
        config.musicbrainz.appVersion,
        config.musicbrainz.contactInfo
      );
    }
  }

  /**
   * 获取曲目流派（优先使用 MusicBrainz）
   */
  async getTrackGenres(
    trackName: string,
    artistName: string,
    prefer: 'musicbrainz' | 'spotify' | 'auto' = 'musicbrainz'
  ): Promise<TrackGenresResult | null> {
    
    // 默认优先使用 MusicBrainz（因为其流派数据更丰富可靠）
    if (prefer === 'musicbrainz' || prefer === 'auto') {
      if (this.musicbrainz) {
        const result = await this.musicbrainz.searchRecording(trackName, artistName);
        if (result && result.genres.length > 0) {
          return result;
        }
      }
    }

    // 备用: Spotify（当前可能不返回流派）
    if (this.spotify && (prefer === 'spotify' || prefer === 'auto')) {
      const result = await this.spotify.searchTrack(trackName, artistName);
      if (result && result.genres.length > 0) {
        return result;
      }
    }

    // 如果都没找到，返回空结果
    return {
      track: trackName,
      artists: [artistName],
      genres: [],
      source: 'none',
      confidence: 0,
    };
  }

  /**
   * 批量获取流派
   */
  async getMultipleGenres(
    tracks: Array<{ name: string; artist: string }>,
    options?: { 
      prefer?: 'musicbrainz' | 'spotify' | 'auto';
      onProgress?: (current: number, total: number) => void;
    }
  ): Promise<(TrackGenresResult | null)[]> {
    const results: (TrackGenresResult | null)[] = [];

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const result = await this.getTrackGenres(track.name, track.artist, options?.prefer);
      results.push(result);
      
      options?.onProgress?.(i + 1, tracks.length);
      
      // MusicBrainz 限速
      if (this.musicbrainz) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }
}

// ============ 便捷函数 ============

export function createGenreServiceFromEnv(): GenreService {
  const config: GenreServiceConfig = {};

  if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    config.spotify = {
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    };
  }

  if (process.env.MUSICBRAINZ_APP_NAME) {
    config.musicbrainz = {
      appName: process.env.MUSICBRAINZ_APP_NAME,
      appVersion: process.env.MUSICBRAINZ_APP_VERSION || '1.0.0',
      contactInfo: process.env.MUSICBRAINZ_CONTACT || 'admin@localhost',
    };
  } else {
    // 使用默认值
    config.musicbrainz = {
      appName: 'MidAI',
      appVersion: '1.0.0',
      contactInfo: 'hello@example.com',
    };
  }

  return new GenreService(config);
}

export async function getTrackGenres(
  trackName: string,
  artistName: string,
  prefer: 'musicbrainz' | 'spotify' | 'auto' = 'musicbrainz'
): Promise<string[]> {
  const service = createGenreServiceFromEnv();
  const result = await service.getTrackGenres(trackName, artistName, prefer);
  return result?.genres || [];
}
