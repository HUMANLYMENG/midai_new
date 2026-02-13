/**
 * AcousticBrainz API 客户端
 * 用于获取歌曲的 Tempo (BPM)、Key (调性) 和其他音频特征
 * API 文档: https://acousticbrainz.org/essentia-at-a-glance
 * 
 * AcousticBrainz 是 MusicBrainz 的姊妹项目，提供音乐音频分析数据
 * 完全免费，无需 API Key
 */

// ==================== 类型定义 ====================

export interface AcousticBrainzFeatures {
  tonal: {
    key_key: string;           // 调性，如 "C"
    key_scale: string;         // 调式，如 "minor", "major"
    chords_key: string;
    chords_scale: string;
  };
  rhythm: {
    bpm: number;               // BPM/Tempo
    beats_count: number;
  };
  lowlevel: {
    average_loudness: number;
    dynamic_complexity: number;
  };
  metadata: {
    audio_properties: {
      length: number;          // 歌曲时长（秒）
      bitrate: number;
    };
    tags: {
      title?: string[];
      artist?: string[];
      album?: string[];
    };
  };
}

export interface SongAudioFeatures {
  mbid: string;                // MusicBrainz ID
  title: string;
  artist: string;
  bpm: number;
  key: string;
  scale: string;
  duration: number;
}

// ==================== API 客户端 ====================

export class AcousticBrainzClient {
  private baseUrl = 'https://acousticbrainz.org/api/v1';
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 1000; // 1 秒速率限制

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
  private async request<T>(endpoint: string): Promise<T | null> {
    await this.rateLimit();

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`No AcousticBrainz data found for: ${endpoint}`);
          return null;
        }
        if (response.status === 429) {
          throw new Error('Rate limited by AcousticBrainz. Please wait before retrying.');
        }
        console.error(`AcousticBrainz API error: ${response.status} ${await response.text()}`);
        return null;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      console.error('AcousticBrainz API request failed:', error);
      return null;
    }
  }

  /**
   * 通过 MusicBrainz ID 获取音频特征
   */
  async getFeaturesByMBID(mbid: string): Promise<AcousticBrainzFeatures | null> {
    const data = await this.request<AcousticBrainzFeatures>(`/${mbid}/low-level`);
    return data;
  }

  /**
   * 提取歌曲信息
   */
  extractSongInfo(mbid: string, features: AcousticBrainzFeatures): SongAudioFeatures {
    const key = features.tonal?.key_key || 'Unknown';
    const scale = features.tonal?.key_scale || 'Unknown';
    
    return {
      mbid,
      title: features.metadata?.tags?.title?.[0] || 'Unknown',
      artist: features.metadata?.tags?.artist?.[0] || 'Unknown',
      bpm: Math.round(features.rhythm?.bpm || 0),
      key: `${key} ${scale}`,
      scale: scale,
      duration: features.metadata?.audio_properties?.length || 0,
    };
  }

  /**
   * 通过 MusicBrainz ID 获取歌曲信息
   */
  async getSongInfo(mbid: string): Promise<SongAudioFeatures | null> {
    const features = await this.getFeaturesByMBID(mbid);
    if (!features) return null;
    
    return this.extractSongInfo(mbid, features);
  }

  /**
   * 批量获取歌曲信息
   */
  async getMultipleSongInfo(mbids: string[]): Promise<(SongAudioFeatures | null)[]> {
    const results: (SongAudioFeatures | null)[] = [];
    
    for (const mbid of mbids) {
      try {
        const info = await this.getSongInfo(mbid);
        results.push(info);
      } catch (error) {
        console.error(`Failed to get info for ${mbid}:`, error);
        results.push(null);
      }
    }
    
    return results;
  }
}

// ==================== 集成 MusicBrainz 搜索 ====================

// 复用项目中已有的 MusicBrainz 客户端逻辑
interface MusicBrainzRecording {
  id: string;
  title: string;
  'artist-credit'?: Array<{
    name: string;
    artist: { id: string; name: string };
  }>;
}

export class MusicAudioFeaturesClient {
  private acousticBrainz: AcousticBrainzClient;
  private musicBrainzBaseUrl = 'https://musicbrainz.org/ws/2';
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 1100;

