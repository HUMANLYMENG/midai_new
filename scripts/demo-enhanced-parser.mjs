/**
 * 增强版音乐链接解析演示
 * 
 * 展示如何使用 MusicBrainz 获取流派信息来增强歌单数据
 */

import axios from 'axios';

// MusicBrainz API 客户端
class MusicBrainzClient {
  constructor() {
    this.userAgent = 'MidAI/1.0 ( hello@example.com )';
    this.lastRequest = 0;
    this.minInterval = 1100;
  }

  async rateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.minInterval) {
      await new Promise(r => setTimeout(r, this.minInterval - elapsed));
    }
    this.lastRequest = Date.now();
  }

  async getTrackGenres(trackName, artistName) {
    await this.rateLimit();

    try {
      const query = `recording:"${trackName}" AND artist:"${artistName}"`;
      const res = await axios.get('https://musicbrainz.org/ws/2/recording', {
        headers: { 'User-Agent': this.userAgent },
        params: { query, fmt: 'json', limit: 3 },
      });

      const recording = res.data.recordings?.[0];
      if (!recording) return null;

      // 获取详情
      await this.rateLimit();
      const detail = await axios.get(`https://musicbrainz.org/ws/2/recording/${recording.id}`, {
        headers: { 'User-Agent': this.userAgent },
        params: { fmt: 'json', inc: 'artists+tags+genres' },
      });

      const genres = new Set();
      
      // 从录音获取
      detail.data.tags?.forEach(t => genres.add(t.name.toLowerCase()));
      detail.data.genres?.forEach(g => genres.add(g.name.toLowerCase()));
      
      // 从艺术家获取
      detail.data['artist-credit']?.forEach(ac => {
        ac.artist?.tags?.forEach(t => genres.add(t.name.toLowerCase()));
      });

      return {
        track: detail.data.title,
        genres: Array.from(genres),
        year: recording['first-release-date']?.split('-')[0],
      };
    } catch (e) {
      return null;
    }
  }
}

// 模拟歌单数据（来自之前的解析）
const samplePlaylist = {
  name: '新建歌单',
  platform: 'QQ音乐',
  songs: [
    { name: 'Fantasy', artist: 'Miles Davis', album: 'Doo Bop' },
    { name: 'Call Me', artist: 'Aretha Franklin', album: 'Aretha' },
    { name: 'Suzanne', artist: 'Mark Ronson', album: 'Late Night Feelings' },
    { name: 'Move on Up', artist: 'Curtis Mayfield', album: 'Curtis' },
    { name: 'Golden', artist: 'Jill Scott', album: 'Who Is Jill Scott?' },
  ],
};

async function main() {
  console.log('🎵 增强版音乐链接解析演示');
  console.log('=' .repeat(70));
  console.log(`\n歌单: ${samplePlaylist.name}`);
  console.log(`平台: ${samplePlaylist.platform}`);
  console.log(`\n正在为 ${samplePlaylist.songs.length} 首歌曲获取流派信息...`);
  console.log('（使用 MusicBrainz API，每首间隔 1.1 秒）\n');

  const mb = new MusicBrainzClient();
  const enhancedSongs = [];

  for (let i = 0; i < samplePlaylist.songs.length; i++) {
    const song = samplePlaylist.songs[i];
    console.log(`${i + 1}. ${song.name} - ${song.artist}`);
    
    const genreInfo = await mb.getTrackGenres(song.name, song.artist);
    
    if (genreInfo && genreInfo.genres.length > 0) {
      console.log(`   ✅ 流派: ${genreInfo.genres.slice(0, 5).join(', ')}${genreInfo.genres.length > 5 ? '...' : ''}`);
      if (genreInfo.year) console.log(`   ✅ 年份: ${genreInfo.year}`);
      
      enhancedSongs.push({
        ...song,
        genres: genreInfo.genres,
        year: genreInfo.year,
      });
    } else {
      console.log(`   ⚠️  未找到流派信息`);
      enhancedSongs.push(song);
    }
    
    if (i < samplePlaylist.songs.length - 1) {
      console.log('   ⏳ 等待...\n');
    }
  }

  // 统计流派
  console.log('\n' + '='.repeat(70));
  console.log('📊 流派统计');
  console.log('='.repeat(70));
  
  const genreCount = {};
  enhancedSongs.forEach(s => {
    s.genres?.forEach(g => {
      genreCount[g] = (genreCount[g] || 0) + 1;
    });
  });

  const sortedGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  sortedGenres.forEach(([genre, count]) => {
    console.log(`   ${genre}: ${count}首`);
  });

  // 年代统计
  const yearCount = {};
  enhancedSongs.forEach(s => {
    if (s.year) {
      const decade = Math.floor(parseInt(s.year) / 10) * 10;
      yearCount[`${decade}s`] = (yearCount[`${decade}s`] || 0) + 1;
    }
  });

  if (Object.keys(yearCount).length > 0) {
    console.log('\n📅 年代分布');
    Object.entries(yearCount)
      .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
      .forEach(([decade, count]) => {
        console.log(`   ${decade}: ${count}首`);
      });
  }

  console.log('\n✅ 演示完成！');
}

main().catch(console.error);
