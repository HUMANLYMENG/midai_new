/**
 * Music Genre API 测试
 * 
 * 运行: npx ts-node lib/music-genre-api.test.ts
 */

import { SpotifyGenreClient, MusicBrainzGenreClient, MusicGenreService } from './music-genre-api.js';

// 测试 MusicBrainz API（无需密钥，可以直接测试）
async function testMusicBrainz() {
  console.log('🧪 测试 MusicBrainz API\n');

  const mb = new MusicBrainzGenreClient(
    'MidAI',
    '1.0.0',
    'test@example.com'
  );

  // 测试 1: 搜索录音
  console.log('Test 1: 搜索录音');
  const recording = await mb.searchRecording('Imagine', 'John Lennon');
  console.log('✓ 找到录音:', recording?.title || '未找到');

  // 测试 2: 获取录音详情
  if (recording) {
    console.log('\nTest 2: 获取录音详情');
    const details = await mb.getRecordingDetails(recording.id);
    console.log('✓ 录音标题:', details?.title);
    console.log('✓ 流派:', details?.genres?.map(g => g.name).join(', ') || '无');
  }

  // 测试 3: 获取完整流派信息
  console.log('\nTest 3: 获取歌曲流派');
  const genres = await mb.getTrackGenres('Imagine', 'John Lennon');
  console.log('✓ 歌曲:', genres?.track);
  console.log('✓ 艺术家:', genres?.artists.join(', '));
  console.log('✓ 流派:', genres?.genres.join(', ') || '未找到');

  console.log('\n✅ MusicBrainz 测试完成\n');
}

// 测试 Spotify API（需要密钥）
async function testSpotify() {
  console.log('🧪 测试 Spotify API\n');

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.log('⚠️  未设置 SPOTIFY_CLIENT_ID 和 SPOTIFY_CLIENT_SECRET');
    console.log('   跳过 Spotify 测试\n');
    return;
  }

  const spotify = new SpotifyGenreClient(clientId, clientSecret);

  try {
    // 测试 1: 获取 Token
    console.log('Test 1: 获取 Access Token');
    const token = await spotify.getAccessToken();
    console.log('✓ Token 获取成功:', token.slice(0, 20) + '...');

    // 测试 2: 搜索歌曲
    console.log('\nTest 2: 搜索歌曲');
    const track = await spotify.searchTrack('Imagine', 'John Lennon');
    console.log('✓ 找到歌曲:', track?.name);
    console.log('✓ 艺术家:', track?.artists.map(a => a.name).join(', '));

    // 测试 3: 获取流派
    if (track && track.artists.length > 0) {
      console.log('\nTest 3: 获取艺术家流派');
      const genres = await spotify.getArtistGenres(track.artists[0].id);
      console.log('✓ 流派:', genres.join(', ') || '无');
    }

    // 测试 4: 完整流程
    console.log('\nTest 4: 完整流派获取流程');
    const result = await spotify.getTrackGenres('Imagine', 'John Lennon');
    console.log('✓ 结果:', JSON.stringify(result, null, 2));

    console.log('\n✅ Spotify 测试完成\n');
  } catch (error) {
    console.error('❌ Spotify 测试失败:', error);
  }
}

// 测试统一接口
async function testUnifiedService() {
  console.log('🧪 测试统一接口\n');

  const service = new MusicGenreService({
    spotify: process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET
      ? {
          clientId: process.env.SPOTIFY_CLIENT_ID,
          clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        }
      : undefined,
    musicbrainz: {
      appName: 'MidAI',
      appVersion: '1.0.0',
      contactInfo: 'test@example.com',
    },
  });

  try {
    console.log('Test: 获取歌曲流派（自动回退）');
    const result = await service.getTrackGenres('Imagine', 'John Lennon');
    console.log('✓ 歌曲:', result?.track);
    console.log('✓ 艺术家:', result?.artists.join(', '));
    console.log('✓ 流派:', result?.genres.join(', ') || '未找到');
    console.log('✓ 来源:', result?.source);

    console.log('\n✅ 统一接口测试完成\n');
  } catch (error) {
    console.error('❌ 统一接口测试失败:', error);
  }
}

// 运行所有测试
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('   Music Genre API 测试套件');
  console.log('═══════════════════════════════════════════\n');

  try {
    await testMusicBrainz();
  } catch (error) {
    console.error('❌ MusicBrainz 测试失败:', error);
  }

  console.log('───────────────────────────────────────────\n');

  try {
    await testSpotify();
  } catch (error) {
    console.error('❌ Spotify 测试失败:', error);
  }

  console.log('───────────────────────────────────────────\n');

  try {
    await testUnifiedService();
  } catch (error) {
    console.error('❌ 统一接口测试失败:', error);
  }

  console.log('═══════════════════════════════════════════');
  console.log('   测试完成');
  console.log('═══════════════════════════════════════════');
}

main().catch(console.error);
