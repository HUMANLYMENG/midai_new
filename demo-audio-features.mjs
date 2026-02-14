#!/usr/bin/env node
/**
 * 音频特征获取功能演示
 * 直接演示 lib/acousticbrainz.ts 的功能，无需启动服务器
 */

// 从模块导入（需要 Node.js 20+ 支持 TypeScript）
async function runDemo() {
  console.log('\n🎵 歌曲音频特征获取功能演示\n');
  console.log('=' .repeat(60));

  // 示例：直接调用 AcousticBrainz API
  const mbid = 'd7500dd6-b815-4299-88c6-3fbda358f1fc'; // Ed Sheeran - Shape of You

  console.log('\n1️⃣  直接查询 AcousticBrainz API');
  console.log(`   MBID: ${mbid}`);
  console.log('   歌曲: Ed Sheeran - Shape of You\n');

  try {
    const response = await fetch(
      `https://acousticbrainz.org/api/v1/${mbid}/low-level`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (response.ok) {
      const data = await response.json();
      
      console.log('   ✅ 成功获取音频特征！\n');
      console.log('   ┌─────────────────────────────────────┐');
      console.log(`   │  🥁 BPM (Tempo):  ${Math.round(data.rhythm?.bpm || 0).toString().padEnd(16)} │`);
      console.log(`   │  🎹 Key (调性):    ${`${data.tonal?.key_key} ${data.tonal?.key_scale}`.padEnd(16)} │`);
      console.log(`   │  ⏱️  时长:         ${(data.metadata?.audio_properties?.length || 0).toFixed(1)}s${''.padEnd(12)} │`);
      console.log(`   │  🔗 MBID:          ${mbid.slice(0, 8)}...${''.padEnd(10)} │`);
      console.log('   └─────────────────────────────────────┘');
    } else if (response.status === 404) {
      console.log('   ❌ 该歌曲在 AcousticBrainz 中没有数据');
    } else {
      console.log(`   ❌ API 错误: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ 请求失败: ${error.message}`);
  }

  // 示例：通过 MusicBrainz 搜索
  console.log('\n\n2️⃣  通过 MusicBrainz 搜索歌曲');
  console.log('   搜索: "Bohemian Rhapsody" by Queen\n');

  try {
    const searchParams = new URLSearchParams({
      query: 'Bohemian Rhapsody AND artist:"Queen"',
      fmt: 'json',
      limit: '3',
    });

    const searchResponse = await fetch(
      `https://musicbrainz.org/ws/2/recording?${searchParams}`,
      {
        headers: {
          'User-Agent': 'MidAI/1.0.0 (demo)',
          'Accept': 'application/json',
        },
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const recordings = searchData.recordings || [];

      console.log(`   ✅ 找到 ${recordings.length} 个录音\n`);

      for (let i = 0; i < Math.min(3, recordings.length); i++) {
        const rec = recordings[i];
        console.log(`   ${i + 1}. ${rec.title}`);
        console.log(`      ID: ${rec.id}`);
        
        // 等待 1.1 秒避免速率限制
        await new Promise(resolve => setTimeout(resolve, 1100));
        
        // 查询 AcousticBrainz
        const abResponse = await fetch(
          `https://acousticbrainz.org/api/v1/${rec.id}/low-level`,
          { headers: { 'Accept': 'application/json' } }
        );

        if (abResponse.ok) {
          const features = await abResponse.json();
          console.log(`      BPM: ${Math.round(features.rhythm?.bpm || 0)}`);
          console.log(`      Key: ${features.tonal?.key_key} ${features.tonal?.key_scale}`);
        } else if (abResponse.status === 404) {
          console.log('      (AcousticBrainz 无数据)');
        }
        console.log();
      }
    }
  } catch (error) {
    console.log(`   ❌ 搜索失败: ${error.message}`);
  }

  console.log('='.repeat(60));
  console.log('\n✨ 演示完成！\n');
  console.log('使用方式:');
  console.log('  1. 服务端: import { getTempoAndKey } from "@/lib/acousticbrainz"');
  console.log('  2. API: GET /api/audio-features?song=xxx&artist=xxx');
  console.log('  3. 完整测试: npm run dev && node test-audio-features.mjs\n');
}

runDemo().catch(console.error);
