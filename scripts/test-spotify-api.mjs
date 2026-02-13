/**
 * Spotify API 功能测试
 * 展示 Spotify API 能返回的所有歌曲信息
 */

import axios from 'axios';

const CLIENT_ID = '98d47f42ea224ec1a077da4463b528b3';
const CLIENT_SECRET = 'b6332169781343adb9df39ea18eaa380';

async function getToken() {
  const res = await axios.post(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  return res.data.access_token;
}

async function testTrackDetails(token) {
  console.log('1️⃣  歌曲详情 (Bohemian Rhapsody - Queen)');
  console.log('='.repeat(70));
  
  const res = await axios.get('https://api.spotify.com/v1/tracks/7tFiyTwD0nx5a1eklYtX2J', {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  
  const track = res.data;
  
  console.log('📋 返回字段列表:');
  console.log('  ', Object.keys(track).join(', '));
  
  console.log('\n🎵 基本信息:');
  console.log(`  名称: ${track.name}`);
  console.log(`  ID: ${track.id}`);
  console.log(`  URI: ${track.uri}`);
  console.log(`  时长: ${formatDuration(track.duration_ms)}`);
  console.log(`  曲目号: ${track.track_number} / 专辑第${track.disc_number}碟`);
  console.log(`  流行度: ${track.popularity}/100`);
  console.log(`  显式内容: ${track.explicit ? '🔞 是' : '✅ 否'}`);
  
  console.log('\n🎸 艺术家:');
  track.artists.forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.name} (ID: ${a.id})`);
  });
  
  console.log('\n💿 专辑信息:');
  console.log(`  名称: ${track.album.name}`);
  console.log(`  ID: ${track.album.id}`);
  console.log(`  发行日期: ${track.album.release_date}`);
  console.log(`  专辑类型: ${track.album.album_type}`);
  console.log(`  总曲目: ${track.album.total_tracks}`);
  
  console.log('\n🖼️  封面图片:');
  track.album.images.forEach((img, i) => {
    console.log(`  ${i + 1}. ${img.width}x${img.height}: ${img.url.substring(0, 60)}...`);
  });
  
  console.log('\n🔗 外部链接:');
  console.log(`  Spotify: ${track.external_urls.spotify}`);
  console.log(`  预览音频: ${track.preview_url ? track.preview_url.substring(0, 60) + '...' : '❌ 无'}`);
  
  console.log('\n🌍 可用市场:');
  console.log(`  ${track.available_markets?.length || 0} 个国家/地区可用`);
  
  return track;
}

async function testPlaylist(token, playlistId) {
  console.log('\n\n2️⃣  歌单详情');
  console.log('='.repeat(70));
  
  const res = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  
  const pl = res.data;
  
  console.log('📋 返回字段列表:');
  console.log('  ', Object.keys(pl).join(', '));
  
  console.log('\n📊 基本信息:');
  console.log(`  名称: ${pl.name}`);
  console.log(`  ID: ${pl.id}`);
  console.log(`  URI: ${pl.uri}`);
  console.log(`  描述: ${pl.description || '无'}`);
  
  console.log('\n👤 创建者:');
  console.log(`  名称: ${pl.owner.display_name || pl.owner.id}`);
  console.log(`  ID: ${pl.owner.id}`);
  console.log(`  类型: ${pl.owner.type}`);
  
  console.log('\n📈 统计数据:');
  console.log(`  歌曲数: ${pl.tracks?.total || '未知'}`);
  console.log(`  关注者: ${pl.followers?.total || 0}`);
  console.log(`  公开: ${pl.public === true ? '🌐 是' : pl.public === false ? '🔒 否' : '未知'}`);
  console.log(`  协作歌单: ${pl.collaborative ? '👥 是' : '❌ 否'}`);
  
  console.log('\n🖼️  封面:');
  pl.images.forEach((img, i) => {
    if (img) console.log(`  ${i + 1}. ${img.width}x${img.height}: ${img.url?.substring(0, 50)}...`);
  });
  
  console.log('\n🔗 链接:');
  console.log(`  Spotify: ${pl.external_urls.spotify}`);
  console.log(`  API: ${pl.href}`);
  
  return pl;
}

async function testPlaylistTracks(token, playlistId) {
  console.log('\n\n3️⃣  歌单歌曲 (前10首)');
  console.log('='.repeat(70));
  
  const res = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    headers: { 'Authorization': 'Bearer ' + token },
    params: { limit: 10 },
  });
  
  const items = res.data.items;
  
  console.log(`共 ${res.data.total} 首，显示前 ${items.length} 首\n`);
  
  items.forEach((item, i) => {
    const track = item.track;
    if (!track) {
      console.log(`${i + 1}. [无法播放的曲目]`);
      return;
    }
    
    console.log(`${i + 1}. ${track.name}`);
    console.log(`   歌手: ${track.artists.map(a => a.name).join(', ')}`);
    console.log(`   专辑: ${track.album.name}`);
    console.log(`   时长: ${formatDuration(track.duration_ms)}`);
    console.log(`   添加者: ${item.added_by?.id || '未知'}`);
    console.log(`   添加时间: ${new Date(item.added_at).toLocaleDateString()}`);
    console.log(`   显式内容: ${track.explicit ? '🔞' : '✅'}`);
    console.log('');
  });
  
  return items;
}

async function testSearch(token) {
  console.log('\n4️⃣  搜索功能');
  console.log('='.repeat(70));
  
  const queries = [
    { q: 'Imagine John Lennon', type: 'track' },
    { q: 'Queen', type: 'artist' },
    { q: 'Nevermind', type: 'album' },
  ];
  
  for (const query of queries) {
    console.log(`\n搜索: "${query.q}" (${query.type})`);
    
    const res = await axios.get('https://api.spotify.com/v1/search', {
      headers: { 'Authorization': 'Bearer ' + token },
      params: { q: query.q, type: query.type, limit: 1 },
    });
    
    if (query.type === 'track' && res.data.tracks.items[0]) {
      const t = res.data.tracks.items[0];
      console.log(`  ✅ 找到: ${t.name} - ${t.artists.map(a => a.name).join(', ')}`);
    } else if (query.type === 'artist' && res.data.artists.items[0]) {
      const a = res.data.artists.items[0];
      console.log(`  ✅ 找到: ${a.name}`);
      console.log(`     流派: ${a.genres?.join(', ') || '无'}`);
      console.log(`     人气: ${a.popularity}/100`);
      console.log(`     粉丝: ${a.followers?.total || 0}`);
    } else if (query.type === 'album' && res.data.albums.items[0]) {
      const a = res.data.albums.items[0];
      console.log(`  ✅ 找到: ${a.name} - ${a.artists.map(ar => ar.name).join(', ')}`);
    }
  }
}

function formatDuration(ms) {
  if (!ms) return '0:00';
  const mins = Math.floor(ms / 1000 / 60);
  const secs = Math.floor(ms / 1000 % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

async function main() {
  console.log('🎵 Spotify API 功能演示');
  console.log('='.repeat(70));
  
  try {
    const token = await getToken();
    console.log('✅ 认证成功\n');
    
    // 测试歌曲详情
    await testTrackDetails(token);
    
    // 测试歌单 - 使用用户提供的链接
    const playlistId = '5EKHaMBTzGmgihPn1kIU8W';
    const playlist = await testPlaylist(token, playlistId);
    
    // 测试歌单歌曲
    await testPlaylistTracks(token, playlistId);
    
    // 测试搜索
    await testSearch(token);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ 所有测试完成！');
    console.log('='.repeat(70));
    
  } catch (err) {
    console.error('\n❌ 错误:', err.response?.data?.error?.message || err.message);
  }
}

main();
