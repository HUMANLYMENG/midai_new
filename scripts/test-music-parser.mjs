/**
 * 音乐链接解析器 - 支持流派信息
 * 使用方法: node scripts/test-music-parser.mjs <链接>
 */
import axios from 'axios';

const http = axios.create({
  timeout: 15000,
  maxRedirects: 10,
  headers: {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.0(0x18000028) NetType/WIFI Language/zh_CN',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Referer': 'https://y.qq.com/',
  },
});

// 格式化时长
function formatDuration(ms) {
  if (!ms) return null;
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// QQ音乐流派映射（完整版）
const QQ_GENRE_MAP = {
  1: '流行', 2: '摇滚', 3: '爵士', 4: '电子', 5: '民谣',
  6: '轻音乐', 7: '说唱', 8: '古典', 9: '节奏布鲁斯', 10: '民族',
  11: '英伦', 12: '朋克', 13: '布鲁斯', 14: '后摇', 15: '舞曲',
  16: '流行舞曲', 17: '另类/独立', 18: '浩室', 19: '蓝草', 20: '原声',
  21: '香颂', 22: '儿童音乐', 23: '口水歌', 24: '沙发音乐', 25: '动漫',
  26: '前卫', 27: '斯卡', 28: '中国传统', 29: '福音', 30: '雷鬼',
  31: '拉丁', 32: 'Trip-Hop', 33: '世界音乐', 34: '新纪元', 35: '前卫/实验',
  36: '嘻哈', 37: '喜剧', 38: '金属', 39: '灵魂乐', 40: '流行摇滚',
  41: '沼泽', 42: '巴洛克', 43: 'Celtic', 44: '音乐剧', 45: '创意音乐',
  46: '迪斯科', 47: '前卫摇滚', 48: '强力流行', 49: '梦幻流行', 50: '噪音',
  51: '自赏', 52: '合成器流行', 53: '氛围', 54: '盯鞋', 55: '独立摇滚',
  56: '硬核朋克', 57: '垃圾摇滚', 58: '英伦摇滚', 59: '暗潮', 60: '工业',
  61: '暗氛围', 62: '新民谣', 63: '后工业', 64: '军事', 65: '黑暗艺术',
  66: '新古典', 67: '中世纪', 68: '车库摇滚', 69: '迷幻摇滚', 70: '交响金属',
  71: '能量金属', 72: '速度金属', 73: '激流金属', 74: '死亡金属', 75: '黑金属',
  76: '厄运金属', 77: '新金属', 78: '流行金属', 79: '前卫金属', 80: '碾核',
  81: '氛围黑金属', 82: '蓝调摇滚', 83: '南方摇滚', 84: '硬摇滚', 85: '基督教摇滚',
  86: '南方金属', 87: '吉他手', 88: '爵士布鲁斯', 89: '钢琴布鲁斯', 90: '芝加哥布鲁斯',
  91: '三角洲布鲁斯', 92: '原声布鲁斯', 93: '路易斯安那布鲁斯', 94: '电声布鲁斯', 95: '灵魂布鲁斯',
  96: '灵魂乐', 97: '摩城', 98: '新灵魂乐', 99: '嘟喔普', 100: '放克',
  101: '灵歌', 102: '神游舞曲', 103: '丛林/鼓打贝斯', 104: '铁克诺', 105: '出神',
  106: '浩室', 107: '出神电子', 108: '电子舞曲', 109: '氛围出神', 110: '硬核电子',
  111: '科技舞曲', 112: '最小化', 113: '电子实验', 114: '回响贝斯', 115: '故障电子',
  116: '智能舞曲', 117: '芯片音乐', 118: '嘻哈', 119: '匪帮说唱', 120: '东岸说唱',
  121: '西岸说唱', 122: '流行说唱', 123: '另类说唱', 124: '硬核嘻哈', 125: '低音',
  126: '舞厅', 127: '回响', 128: '斯卡', 129: '舞场雷鬼', 130: '根源雷鬼',
  131: '牙买加', 132: '乡村', 133: '乡村流行', 134: '另类乡村', 135: '蓝草',
  136: '美国传统', 137: '纳什维尔之声', 138: '另类乡村摇滚', 139: '唱作人', 140: '当代民谣',
  141: '迷幻民谣', 142: '民谣布鲁斯', 143: '凯尔特民谣', 144: '根源摇滚', 145: '原声吉他',
  146: '爱尔兰民谣', 147: '传统民谣', 148: '室内乐', 149: '奏鸣曲', 150: '协奏曲',
  151: '交响曲', 152: '管弦乐', 153: '歌剧', 154: '艺术歌曲', 155: '芭蕾',
  156: '组曲', 157: '合唱', 158: '当代古典', 159: '浪漫主义', 160: '印象派',
  161: '文艺复兴', 162: '巴洛克', 163: '古典主义', 164: '拉丁流行', 165: '拉丁摇滚',
  166: '拉丁说唱', 167: '墨西哥音乐', 168: '萨尔萨', 169: '雷鬼顿', 170: '桑巴',
  171: '探戈', 172: '波萨诺瓦', 173: '弗拉门戈', 174: '谣曲', 175: '非洲音乐',
  176: '卡利普索', 177: '卡巴莱', 178: '法国香颂', 179: '印度音乐', 180: '日本音乐',
  181: '中东音乐', 182: '凯尔特', 183: '波利尼西亚', 184: '澳大利亚', 185: '欧洲',
  186: '亚洲', 187: '北美', 188: '南美', 189: '阿拉伯', 190: '西班牙',
  191: '德国', 192: '意大利', 193: '俄语', 194: '法语', 195: '希腊语',
  196: '波兰语', 197: '葡萄牙语', 198: '希伯来语', 199: '土耳其', 200: '韩国',
  201: '现代爵士', 202: '融合爵士', 203: '冷爵士', 204: '自由爵士', 205: '酸性爵士',
  206: '拉丁爵士', 207: '比波普', 208: '摇摆', 209: '大乐队', 210: '声乐爵士',
  211: '轻松听', 212: '沙发音乐', 213: '自然声音', 214: '冥想', 215: '催眠',
  216: '器乐', 217: '新世纪', 218: '原声吉他', 219: '钢琴', 220: '小提琴',
  221: '大提琴', 222: '萨克斯', 223: '小号', 224: '长笛', 225: '竖琴',
  226: '口琴', 227: '班卓琴', 228: '手风琴', 229: '打击乐', 230: '风笛',
  231: '扬琴', 232: '古琴', 233: '二胡', 234: '琵琶', 235: '笛子',
  236: '古筝', 237: '葫芦丝', 238: '马头琴', 239: '京剧', 240: '评剧',
  241: '越剧', 242: '黄梅戏', 243: '豫剧', 244: '昆剧', 245: '粤剧',
  246: '川剧', 247: '二人转', 248: '曲艺', 249: '相声', 250: '评书',
  251: '快板', 252: '大鼓', 253: '民歌', 254: '山歌', 255: '号子',
  256: '信天游', 257: '花儿', 258: '长调', 259: '呼麦',
};

// QQ音乐语言映射（完整版）
const QQ_LANG_MAP = {
  0: '其他', 1: '国语', 2: '粤语', 3: '英语', 4: '日语', 5: '韩语',
  6: '法语', 7: '德语', 8: '意大利语', 9: '西班牙语', 10: '俄语',
  11: '泰语', 12: '葡萄牙语', 13: '阿拉伯语', 14: '波兰语', 15: '土耳其语',
  16: '越南语', 17: '荷兰语', 18: '印尼语', 19: '希伯来语', 20: '希腊语',
  21: '瑞典语', 22: '挪威语', 23: '丹麦语', 24: '芬兰语', 25: '捷克语',
  26: '匈牙利语', 27: '罗马尼亚语', 28: '斯洛伐克语', 29: '克罗地亚语', 30: '塞尔维亚语',
  31: '保加利亚语', 32: '乌克兰语', 33: '爱沙尼亚语', 34: '拉脱维亚语', 35: '立陶宛语',
  36: '斯洛文尼亚语', 37: '波斯语', 38: '印地语', 39: '马来语', 40: '蒙古语',
};

// 解析 QQ 音乐
async function parseQQMusic(url) {
  const response = await http.get(url);
  const html = response.data;
  const finalUrl = response.request?.res?.responseUrl || url;
  
  console.log('  最终URL:', finalUrl);

  const isPlaylist = finalUrl.includes('playlist') || finalUrl.includes('id=');
  const isSong = finalUrl.includes('song') || finalUrl.includes('songDetail');

  let id = null;
  const idMatch = finalUrl.match(/[?&]id=([\d]+)/);
  if (idMatch) id = idMatch[1];

  if (isPlaylist && id) {
    const playlistData = await fetchQQPlaylist(id);
    return {
      type: 'playlist',
      platform: 'QQ音乐',
      id,
      ...playlistData,
    };
  }

  if (isSong) {
    let songMid = null;
    const midMatch = finalUrl.match(/songmid=([\w]+)/i) || finalUrl.match(/songDetail\/([\w]+)/i);
    if (midMatch) songMid = midMatch[1];
    
    if (songMid) {
      const songData = await fetchQQSong(songMid);
      return { type: 'song', platform: 'QQ音乐', ...songData };
    }
  }

  throw new Error('无法识别的链接类型');
}

// 获取 QQ 音乐歌单详情（含流派）
async function fetchQQPlaylist(id) {
  try {
    const apiUrl = 'https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg';
    const response = await http.get(apiUrl, {
      params: {
        type: 1, json: 1, utf8: 1, onlysong: 0, new_format: 1,
        disstid: id, g_tk: 5381, loginUin: 0, hostUin: 0,
        format: 'json', inCharset: 'utf8', outCharset: 'utf-8',
        notice: 0, platform: 'yqq.json', needNewCode: 0,
      },
      headers: { 'Referer': 'https://y.qq.com/' },
    });

    const cdlist = response.data.cdlist?.[0];
    if (!cdlist) throw new Error('获取歌单信息失败');

    // 收集歌单流派统计
    const genreStats = {};
    const languageStats = {};
    const yearStats = {};

    const songs = cdlist.songlist?.map((s) => {
      const genre = s.genre ? (QQ_GENRE_MAP[s.genre] || `流派${s.genre}`) : null;
      const language = s.language ? (QQ_LANG_MAP[s.language] || s.language) : null;
      const year = s.time_public?.split('-')[0];

      // 统计
      if (genre) genreStats[genre] = (genreStats[genre] || 0) + 1;
      if (language) languageStats[language] = (languageStats[language] || 0) + 1;
      if (year) yearStats[year] = (yearStats[year] || 0) + 1;

      return {
        id: s.mid,
        name: s.title || s.name,
        artists: s.singer?.map(sg => sg.name) || [],
        album: s.album?.name || '',
        albumId: s.album?.mid,
        duration: formatDuration(s.interval * 1000),
        genre,
        language,
        year,
        timePublic: s.time_public,
      };
    }) || [];

    return {
      name: cdlist.dissname || '未知歌单',
      creator: cdlist.nickname || '未知用户',
      description: cdlist.desc || '',
      cover: cdlist.logo || cdlist.cover,
      songCount: songs.length,
      songs,
      genres: genreStats,
      languages: languageStats,
      years: yearStats,
      url: `https://y.qq.com/n/ryqq/playlist/${id}`,
    };
  } catch (error) {
    console.log('  API 失败，使用备用方案');
    return { name: '歌单 #' + id, creator: '未知', songCount: 0, songs: [], genres: {} };
  }
}

// 获取 QQ 音乐单曲详情（含流派）
async function fetchQQSong(songMid) {
  const apiUrl = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
  const response = await http.get(apiUrl, {
    params: {
      format: 'json',
      data: JSON.stringify({
        req_0: {
          module: 'songlist.InfoServer',
          method: 'GetSongDetail',
          param: { song_mid: songMid }
        }
      }),
    },
  });

  const info = response.data.req_0?.data?.songinfo;
  if (!info) throw new Error('获取歌曲详情失败');

  const genre = info.genre ? (QQ_GENRE_MAP[info.genre] || `流派${info.genre}`) : null;
  const language = info.language ? (QQ_LANG_MAP[info.language] || info.language) : null;
  const year = info.time_public?.split('-')[0];

  return {
    id: songMid,
    name: info.name,
    artists: info.singer?.map(s => s.name) || [],
    album: info.album?.name || '',
    albumId: info.album?.mid,
    albumCover: info.album?.mid ? 
      `https://y.gtimg.cn/music/photo_new/T002R300x300M000${info.album.mid}.jpg` : 
      null,
    genre,
    language,
    year,
    timePublic: info.time_public,
    url: `https://y.qq.com/n/ryqq/songDetail/${songMid}`,
  };
}

// 解析网易云音乐
async function parseNetease(url) {
  const response = await http.get(url, {
    headers: {
      'Referer': 'https://music.163.com/',
    },
  });
  const html = response.data;
  const finalUrl = response.request?.res?.responseUrl || url;
  
  console.log('  最终URL:', finalUrl);

  const isPlaylist = finalUrl.includes('playlist');
  const isSong = finalUrl.includes('song');

  let id = null;
  const idMatch = finalUrl.match(/[?&]id=(\d+)/);
  if (idMatch) id = idMatch[1];

  if (isPlaylist && id) {
    const playlistData = await fetchNeteasePlaylist(id);
    return {
      type: 'playlist',
      platform: '网易云音乐',
      id,
      ...playlistData,
    };
  }

  if (isSong && id) {
    const songData = await fetchNeteaseSong(id);
    return { type: 'song', platform: '网易云音乐', ...songData };
  }

  throw new Error('无法识别的链接类型');
}

// 获取网易云歌单详情（含流派）
async function fetchNeteasePlaylist(id) {
  try {
    const response = await http.get('https://music.163.com/api/v6/playlist/detail', {
      params: { id, n: 1000 },
      headers: { 'Referer': 'https://music.163.com/' },
    });

    const playlist = response.data.playlist;
    if (!playlist) throw new Error('获取歌单信息失败');

    // 获取专辑流派信息
    const albumIds = [...new Set(playlist.tracks?.map(t => t.al?.id).filter(Boolean))].slice(0, 10);
    const albumGenres = await fetchNeteaseAlbumsGenres(albumIds);

    // 流派统计
    const genreStats = {};
    const yearStats = {};

    const songs = playlist.tracks?.map((t) => {
      const genre = t.al?.id ? albumGenres.get(String(t.al.id)) : null;
      const year = t.publishTime ? new Date(t.publishTime).getFullYear().toString() : null;

      if (genre) genreStats[genre] = (genreStats[genre] || 0) + 1;
      if (year) yearStats[year] = (yearStats[year] || 0) + 1;

      return {
        id: t.id,
        name: t.name,
        artists: t.ar?.map(a => a.name) || [],
        album: t.al?.name || '',
        albumId: t.al?.id,
        duration: formatDuration(t.dt),
        genre,
        year,
      };
    }) || [];

    return {
      name: playlist.name || '未知歌单',
      creator: playlist.creator?.nickname || '未知用户',
      description: playlist.description || '',
      cover: playlist.coverImgUrl,
      songCount: playlist.trackCount || songs.length,
      songs,
      genres: genreStats,
      years: yearStats,
      tags: playlist.tags || [],
      url: `https://music.163.com/playlist?id=${id}`,
    };
  } catch (error) {
    console.log('  详细API失败，使用简化版');
    return {
      name: '歌单 #' + id,
      creator: '未知',
      songCount: 0,
      songs: [],
      genres: {},
      tags: [],
    };
  }
}

// 获取网易云专辑流派
async function fetchNeteaseAlbumsGenres(albumIds) {
  const result = new Map();
  
  for (const albumId of albumIds.slice(0, 5)) { // 限制前5个
    try {
      const response = await http.get(`https://music.163.com/api/album/${albumId}`, {
        headers: { 'Referer': 'https://music.163.com/' },
      });
      
      const album = response.data.album;
      if (album?.tags?.length > 0) {
        result.set(String(albumId), album.tags.join('/'));
      } else if (album?.genre) {
        result.set(String(albumId), album.genre);
      }
    } catch (e) {}
  }
  
  return result;
}

// 获取网易云单曲详情（含流派）
async function fetchNeteaseSong(id) {
  // 获取歌曲详情
  const songRes = await http.get('https://music.163.com/api/song/detail', {
    params: { ids: `[${id}]` },
    headers: { 'Referer': 'https://music.163.com/' },
  });

  const song = songRes.data.songs?.[0];
  if (!song) throw new Error('获取歌曲详情失败');

  const album = song.album || song.al || {};
  const artists = song.artists || song.ar || [];
  const year = song.publishTime ? new Date(song.publishTime).getFullYear().toString() : null;

  // 获取专辑流派
  let genre = null;
  try {
    const albumRes = await http.get(`https://music.163.com/api/album/${album.id}`, {
      headers: { 'Referer': 'https://music.163.com/' },
    });
    const albumDetail = albumRes.data.album;
    if (albumDetail?.tags?.length > 0) {
      genre = albumDetail.tags.join('/');
    } else if (albumDetail?.genre) {
      genre = albumDetail.genre;
    }
  } catch (e) {}

  return {
    id,
    name: song.name,
    artists: artists.map(a => a.name),
    album: album.name || '',
    albumId: album.id,
    albumCover: album.picUrl || null,
    genre,
    year,
    url: `https://music.163.com/song?id=${id}`,
  };
}

// 识别平台
function detectPlatform(url) {
  const lower = url.toLowerCase();
  if (lower.includes('y.qq.com') || lower.includes('qq.com')) return 'qq';
  if (lower.includes('163cn.tv') || lower.includes('163.com') || lower.includes('netease')) return 'netease';
  return null;
}

// 主解析函数
async function parseMusicLink(url) {
  const platform = detectPlatform(url);
  if (!platform) {
    throw new Error('不支持的平台，仅支持 QQ音乐 和 网易云音乐');
  }

  if (platform === 'qq') {
    return await parseQQMusic(url);
  } else {
    return await parseNetease(url);
  }
}

// 打印结果
function printResult(result) {
  const icon = result.type === 'playlist' ? '📋' : '🎵';
  console.log(`${icon} 类型: ${result.type === 'playlist' ? '歌单' : '单曲'}`);
  console.log(`🎧 平台: ${result.platform}`);
  console.log(`📛 名称: ${result.name}`);
  
  if (result.type === 'playlist') {
    console.log(`👤 创建者: ${result.creator}`);
    if (result.description) console.log(`📝 描述: ${result.description.substring(0, 100)}${result.description.length > 100 ? '...' : ''}`);
    console.log(`🔢 歌曲数: ${result.songCount}`);
    if (result.cover) console.log(`🖼️  封面: ${result.cover}`);
    
    // 流派统计
    if (result.genres && Object.keys(result.genres).length > 0) {
      console.log(`\n🎸 流派分布:`);
      const sortedGenres = Object.entries(result.genres).sort((a, b) => b[1] - a[1]).slice(0, 5);
      sortedGenres.forEach(([genre, count]) => {
        const percentage = ((count / result.songCount) * 100).toFixed(1);
        console.log(`   • ${genre}: ${count}首 (${percentage}%)`);
      });
    }

    // 语言统计
    if (result.languages && Object.keys(result.languages).length > 0) {
      console.log(`\n🌐 语言分布:`);
      Object.entries(result.languages).forEach(([lang, count]) => {
        console.log(`   • ${lang}: ${count}首`);
      });
    }

    // 年代统计
    if (result.years && Object.keys(result.years).length > 0) {
      console.log(`\n📅 年代分布:`);
      const sortedYears = Object.entries(result.years).sort((a, b) => b[0] - a[0]).slice(0, 5);
      sortedYears.forEach(([year, count]) => {
        console.log(`   • ${year}年: ${count}首`);
      });
    }

    // 标签
    if (result.tags && result.tags.length > 0) {
      console.log(`\n🏷️  标签: ${result.tags.join(', ')}`);
    }
    
    // 歌曲列表
    if (result.songs.length > 0) {
      console.log('\n📃 歌曲列表 (前10首):');
      result.songs.slice(0, 10).forEach((s, i) => {
        const genreInfo = s.genre ? ` [${s.genre}]` : '';
        const yearInfo = s.year ? ` (${s.year})` : '';
        const langInfo = s.language ? ` <${s.language}>` : '';
        console.log(`   ${i + 1}. ${s.name} - ${s.artists.join(', ')}${genreInfo}${yearInfo}${langInfo} ${s.duration ? `(${s.duration})` : ''}`);
      });
    }
  } else {
    console.log(`🎤 歌手: ${result.artists.join(', ')}`);
    console.log(`💿 专辑: ${result.album || '未知'}`);
    if (result.genre) console.log(`🎸 流派: ${result.genre}`);
    if (result.language) console.log(`🌐 语言: ${result.language}`);
    if (result.year) console.log(`📅 发行年份: ${result.year}`);
    if (result.timePublic) console.log(`📆 发行日期: ${result.timePublic}`);
    if (result.albumCover) console.log(`🖼️  封面: ${result.albumCover}`);
  }
  
  console.log(`\n🔗 链接: ${result.url}`);
}

// CLI
const urls = process.argv.slice(2);

if (urls.length === 0) {
  console.log('🎵 音乐链接解析器（含流派信息）\n');
  console.log('支持: QQ音乐/网易云音乐 的单曲和歌单链接\n');
  console.log('使用方法:');
  console.log('  node scripts/test-music-parser.mjs <链接>\n');
  console.log('示例:');
  console.log('  QQ音乐歌单: node scripts/test-music-parser.mjs "https://c6.y.qq.com/base/fcgi-bin/u?__=e8l9kTx9ItPu"');
  console.log('  网易云歌单: node scripts/test-music-parser.mjs "https://163cn.tv/1oIsFR4"');
  console.log('  QQ音乐单曲: node scripts/test-music-parser.mjs "https://y.qq.com/n/ryqq/songDetail/0039MnYb0qxYhV"');
  console.log('  网易云单曲: node scripts/test-music-parser.mjs "https://music.163.com/song?id=421246023"\n');
  process.exit(0);
}

console.log('🎵 音乐链接解析器（含流派信息）\n');

(async () => {
  for (const url of urls) {
    console.log('='.repeat(70));
    console.log(`解析: ${url}`);
    console.log('='.repeat(70));
    
    try {
      const result = await parseMusicLink(url);
      printResult(result);
    } catch (error) {
      console.log(`❌ 失败: ${error.message}`);
    }
    
    console.log('\n');
  }
})();
