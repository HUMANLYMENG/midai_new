/**
 * 流派服务测试脚本
 * 测试 Spotify 和 MusicBrainz API
 * 
 * 使用前先设置环境变量：
 *   export SPOTIFY_CLIENT_ID="xxx"
 *   export SPOTIFY_CLIENT_SECRET="xxx"
 * 
 * 然后运行：
 *   node scripts/test-genre-service.mjs
 */

import axios from 'axios';

// ============ Spotify API 测试 ============
async function testSpotify(trackName, artistName) {
  console.log(`\n🎵 测试 Spotify API`);
  console.log(`查询: ${trackName} - ${artistName}`);
  console.log('-'.repeat(60));

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.log('❌ 缺少 Spotify 配置，跳过测试');
    console.log('请设置环境变量: SPOTIFY_CLIENT_ID 和 SPOTIFY_CLIENT_SECRET');
    return null;
  }

  try {
    // 1. 获取 access token
    console.log('1. 获取 access token...');
    const tokenRes = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    const token = tokenRes.data.access_token;
    console.log('   ✅ Token 获取成功');

    // 2. 搜索曲目
    console.log('2. 搜索曲目...');
    const query = `track:"${trackName}" artist:"${artistName}"`;
    const searchRes = await axios.get('https://api.spotify.com/v1/search', {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { q: query, type: 'track', limit: 1 },
    });

    const track = searchRes.data.tracks?.items?.[0];
    if (!track) {
      console.log('   ❌ 未找到曲目');
      return null;
    }
    console.log(`   ✅ 找到: ${track.name} - ${track.artists.map(a => a.name).join(', ')}`);

    // 3. 获取艺术家流派
    console.log('3. 获取艺术家流派...');
    const artistIds = track.artists.map(a => a.id).join(',');
    const artistsRes = await axios.get(`https://api.spotify.com/v1/artists?ids=${artistIds}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const allGenres = new Set();
    artistsRes.data.artists.forEach(artist => {
      artist.genres?.forEach(g => allGenres.add(g));
    });

    if (allGenres.size > 0) {
      console.log(`   ✅ 流派: ${Array.from(allGenres).join(', ')}`);
    } else {
      console.log('   ⚠️  该艺术家暂无流派信息');
    }

    return {
      track: track.name,
      artists: track.artists.map(a => a.name),
      album: track.album.name,
      genres: Array.from(allGenres),
      source: 'spotify',
    };

  } catch (error) {
    console.error('❌ Spotify API 错误:', error.response?.data?.error?.message || error.message);
    return null;
  }
}

// ============ MusicBrainz API 测试 ============
async function testMusicBrainz(trackName, artistName) {
  console.log(`\n🎵 测试 MusicBrainz API`);
  console.log(`查询: ${trackName} - ${artistName}`);
  console.log('-'.repeat(60));

  const userAgent = 'MidAI/1.0 ( test@example.com )';

  try {
    // 1. 搜索录音
    console.log('1. 搜索录音...');
    const query = `recording:"${trackName}" AND artist:"${artistName}"`;
    const searchRes = await axios.get('https://musicbrainz.org/ws/2/recording', {
      headers: { 'User-Agent': userAgent },
      params: { query, fmt: 'json', limit: 3 },
    });

    const recordings = searchRes.data.recordings;
    if (!recordings || recordings.length === 0) {
      console.log('   ❌ 未找到录音');
      return null;
    }

    const recording = recordings[0];
    console.log(`   ✅ 找到: ${recording.title}`);
    console.log(`   📝 分数: ${recording.score}/100`);

    // 2. 获取录音详情（包含流派标签）
    console.log('2. 获取录音详情（等待 1.1s 限速）...');
    await new Promise(resolve => setTimeout(resolve, 1100));

    const detailRes = await axios.get(`https://musicbrainz.org/ws/2/recording/${recording.id}`, {
      headers: { 'User-Agent': userAgent },
      params: { 
        fmt: 'json',
        inc: 'artists+releases+tags+genres+ratings'
      },
    });

    const data = detailRes.data;

    // 提取流派
    const genres = new Set();
    
    // 从录音获取
    data.tags?.forEach(tag => genres.add(tag.name.toLowerCase()));
    data.genres?.forEach(genre => genres.add(genre.name.toLowerCase()));

    // 从艺术家获取
    if (data['artist-credit']?.[0]?.artist) {
      const artist = data['artist-credit'][0].artist;
      artist.tags?.forEach(tag => genres.add(tag.name.toLowerCase()));
    }

    console.log(`   ✅ 流派标签: ${genres.size > 0 ? Array.from(genres).join(', ') : '暂无标签'}`);

    // 其他信息
    if (data.releases?.length > 0) {
      console.log(`   💿 专辑: ${data.releases[0].title}`);
    }
    if (data.rating?.value) {
      console.log(`   ⭐ 评分: ${data.rating.value}/5`);
    }

    return {
      track: data.title,
      artists: data['artist-credit']?.map(ac => ac.name),
      genres: Array.from(genres),
      source: 'musicbrainz',
    };

  } catch (error) {
    console.error('❌ MusicBrainz API 错误:', error.response?.data || error.message);
    return null;
  }
}

// ============ 主程序 ============
const testTracks = [
  { name: 'Imagine', artist: 'John Lennon' },
  { name: 'Bohemian Rhapsody', artist: 'Queen' },
  { name: 'Smells Like Teen Spirit', artist: 'Nirvana' },
];

async function main() {
  console.log('='.repeat(60));
  console.log('🎵 音乐流派服务测试');
  console.log('='.repeat(60));

  // 检查环境变量
  const hasSpotify = process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET;
  console.log(`\n配置状态:`);
  console.log(`  Spotify: ${hasSpotify ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`  MusicBrainz: ✅ 无需配置（使用默认）`);

  // 测试每首歌
  for (const track of testTracks.slice(0, 2)) { // 只测试前2首避免太慢
    console.log('\n' + '='.repeat(60));
    console.log(`测试曲目: ${track.name} - ${track.artist}`);
    console.log('='.repeat(60));

    // 测试 Spotify
    const spotifyResult = await testSpotify(track.name, track.artist);

    // 测试 MusicBrainz
    const mbResult = await testMusicBrainz(track.name, track.artist);

    // 对比结果
    console.log('\n📊 结果对比:');
    console.log('-'.repeat(60));
    if (spotifyResult) {
      console.log(`Spotify 流派: ${spotifyResult.genres.join(', ') || '无'}`);
    }
    if (mbResult) {
      console.log(`MusicBrainz 流派: ${mbResult.genres.join(', ') || '无'}`);
    }

    // 等待一下再进行下一首（MusicBrainz 限速）
    if (testTracks.indexOf(track) < testTracks.length - 1) {
      console.log('\n⏳ 等待 2 秒...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 测试完成');
  console.log('='.repeat(60));
}

main().catch(console.error);
