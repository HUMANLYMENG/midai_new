#!/usr/bin/env node
/**
 * 音频特征获取功能测试
 * 演示如何使用 /api/audio-features API 获取歌曲的 Tempo 和 Key
 */

const BASE_URL = 'http://localhost:3002';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 测试 GET API
async function testGetAPI(song, artist) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`GET /api/audio-features`, 'cyan');
  log(`Song: "${song}"${artist ? ` by "${artist}"` : ''}`, 'cyan');
  log(`${'='.repeat(60)}\n`, 'cyan');

  const params = new URLSearchParams({ song });
  if (artist) params.append('artist', artist);

  const url = `${BASE_URL}/api/audio-features?${params}`;
  log(`请求: ${url}`, 'yellow');

  try {
    const response = await fetch(url);
    const data = await response.json();

    log(`状态码: ${response.status}`, response.ok ? 'green' : 'red');

    if (data.success && data.data) {
      printSongInfo(data.data);
    } else {
      log(`错误: ${data.error}`, 'red');
    }

    return data;
  } catch (error) {
    log(`请求失败: ${error.message}`, 'red');
    return null;
  }
}

// 测试 POST API (单首)
async function testPostSingle(song, artist) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`POST /api/audio-features (单首)`, 'cyan');
  log(`Song: "${song}"${artist ? ` by "${artist}"` : ''}`, 'cyan');
  log(`${'='.repeat(60)}\n`, 'cyan');

  const url = `${BASE_URL}/api/audio-features`;
  log(`请求: ${url}`, 'yellow');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ song, artist }),
    });

    const data = await response.json();
    log(`状态码: ${response.status}`, response.ok ? 'green' : 'red');

    if (data.success && data.data) {
      printSongInfo(data.data);
    } else {
      log(`错误: ${data.error}`, 'red');
    }

    return data;
  } catch (error) {
    log(`请求失败: ${error.message}`, 'red');
    return null;
  }
}

// 测试 POST API (批量)
async function testPostBatch(songs) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`POST /api/audio-features (批量)`, 'cyan');
  log(`歌曲数量: ${songs.length}`, 'cyan');
  log(`${'='.repeat(60)}\n`, 'cyan');

  songs.forEach((s, i) => {
    log(`  ${i + 1}. ${s.name}${s.artist ? ` - ${s.artist}` : ''}`, 'yellow');
  });
  console.log();

  const url = `${BASE_URL}/api/audio-features`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songs }),
    });

    const data = await response.json();
    log(`状态码: ${response.status}`, response.ok ? 'green' : 'red');

    if (data.success && data.data) {
      log(`\n结果:\n`, 'green');
      data.data.forEach((song, i) => {
        if (song) {
          log(`${i + 1}. ${song.title} - ${song.artist}`, 'magenta');
          log(`   BPM: ${song.bpm}, Key: ${song.key}`, 'cyan');
        } else {
          log(`${i + 1}. (未找到)`, 'red');
        }
      });
    } else {
      log(`错误: ${data.error}`, 'red');
    }

    return data;
  } catch (error) {
    log(`请求失败: ${error.message}`, 'red');
    return null;
  }
}

// 打印歌曲信息
function printSongInfo(song) {
  log(`\n✓ 成功获取音频特征！`, 'green');
  log(`  🎵 标题: ${song.title}`, 'cyan');
  log(`  👤 艺人: ${song.artist}`, 'cyan');
  log(`  🥁 BPM:  ${song.bpm}`, 'magenta');
  log(`  🎹 Key:  ${song.key}`, 'magenta');
  log(`  ⏱️  时长: ${song.duration?.toFixed(1)}s`, 'cyan');
  log(`  🔗 MBID: ${song.mbid}`, 'yellow');
}

// 运行所有测试
async function runTests() {
  log('\n🎵 歌曲音频特征获取功能测试', 'blue');
  log('使用 AcousticBrainz + MusicBrainz API (免费)\n', 'blue');

  // 先测试服务是否启动
  try {
    await fetch(BASE_URL);
  } catch {
    log(`\n❌ 错误: 无法连接到 ${BASE_URL}`, 'red');
    log('请先启动开发服务器: npm run dev\n', 'yellow');
    return;
  }

  // 测试 1: GET API - 简单查询
  await testGetAPI('Shape of You', 'Ed Sheeran');

  // 测试 2: GET API - 只有歌曲名
  await testGetAPI('Bohemian Rhapsody');

  // 测试 3: POST API - 单首
  await testPostSingle('Blinding Lights', 'The Weeknd');

  // 测试 4: POST API - 批量
  await testPostBatch([
    { name: 'As It Was', artist: 'Harry Styles' },
    { name: 'Uptown Funk', artist: 'Mark Ronson' },
    { name: 'Imagine', artist: 'John Lennon' },
  ]);

  log(`\n${'='.repeat(60)}`, 'blue');
  log('所有测试完成！', 'blue');
  log(`${'='.repeat(60)}\n`, 'blue');
}

runTests().catch(console.error);