  constructor(
    private appName: string = 'MidAI',
    private appVersion: string = '1.0.0',
    private contactInfo: string = 'hello@example.com'
  ) {
    this.acousticBrainz = new AcousticBrainzClient();
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * 搜索 MusicBrainz 录音
   */
  private async searchMusicBrainz(trackName: string, artistName?: string): Promise<MusicBrainzRecording | null> {
    await this.rateLimit();

    let query = trackName;
    if (artistName) {
      query = `${trackName} AND artist:"${artistName}"`;
    }

    const params = new URLSearchParams({
      query: query,
      fmt: 'json',
      limit: '5',
    });

    const url = `${this.musicBrainzBaseUrl}/recording?${params}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': `${this.appName}/${this.appVersion} (${this.contactInfo})`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`MusicBrainz search error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const recordings: MusicBrainzRecording[] = data.recordings || [];
      
      // 如果提供了艺人名，尝试找到匹配的
      if (artistName && recordings.length > 0) {
        const artistLower = artistName.toLowerCase();
        const match = recordings.find(r => 
          r['artist-credit']?.some(ac => 
            ac.name.toLowerCase() === artistLower || 
            ac.artist.name.toLowerCase() === artistLower
          )
        );
        if (match) return match;
      }
      
      return recordings[0] || null;
    } catch (error) {
      console.error('MusicBrainz search failed:', error);
      return null;
    }
  }

  /**
   * 通过歌曲名搜索并获取音频特征
   */
  async getTempoAndKey(trackName: string, artistName?: string): Promise<SongAudioFeatures | null> {
    // 1. 搜索 MusicBrainz 获取 MBID
    const recording = await this.searchMusicBrainz(trackName, artistName);
    if (!recording) {
      console.log(`No MusicBrainz recording found for: ${trackName}`);
      return null;
    }

    // 2. 使用 MBID 获取 AcousticBrainz 特征
    const features = await this.acousticBrainz.getFeaturesByMBID(recording.id);
    if (!features) {
      console.log(`No AcousticBrainz data found for MBID: ${recording.id}`);
      return null;
    }

    // 3. 组装结果
    return {
      mbid: recording.id,
      title: recording.title,
      artist: recording['artist-credit']?.[0]?.name || 'Unknown',
      bpm: Math.round(features.rhythm?.bpm || 0),
      key: `${features.tonal?.key_key || 'Unknown'} ${features.tonal?.key_scale || 'Unknown'}`,
      scale: features.tonal?.key_scale || 'Unknown',
      duration: features.metadata?.audio_properties?.length || 0,
    };
  }

  /**
   * 批量获取歌曲信息
   */
  async getMultipleTempoAndKey(
    tracks: { name: string; artist?: string }[]
  ): Promise<(SongAudioFeatures | null)[]> {
    const results: (SongAudioFeatures | null)[] = [];
    
    for (const track of tracks) {
      try {
        const info = await this.getTempoAndKey(track.name, track.artist);
        results.push(info);
      } catch (error) {
        console.error(`Failed to get info for ${track.name}:`, error);
        results.push(null);
      }
    }
    
    return results;
  }
}

// ==================== 便捷函数 ====================

let defaultClient: MusicAudioFeaturesClient | null = null;

export function initAudioFeaturesClient(
  appName?: string,
  appVersion?: string,
  contactInfo?: string
): MusicAudioFeaturesClient {
  defaultClient = new MusicAudioFeaturesClient(appName, appVersion, contactInfo);
  return defaultClient;
}

export function getAudioFeaturesClient(): MusicAudioFeaturesClient {
  if (!defaultClient) {
    // 尝试从环境变量获取配置
    defaultClient = new MusicAudioFeaturesClient(
      process.env.MUSICBRAINZ_APP_NAME,
      process.env.MUSICBRAINZ_APP_VERSION,
      process.env.MUSICBRAINZ_CONTACT
    );
  }
  return defaultClient;
}

export async function getTempoAndKey(
  trackName: string,
  artistName?: string
): Promise<SongAudioFeatures | null> {
  return getAudioFeaturesClient().getTempoAndKey(trackName, artistName);
}

export default MusicAudioFeaturesClient;
