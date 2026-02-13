/**
 * Spotify 链接解析测试
 * 测试解析各种 Spotify 链接
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

function formatDuration(ms) {
  const mins = Math.floor(ms / 1000 / 60);
  const secs = Math.floor(ms / 1000 % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// 解析并显示歌曲
async function testTrack(token, trackId) {
  console.log('\n🎵 解析歌曲');
  console.log('='.repeat(70));
  
  try {
    const res = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    
    const t = res.data;
    console.log(`名称: ${t.name}`);
    console.log(`歌手: ${t.artists.map(a => a.name).join(', ')}`);
    console.log(`专辑: ${t.album.name}`);
    console.log(`发行: ${t.album.release_date}`);
    console.log(`时长: ${formatDuration(t.duration_ms)}`);
    console.log(`曲目: 第${t.track_number}首 / 共${t.album.total_tracks}首`);
    console.log(`碟片: 第${t.disc_number}碟`);
    console.log(`显式: ${t.explicit ? '🔞 是' : '✅ 否'}`);
    console.log(`ID: ${t.id}`);
    console.log(`URI: ${t.uri}`);
    console.log(`链接: ${t.external_urls.spotify}`);
    
    if (t.album.images?.[0]) {
      console.log(`封面: ${t.album.images[0].url.substring(0, 60)}...`);
    }
    
  } catch (err) {
    console.error('❌ 错误:', err.response?.data?.error?.message || err.message);
  }
}

// 解析并显示歌单
async function testPlaylist(token, playlistId) {
  console.log('\n📋 解析歌单');
  console.log('='.repeat(70));
  
  try {
    // 获取歌单信息
    const res = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    
    const pl = res.data;
    console.log(`名称: ${pl.name}`);
    console.log(`描述: ${pl.description?.replace(/<[^>]+>/g, '').substring(0, 100) || '无'}`);
    console.log(`创建者: ${pl.owner.display_name || pl.owner.id}`);
    console.log(`歌曲数: ${pl.tracks?.total || '未知'}`);
    console.log(`关注者: ${pl.followers?.total || 0}`);
    console.log(`公开: ${pl.public ? '🌐 是' : '🔒 否'}`);
    console.log(`ID: ${pl.id}`);
    console.log(`链接: ${pl.external_urls?.spotify}`);
    
    // 获取前10首歌曲
    console.log('\n前10首歌曲:');
    console.log('-'.repeat(70));
    
    const tracksRes = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      headers: { 'Authorization': 'Bearer ' + token },
      params: { limit: 10 },
    });
    
    const items = tracksRes.data.items || [];
    
    if (items.length === 0) {
      console.log('  歌单为空或无法访问');
    }
    
    items.forEach((item, i) => {
      const track = item.track;
      if (!track) {
        console.log(`  ${i + 1}. [无法播放]`);
        return;
      }
      
      const artists = track.artists.map(a => a.name).join(', ');
      console.log(`  ${i + 1}. ${track.name}`);
      console.log(`      ${artists} · ${track.album.name} · ${formatDuration(track.duration_ms)}`);
    });
    
  } catch (err) {
    if (err.response?.status === 403) {
      console.error('❌ 错误: 无法访问此歌单（可能为私有）');
    } else {
      console.error('❌ 错误:', err.response?.data?.error?.message || err.message);
    }
  }
}

// 解析专辑
async function testAlbum(token, albumId) {
  console.log('\n💿 解析专辑');
  console.log('='.repeat(70));
  
  try {
    const res = await axios.get(`https://api.spotify.com/v1/albums/${albumId}`, {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    
    const album = res.data;
    console.log(`名称: ${album.name}`);
    console.log(`歌手: ${album.artists.map(a => a.name).join(', ')}`);
    console.log(`发行: ${album.release_date}`);
    console.log(`类型: ${album.album_type}`);
    console.log(`曲目: ${album.total_tracks}首`);
    console.log(`ID: ${album.id}`);
    console.log(`链接: ${album.external_urls.spotify}`);
    
    if (album.images?.[0]) {
      console.log(`封面: ${album.images[0].url.substring(0, 60)}...`);
    }
    
  } catch (err) {
    console.error('❌ 错误:', err.response?.data?.error?.message || err.message);
  }
}

// 解析艺术家
async function testArtist(token, artistId) {
  console.log('\n🎸 解析艺术家');
  console.log('='.repeat(70));
  
  try {
    const res = await axios.get(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    
    const artist = res.data;
    console.log(`名称: ${artist.name}`);
    console.log(`流派: ${artist.genres?.join(', ') || '无'}`);
    console.log(`人气: ${artist.popularity}/100`);
    console.log(`粉丝: ${artist.followers?.total?.toLocaleString() || 0}`);
    console.log(`ID: ${artist.id}`);
    console.log(`链接: ${artist.external_urls.spotify}`);
    
    if (artist.images?.[0]) {
      console.log(`照片: ${artist.images[0].url.substring(0, 60)}...`);
    }
    
  } catch (err) {
    console.error('❌ 错误:', err.response?.data?.error?.message || err.message);
  }
}

async function main() {
  console.log('🎵 Spotify 链接解析测试');
  console.log('='.repeat(70));
  
  try {
    const token = await getToken();
    console.log('✅ 认证成功\n');
    
    // 测试各种链接
    // 歌曲: Bohemian Rhapsody
    await testTrack(token, '7tFiyTwD0nx5a1eklYtX2J');
    
    // 歌单（用户提供的）
    console.log('\n测试用户提供的歌单...');
    await testPlaylist(token, '5EKHaMBTzGmgihPn1kIU8W');
    
    // 歌单（Today's Top Hits - 公共歌单）
    console.log('\n测试公共歌单 (Today\'s Top Hits)...');
    await testPlaylist(token, '37i9dQZF1DXcBWIGoYBM5M');
    
    // 专辑: A Night At The Opera
    await testAlbum(token, '6X9k3hSsvQck2OfKYdBbXr');
    
    // 艺术家: Queen
    await testArtist(token, '1dfeR4HaWDbWqFHLkxsg1d');
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ 测试完成！');
    console.log('='.repeat(70));
    
  } catch (err) {
    console.error('\n❌ 错误:', err.message);
  }
}

main();
