/**
 * Music Genre API 使用示例
 * 
 * 运行方法:
 * 1. 设置环境变量:
 *    - SPOTIFY_CLIENT_ID
 *    - SPOTIFY_CLIENT_SECRET
 * 
 * 2. 运行: npx ts-node lib/music-genre-api.example.ts
 */

import { 
  SpotifyGenreClient, 
  MusicBrainzGenreClient, 
  MusicGenreService 
} from './music-genre-api.js';

// ==================== Spotify API 示例 ====================

async function spotifyExample() {
  console.log('=== Spotify API 示例 ===\n');

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.log('⚠️  未设置 SPOTIFY_CLIENT_ID 和 SPOTIFY_CLIENT_SECRET，跳过 Spotify 示例');
    console.log('   请前往 https://developer.spotify.com/dashboard 申请开发者账号\n');
    return;
  }

  const spotify = new SpotifyGenreClient(clientId, clientSecret);

  try {
    // 示例 1: 搜索歌曲并获取流派
    console.log('1. 搜索歌曲 "Bohemian Rhapsody" by "Queen":');
    const track = await spotify.searchTrack('Bohemian Rhapsody', 'Queen');
    console.log('   找到歌曲:', track?.name);
    console.log('   艺术家:', track?.artists.map(a => a.name).join(', '));

    if (track) {
      // 获取流派
      const genres = await spotify.getTrackGenres('Bohemian Rhapsody', 'Queen');
      console.log('   流派:', genres?.genres.join(', ') || '无');
    }

    console.log();

    // 示例 2: 批量获取多首歌曲的流派
    console.log('2. 批量获取流派信息:');
    const tracks = [
      { name: 'Shape of You', artist: 'Ed Sheeran' },
      { name: 'Blinding Lights', artist: 'The Weeknd' },
    ];

    for (const t of tracks) {
      const result = await spotify.getTrackGenres(t.name, t.artist);
      console.log(`   ${t.name} (${t.artist}): ${result?.genres.join(', ') || '无'}`);
    }

  } catch (error) {
    console.error('Spotify API 错误:', error);
  }

  console.log('\n');
}


// ==================== MusicBrainz API 示例 ====================

async function musicbrainzExample() {
  console.log('=== MusicBrainz API 示例 ===\n');

  const mb = new MusicBrainzGenreClient(
    'MyMusicApp',      // 你的应用名称
    '1.0.0',           // 版本号
    'you@example.com'  // 联系方式
  );

  try {
    // 示例 1: 搜索录音（歌曲）
    console.log('1. 搜索录音 "Hotel California" by "Eagles":');
    const recording = await mb.searchRecording('Hotel California', 'Eagles');
    console.log('   找到录音:', recording?.title);
    console.log('   ID:', recording?.id);

    // 示例 2: 获取录音详情（包含流派）
    if (recording) {
      console.log('\n2. 获取录音详情和流派:');
      const details = await mb.getRecordingDetails(recording.id);
      console.log('   流派:', details?.genres?.map(g => g.name).join(', ') || '无');
      console.log('   标签:', details?.tags?.map(t => t.name).join(', ') || '无');
    }

    console.log();

    // 示例 3: 获取歌曲流派（完整流程）
    console.log('3. 获取歌曲流派（完整流程）:');
    const genres = await mb.getTrackGenres('Hotel California', 'Eagles');
    if (genres) {
      console.log('   歌曲:', genres.track);
      console.log('   艺术家:', genres.artists.join(', '));
      console.log('   流派:', genres.genres.join(', '));
      console.log('   置信度:', genres.confidence);
    }

    console.log();

    // 示例 4: 搜索专辑
    console.log('4. 搜索专辑 "The Dark Side of the Moon" by "Pink Floyd":');
    const release = await mb.searchRelease('The Dark Side of the Moon', 'Pink Floyd');
    console.log('   找到专辑:', release?.title);

    if (release) {
      const albumGenres = await mb.getAlbumGenres('The Dark Side of the Moon', 'Pink Floyd');
      console.log('   流派:', albumGenres?.genres.join(', ') || '无');
    }

  } catch (error) {
    console.error('MusicBrainz API 错误:', error);
  }

  console.log('\n');
}


// ==================== 统一接口示例 ====================

async function unifiedServiceExample() {
  console.log('=== 统一接口示例（自动回退）===\n');

  const service = new MusicGenreService({
    spotify: process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET
      ? {
          clientId: process.env.SPOTIFY_CLIENT_ID,
          clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        }
      : undefined,
    musicbrainz: {
      appName: 'MyMusicApp',
      appVersion: '1.0.0',
      contactInfo: 'you@example.com',
    },
  });

  try {
    // 自动回退：优先使用 Spotify，失败时使用 MusicBrainz
    console.log('1. 获取歌曲流派（优先 Spotify）:');
    const result1 = await service.getTrackGenres('Imagine', 'John Lennon', {
      prefer: 'spotify',
    });
    console.log('   结果:', result1);

    console.log();

    // 优先使用 MusicBrainz
    console.log('2. 获取歌曲流派（优先 MusicBrainz）:');
    const result2 = await service.getTrackGenres('Stairway to Heaven', 'Led Zeppelin', {
      prefer: 'musicbrainz',
    });
    console.log('   歌曲:', result2?.track);
    console.log('   艺术家:', result2?.artists.join(', '));
    console.log('   流派:', result2?.genres.join(', '));
    console.log('   来源:', result2?.source);

    console.log();

    // 获取专辑流派
    console.log('3. 获取专辑流派:');
    const albumResult = await service.getAlbumGenres('Abbey Road', 'The Beatles');
    console.log('   专辑:', albumResult?.album);
    console.log('   流派:', albumResult?.genres.join(', '));

  } catch (error) {
    console.error('服务错误:', error);
  }
}


// ==================== 运行所有示例 ====================

async function main() {
  await spotifyExample();
  await musicbrainzExample();
  await unifiedServiceExample();
}

main().catch(console.error);


// ==================== 环境变量模板 ====================
/**
 * .env.local 文件内容:
 * 
 * # Spotify API 凭证
 * SPOTIFY_CLIENT_ID=your_client_id_here
 * SPOTIFY_CLIENT_SECRET=your_client_secret_here
 * 
 * # MusicBrainz 不需要密钥，但需要设置应用信息
 * MUSICBRAINZ_APP_NAME=YourAppName
 * MUSICBRAINZ_APP_VERSION=1.0.0
 * MUSICBRAINZ_CONTACT=your@email.com
 */
