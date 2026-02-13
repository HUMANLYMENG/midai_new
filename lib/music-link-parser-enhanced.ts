/**
 * 增强版音乐链接解析器
 * 集成流派服务（Spotify + MusicBrainz）
 */

import { MusicLinkParser, ParseResult } from './music-link-parser';
import { GenreService, createGenreServiceFromEnv, TrackGenresResult } from './genre-service';

export interface EnhancedSongInfo {
  id: string;
  name: string;
  artists: string[];
  album: string;
  albumId?: string;
  duration?: string;
  genre?: string;           // 来自QQ/网易云
  genreExternal?: string[]; // 来自Spotify/MusicBrainz
  year?: string;
  language?: string;
}

export interface EnhancedParseResult extends ParseResult {
  data?: {
    id: string;
    name: string;
    artists?: string[];
    album?: string;
    albumId?: string;
    albumCover?: string;
    creator?: string;
    description?: string;
    cover?: string;
    songCount?: number;
    songs?: EnhancedSongInfo[];
    genres?: string[];
    tags?: string[];
    url: string;
    // 增强：流派统计
    genreStats?: {
      fromPlatform: Record<string, number>;     // 来自QQ/网易云的流派
      fromExternal: Record<string, number>;     // 来自Spotify/MusicBrainz的流派
    };
  };
}

export class EnhancedMusicLinkParser {
  private baseParser: MusicLinkParser;
  private genreService: GenreService;

  constructor() {
    this.baseParser = new MusicLinkParser();
    this.genreService = createGenreServiceFromEnv();
  }

  /**
   * 解析链接并获取增强流派信息
   * @param url 音乐分享链接
   * @param options.enhanceGenres 是否使用外部API增强流派信息
   * @param options.limitEnhanced 限制增强流派查询的歌曲数量（避免API限制）
   */
  async parse(
    url: string,
    options: {
      enhanceGenres?: boolean;
      limitEnhanced?: number;
      preferGenreSource?: 'spotify' | 'musicbrainz' | 'auto';
    } = {}
  ): Promise<EnhancedParseResult> {
    const { enhanceGenres = false, limitEnhanced = 10, preferGenreSource = 'auto' } = options;

    // 1. 基础解析
    const baseResult = await this.baseParser.parse(url);
    
    if (!baseResult.success || !baseResult.data) {
      return baseResult as EnhancedParseResult;
    }

    // 2. 如果不增强流派，直接返回基础结果
    if (!enhanceGenres || !baseResult.data.songs || baseResult.data.songs.length === 0) {
      return baseResult as EnhancedParseResult;
    }

    // 3. 增强流派信息
    console.log(`[EnhancedParser] 开始增强流派信息，最多处理 ${limitEnhanced} 首歌曲...`);
    
    const songs = baseResult.data.songs;
    const songsToEnhance = songs.slice(0, limitEnhanced);
    
    // 批量查询外部流派
    const enhancedSongs: EnhancedSongInfo[] = [];
    const externalGenreStats: Record<string, number> = {};

    for (let i = 0; i < songsToEnhance.length; i++) {
      const song = songsToEnhance[i];
      console.log(`[EnhancedParser] 查询 ${i + 1}/${songsToEnhance.length}: ${song.name} - ${song.artists.join(', ')}`);

      const genreResult = await this.genreService.getTrackGenres(
        song.name,
        song.artists[0] || '',
        preferGenreSource
      );

      // 统计外部流派
      genreResult?.genres.forEach(g => {
        externalGenreStats[g] = (externalGenreStats[g] || 0) + 1;
      });

      enhancedSongs.push({
        ...song,
        genreExternal: genreResult?.genres,
      });

      // 小延迟避免触发速率限制
      if (i < songsToEnhance.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // 4. 合并结果
    const allSongs = [...enhancedSongs, ...songs.slice(limitEnhanced)];

    // 5. 统计平台流派
    const platformGenreStats: Record<string, number> = {};
    songs.forEach(s => {
      if (s.genre) {
        platformGenreStats[s.genre] = (platformGenreStats[s.genre] || 0) + 1;
      }
    });

    return {
      ...baseResult,
      data: {
        ...baseResult.data,
        songs: allSongs,
        genreStats: {
          fromPlatform: platformGenreStats,
          fromExternal: externalGenreStats,
        },
      },
    };
  }

  /**
   * 单独获取一首歌的流派（用于单曲链接）
   */
  async getTrackGenres(
    trackName: string,
    artistName: string,
    prefer: 'spotify' | 'musicbrainz' | 'auto' = 'auto'
  ): Promise<TrackGenresResult | null> {
    return this.genreService.getTrackGenres(trackName, artistName, prefer);
  }
}

// 便捷函数
export async function parseMusicLinkEnhanced(
  url: string,
  options?: {
    enhanceGenres?: boolean;
    limitEnhanced?: number;
    preferGenreSource?: 'spotify' | 'musicbrainz' | 'auto';
  }
): Promise<EnhancedParseResult> {
  const parser = new EnhancedMusicLinkParser();
  return parser.parse(url, options);
}
