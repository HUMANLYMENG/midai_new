#!/usr/bin/env node
/**
 * AcousticBrainz API 测试脚本
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 测试 AcousticBrainz API
async function testAcousticBrainzAPI() {
  log('\n🎵 AcousticBrainz API 测试开始\n', 'blue');

  // 使用一个已知的 MusicBrainz ID 进行测试
  // Ed Sheeran - Shape of You: https://musicbrainz.org/work/abc123
  // 使用示例 MBID: 12345678-1234-1234-1234-123456789abc (需要真实存在的 MBID)
  
  // 先用搜索找到一些歌曲
  log('测试 1: 搜索 MusicBrainz 录音', 'cyan');
  
  const searchParams = new URLSearchParams({
    query: 'Shape of You AND artist:"Ed Sheeran"',
    fmt: 'json',
    limit: '3',
  });

  try {
    const searchResponse = await fetch(
      `https://musicbrainz.org/ws/2/recording?${searchParams}`,
      {
        headers: {
          'User-Agent': 'MidAI/1.0.0 (hello@example.com)',
          'Accept': 'application/json',
        },
      }
    );

    log(`MusicBrainz 搜索状态: ${searchResponse.status}`, searchResponse.ok ? 'green' : 'red');

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const recordings = searchData.recordings || [];
      
      log(`找到 ${recordings.length} 个录音`, 'green');

      if (recordings.length > 0) {
        // 测试每个录音的 AcousticBrainz 数据
        for (const recording of recordings.slice(0, 3)) {
          log(`\n测试录音: ${recording.title} (ID: ${recording.id})`, 'yellow');
          
          // 等待 1 秒避免速率限制
          await new Promise(resolve => setTimeout(resolve, 1100));
          
          // 查询 AcousticBrainz
          const abResponse = await fetch(
            `https://acousticbrainz.org/api/v1/${recording.id}/low-level`,
            {
              headers: { 'Accept': 'application/json' },
            }
          );

          log(`AcousticBrainz 状态: ${abResponse.status}`, abResponse.ok ? 'green' : 'red');

          if (abResponse.ok) {
            const features = await abResponse.json();
            
            log('✓ 成功获取音频特征！', 'green');
            log(`  BPM: ${Math.round(features.rhythm?.bpm || 0)}`, 'cyan');
            log(`  Key: ${features.tonal?.key_key} ${features.tonal?.key_scale}`, 'cyan');
            log(`  时长: ${features.metadata?.audio_properties?.length?.toFixed(2)}s`, 'cyan');
          } else if (abResponse.status === 404) {
            log('  该录音在 AcousticBrainz 中没有数据', 'yellow');
          }
        }
      }
    }

  } catch (error) {
    log(`测试失败: ${error.message}`, 'red');
  }

  log(`\n${'='.repeat(60)}`, 'blue');
  log('测试完成', 'blue');
  log(`${'='.repeat(60)}\n`, 'blue');
}

// 运行测试
testAcousticBrainzAPI().catch(console.error);
