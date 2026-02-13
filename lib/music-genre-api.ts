/**
 * 音乐流派信息获取 API 封装
 * 支持 Spotify API 和 MusicBrainz API
 * 
 * 使用方法:
 * 1. Spotify API: 需要申请开发者账号获取 CLIENT_ID 和 CLIENT_SECRET
 * 2. MusicBrainz API: 开放 API，但需要设置 User-Agent
 */

// ==================== Spotify API ====================

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
  };
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
}

interface SpotifyArtist {
  id: string;
  name: string;
  genres?: string[];
}

interface SpotifyAlbum {
  id: string;
  name: string;
  genres?: string[];
}

interface SpotifyArtistDetail {
  id: string;
  name: string;
  genres: string[];
}

export class SpotifyGenreClient {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * 获取 OAuth Access Token (Client Credentials Flow)
   * 这是 Spotify 的 Client Credentials 流程，不需要用户登录
   * 适用于服务器到服务器的 API 调用
   */
  async getAccessToken(): Promise<string> {
    // 如果 token 还没过期，直接返回
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.status} ${await response.text()}`);
    }

    const data: SpotifyTokenResponse = await response.json();
    this.accessToken = data.access_token;
    // 提前 60 秒过期，避免边界情况
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    
    return this.accessToken;
  }

  /**
   * 搜索歌曲
   */
  async searchTrack(trackName: string, artistName?: string): Promise<SpotifyTrack | null> {
    const token = await this.getAccessToken();
    
    let query = trackName;
    if (artistName) {
      query = `${trackName} artist:${artistName}`;
    }

    const params = new URLSearchParams({
      q: query,
      type: 'track',
      limit: '1',
    });

    const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`Rate limited. Retry after ${retryAfter} seconds`);
      }
      throw new Error(`Search failed: ${response.status} ${await response.text()}`);
    }

    const data: SpotifySearchResponse = await response.json();
    return data.tracks.items[0] || null;
  }

  /**
   * 获取艺术家详情（包含流派信息）
   */
  async getArtistGenres(artistId: string): Promise<string[]> {
    const token = await this.getAccessToken();

    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`Rate limited. Retry after ${retryAfter} seconds`);
      }
      throw new Error(`Get artist failed: ${response.status} ${await response.text()}`);
    }

    const data: SpotifyArtistDetail = await response.json();
    return data.genres || [];
  }

  /**
   * 获取歌曲的所有艺术家流派（合并）
   */
  async getTrackGenres(trackName: string, artistName?: string): Promise<{
    track: string;
    artists: string[];
    genres: string[];
    source: 'spotify';
  } | null> {
    const track = await this.searchTrack(trackName, artistName);
    if (!track) return null;

    // 收集所有艺术家的流派
    const allGenres = new Set<string>();
    for (const artist of track.artists) {
      try {
        const genres = await this.getArtistGenres(artist.id);
        genres.forEach(g => allGenres.add(g));
      } catch (e) {
        console.warn(`Failed to get genres for artist ${artist.name}:`, e);
      }
    }

    return {
      track: track.name,
      artists: track.artists.map(a => a.name),
      genres: Array.from(allGenres),
      source: 'spotify',
    };
  }

  /**
   * 批量获取多个歌曲的流派信息
   */
  async getMultipleTrackGenres(tracks: { name: string; artist?: string }[]): Promise<
    Array<{
      track: string;
      artists: string[];
      genres: string[];
      source: 'spotify';
    } | null>
  > {
    const results = [];
    for (const track of tracks) {
      try {
        const result = await this.getTrackGenres(track.name, track.artist);
        results.push(result);
      } catch (e) {
        console.error(`Failed to get genres for ${track.name}:`, e);
        results.push(null);
      }
    }
    return results;
  }
}


// ==================== MusicBrainz API ====================

interface MusicBrainzRecording {
  id: string;
  title: string;
  'artist-credit'?: Array<{
    name: string;
    artist: {
      id: string;
      name: string;
    };
  }>;
  releases?: MusicBrainzRelease[];
  tags?: Array<{ name: string; count: number }>;
  genres?: Array<{ name: string; count: number }>;
}

interface MusicBrainzRelease {
  id: string;
  title: string;
  'release-group'?: {
    id: string;
    title: string;
    'primary-type'?: string;
    'secondary-types'?: string[];
  };
  tags?: Array<{ name: string; count: number }>;
  genres?: Array<{ name: string; count: number }>;
}

interface MusicBrainzArtist {
  id: string;
  name: string;
  tags?: Array<{ name: string; count: number }>;
  genres?: Array<{ name: string; count: number }>;
}

interface MusicBrainzSearchResponse {
  recordings?: MusicBrainzRecording[];
  releases?: MusicBrainzRelease[];
  artists?: MusicBrainzArtist[];
}

export class MusicBrainzGenreClient {
  private baseUrl = 'https://musicbrainz.org/ws/2';
  private appName: string;
  private appVersion: string;
  private contactInfo: string;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 1100; // 1.1 秒，确保不超过 1 req/sec 限制

  constructor(appName: string, appVersion: string, contactInfo: string) {
    this.appName = appName;
    this.appVersion = appVersion;
    this.contactInfo = contactInfo;
  }

  /**
   * 构建 User-Agent 头
   */
  private getUserAgent(): string {
    return `${this.appName}/${this.appVersion} (${this.contactInfo})`;
  }

  /**
   * 速率限制：确保请求间隔至少 1 秒
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * 发送 API 请求
   */
  private async request<T>(endpoint: string): Promise<T> {
    await this.rateLimit();

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.getUserAgent(),
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 503) {
        throw new Error('Rate limited by MusicBrainz. Please wait before retrying.');
      }
      throw new Error(`MusicBrainz API error: ${response.status} ${await response.text()}`);
    }

    return response.json();
  }

  /**
   * 搜索录音（歌曲）
   */
  async searchRecording(trackName: string, artistName?: string): Promise<MusicBrainzRecording | null> {
    let query = trackName;
    if (artistName) {
      query = `${trackName} AND artist:"${artistName}"`;
    }

    const params = new URLSearchParams({
      query: query,
      fmt: 'json',
      limit: '5',
    });

    const data = await this.request<MusicBrainzSearchResponse>(`/recording?${params}`);
    return data.recordings?.[0] || null;
  }

  /**
   * 获取录音详情（包含标签和流派）
   */
  async getRecordingDetails(recordingId: string): Promise<MusicBrainzRecording | null> {
    const params = new URLSearchParams({
      fmt: 'json',
      inc: 'tags+genres+artists+releases', // 包含标签、流派、艺术家、发行信息
    });

    return this.request<MusicBrainzRecording>(`/recording/${recordingId}?${params}`);
  }

  /**
   * 搜索专辑
   */
  async searchRelease(albumName: string, artistName?: string): Promise<MusicBrainzRelease | null> {
    let query = albumName;
    if (artistName) {
      query = `${albumName} AND artist:"${artistName}"`;
    }

    const params = new URLSearchParams({
      query: query,
      fmt: 'json',
      limit: '5',
    });

    const data = await this.request<MusicBrainzSearchResponse>(`/release?${params}`);
    return data.releases?.[0] || null;
  }

  /**
   * 获取专辑详情（包含标签和流派）
   */
  async getReleaseDetails(releaseId: string): Promise<MusicBrainzRelease | null> {
    const params = new URLSearchParams({
      fmt: 'json',
      inc: 'tags+genres+artists',
    });

    return this.request<MusicBrainzRelease>(`/release/${releaseId}?${params}`);
  }

  /**
   * 获取艺术家详情（包含标签和流派）
   */
  async getArtistDetails(artistId: string): Promise<MusicBrainzArtist | null> {
    const params = new URLSearchParams({
      fmt: 'json',
      inc: 'tags+genres',
    });

    return this.request<MusicBrainzArtist>(`/artist/${artistId}?${params}`);
  }

  /**
   * 获取歌曲的流派信息
   */
  async getTrackGenres(trackName: string, artistName?: string): Promise<{
    track: string;
    artists: string[];
    genres: string[];
    source: 'musicbrainz';
    confidence: { [genre: string]: number };
  } | null> {
    const recording = await this.searchRecording(trackName, artistName);
    if (!recording) return null;

    // 获取详细信息以获取标签
    const details = await this.getRecordingDetails(recording.id);
    if (!details) return null;

    // 收集流派信息
    const genreConfidence: { [genre: string]: number } = {};
    
    // 从录音本身获取流派
    details.genres?.forEach(g => {
      genreConfidence[g.name] = (genreConfidence[g.name] || 0) + g.count;
    });

    // 从录音标签推断流派
    details.tags?.forEach(t => {
      if (this.isGenreTag(t.name)) {
        genreConfidence[t.name] = (genreConfidence[t.name] || 0) + t.count;
      }
    });

    // 获取艺术家的流派信息
    const artists = details['artist-credit'] || [];
    for (const credit of artists) {
      const artistDetails = await this.getArtistDetails(credit.artist.id);
      artistDetails?.genres?.forEach(g => {
        genreConfidence[g.name] = (genreConfidence[g.name] || 0) + g.count * 0.5; // 艺术家流派权重较低
      });
    }

    // 排序并过滤
    const sortedGenres = Object.entries(genreConfidence)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, count]) => count > 0);

    return {
      track: details.title,
      artists: artists.map(a => a.name),
      genres: sortedGenres.map(([g]) => g),
      source: 'musicbrainz',
      confidence: Object.fromEntries(sortedGenres),
    };
  }

  /**
   * 获取专辑的流派信息
   */
  async getAlbumGenres(albumName: string, artistName?: string): Promise<{
    album: string;
    artists: string[];
    genres: string[];
    source: 'musicbrainz';
    confidence: { [genre: string]: number };
  } | null> {
    const release = await this.searchRelease(albumName, artistName);
    if (!release) return null;

    const details = await this.getReleaseDetails(release.id);
    if (!details) return null;

    const genreConfidence: { [genre: string]: number } = {};
    
    details.genres?.forEach(g => {
      genreConfidence[g.name] = (genreConfidence[g.name] || 0) + g.count;
    });

    details.tags?.forEach(t => {
      if (this.isGenreTag(t.name)) {
        genreConfidence[t.name] = (genreConfidence[t.name] || 0) + t.count;
      }
    });

    const sortedGenres = Object.entries(genreConfidence)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, count]) => count > 0);

    return {
      album: details.title,
      artists: [], // 可以从 release 中解析
      genres: sortedGenres.map(([g]) => g),
      source: 'musicbrainz',
      confidence: Object.fromEntries(sortedGenres),
    };
  }

  /**
   * 简单的流派标签判断
   */
  private isGenreTag(tag: string): boolean {
    // 常见流派关键词
    const genreKeywords = [
      'rock', 'pop', 'jazz', 'classical', 'hip hop', 'rap', 'electronic',
      'blues', 'country', 'folk', 'metal', 'punk', 'indie', 'alternative',
      'r&b', 'soul', 'funk', 'reggae', 'latin', 'world', 'ambient',
      'dance', 'house', 'techno', 'trance', 'disco', 'synth-pop',
    ];
    
    const lowerTag = tag.toLowerCase();
    return genreKeywords.some(k => lowerTag.includes(k));
  }
}


// ==================== 统一接口 ====================

export interface GenreResult {
  track?: string;
  album?: string;
  artists: string[];
  genres: string[];
  source: 'spotify' | 'musicbrainz';
  confidence?: { [genre: string]: number };
}

export class MusicGenreService {
  private spotify?: SpotifyGenreClient;
  private musicbrainz: MusicBrainzGenreClient;

  constructor(config: {
    spotify?: { clientId: string; clientSecret: string };
    musicbrainz: { appName: string; appVersion: string; contactInfo: string };
  }) {
    if (config.spotify) {
      this.spotify = new SpotifyGenreClient(
        config.spotify.clientId,
        config.spotify.clientSecret
      );
    }
    this.musicbrainz = new MusicBrainzGenreClient(
      config.musicbrainz.appName,
      config.musicbrainz.appVersion,
      config.musicbrainz.contactInfo
    );
  }

  /**
   * 获取歌曲流派（优先使用 Spotify，失败时回退到 MusicBrainz）
   */
  async getTrackGenres(
    trackName: string,
    artistName?: string,
    options: { prefer?: 'spotify' | 'musicbrainz' } = {}
  ): Promise<GenreResult | null> {
    const { prefer = 'spotify' } = options;

    // 根据偏好选择 API
    const providers = prefer === 'spotify' 
      ? [this.spotify, this.musicbrainz]
      : [this.musicbrainz, this.spotify];

    for (const provider of providers) {
      if (!provider) continue;

      try {
        if (provider instanceof SpotifyGenreClient) {
          const result = await provider.getTrackGenres(trackName, artistName);
          if (result && result.genres.length > 0) {
            return result;
          }
        } else {
          const result = await provider.getTrackGenres(trackName, artistName);
          if (result && result.genres.length > 0) {
            return result;
          }
        }
      } catch (e) {
        console.warn(`Provider ${provider.constructor.name} failed:`, e);
        continue;
      }
    }

    return null;
  }

  /**
   * 获取专辑流派
   */
  async getAlbumGenres(
    albumName: string,
    artistName?: string
  ): Promise<GenreResult | null> {
    // 目前只有 MusicBrainz 支持专辑流派查询
    try {
      const result = await this.musicbrainz.getAlbumGenres(albumName, artistName);
      if (result) {
        return result;
      }
    } catch (e) {
      console.warn('MusicBrainz album genre fetch failed:', e);
    }

    return null;
  }
}

export default MusicGenreService;
