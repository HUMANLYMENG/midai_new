import axios from 'axios';

// ============ 类型定义 ============

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string; uri: string }>;
  album: {
    id: string;
    name: string;
    album_type: string;
    release_date: string;
    total_tracks: number;
    images: Array<{ url: string; width: number; height: number }>;
  };
  duration_ms: number;
  duration: string; // 格式化后的时长
  track_number: number;
  disc_number: number;
  explicit: boolean;
  popularity?: number;
  preview_url: string | null;
  external_urls: { spotify: string };
  uri: string;
  is_local: boolean;
  is_playable?: boolean;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  owner: {
    id: string;
    display_name: string | null;
    uri: string;
  };
  tracks: {
    total: number;
    items: Array<{
      added_at: string;
      added_by: { id: string } | null;
      track: SpotifyTrack | null;
    }>;
  };
  followers: { total: number };
  public: boolean | null;
  collaborative: boolean;
  images: Array<{ url: string; width: number; height: number }>;
  external_urls: { spotify: string };
  uri: string;
}

export interface SpotifyParseResult {
  success: boolean;
  type: 'track' | 'playlist' | 'album' | 'artist';
  data?: SpotifyTrack | SpotifyPlaylist | any;
  error?: string;
}

// ============ Spotify 解析器 ============

export class SpotifyParser {
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

  /**
   * 解析 Spotify 链接
   */
  async parse(url: string): Promise<SpotifyParseResult> {
    try {
      const parsed = this.parseSpotifyUrl(url);
      if (!parsed) {
        return { success: false, type: 'track', error: 'Invalid Spotify URL' };
      }

      const token = await this.getAccessToken();

      switch (parsed.type) {
        case 'track':
          return await this.getTrack(parsed.id, token);
        case 'playlist':
          return await this.getPlaylist(parsed.id, token);
        case 'album':
          return await this.getAlbum(parsed.id, token);
        case 'artist':
          return await this.getArtist(parsed.id, token);
        default:
          return { success: false, type: 'track', error: 'Unsupported Spotify URL type' };
      }
    } catch (error: any) {
      console.error('[SpotifyParser] Error:', error);
      return {
        success: false,
        type: 'track',
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * 解析 Spotify URL
   */
  private parseSpotifyUrl(url: string): { type: string; id: string } | null {
    // 支持多种格式:
    // https://open.spotify.com/track/xxx
    // https://open.spotify.com/playlist/xxx
    // https://open.spotify.com/album/xxx
    // https://open.spotify.com/artist/xxx
    // spotify:track:xxx
    
    const patterns = [
      { regex: /spotify\.com\/(track|playlist|album|artist)\/([a-zA-Z0-9]+)/, typeIndex: 1, idIndex: 2 },
      { regex: /spotify:(track|playlist|album|artist):([a-zA-Z0-9]+)/, typeIndex: 1, idIndex: 2 },
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern.regex);
      if (match) {
        return {
          type: match[pattern.typeIndex],
          id: match[pattern.idIndex],
        };
      }
    }

    return null;
  }

  private async getTrack(id: string, token: string): Promise<SpotifyParseResult> {
    const res = await axios.get(`https://api.spotify.com/v1/tracks/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    return {
      success: true,
      type: 'track',
      data: this.formatTrack(res.data),
    };
  }

  private async getPlaylist(id: string, token: string): Promise<SpotifyParseResult> {
    // 获取歌单基本信息
    const playlistRes = await axios.get(`https://api.spotify.com/v1/playlists/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { fields: 'id,name,description,owner,followers,public,collaborative,images,external_urls,uri,tracks(total)' },
    });

    const playlist = playlistRes.data;

    // 获取歌单歌曲（分页获取前100首）
    let allTracks: any[] = [];
    let offset = 0;
    const limit = 100;
    const maxTracks = 500; // 最多获取500首

    while (offset < Math.min(playlist.tracks.total, maxTracks)) {
      try {
        const tracksRes = await axios.get(`https://api.spotify.com/v1/playlists/${id}/tracks`, {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { limit, offset, fields: 'items(added_at,added_by,track(id,name,artists,album,duration_ms,explicit,preview_url,external_urls,uri,track_number,disc_number))' },
        });

        const items = tracksRes.data.items || [];
        if (items.length === 0) break;

        allTracks = allTracks.concat(items);
        offset += limit;

        // 小延迟避免触发限制
        if (offset < Math.min(playlist.tracks.total, maxTracks)) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        // 如果获取歌曲失败，继续返回歌单基本信息
        console.warn('[SpotifyParser] Failed to fetch playlist tracks:', error);
        break;
      }
    }

    return {
      success: true,
      type: 'playlist',
      data: {
        ...playlist,
        tracks: {
          total: playlist.tracks.total,
          items: allTracks.map(item => ({
            added_at: item.added_at,
            added_by: item.added_by,
            track: item.track ? this.formatTrack(item.track) : null,
          })),
        },
      },
    };
  }

  private async getAlbum(id: string, token: string): Promise<SpotifyParseResult> {
    const res = await axios.get(`https://api.spotify.com/v1/albums/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    return {
      success: true,
      type: 'album',
      data: res.data,
    };
  }

  private async getArtist(id: string, token: string): Promise<SpotifyParseResult> {
    const res = await axios.get(`https://api.spotify.com/v1/artists/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    return {
      success: true,
      type: 'artist',
      data: res.data,
    };
  }

  private formatDuration(ms: number): string {
    const mins = Math.floor(ms / 1000 / 60);
    const secs = Math.floor(ms / 1000 % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  private formatTrack(track: any): SpotifyTrack {
    return {
      ...track,
      duration: this.formatDuration(track.duration_ms),
    };
  }
}

// 便捷函数
export async function parseSpotifyUrl(url: string): Promise<SpotifyParseResult> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      success: false,
      type: 'track',
      error: 'Spotify credentials not configured',
    };
  }

  const parser = new SpotifyParser(clientId, clientSecret);
  return parser.parse(url);
}
