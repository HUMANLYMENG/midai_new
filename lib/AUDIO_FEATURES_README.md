# 歌曲音频特征获取功能

通过 **AcousticBrainz API** 获取歌曲的 **Tempo (BPM)** 和 **Key (调性)** 等音频特征。

## 特点

- ✅ **完全免费** - AcousticBrainz 是开源项目
- ✅ **无需 API Key** - 直接调用
- ✅ **数据准确** - 基于 Essentia 音频分析工具
- ✅ **支持批量** - 可一次性查询多首歌曲

## API 端点

### GET /api/audio-features

获取单首歌曲的音频特征。

**Query Parameters:**
- `song` (必填): 歌曲名称
- `artist` (可选): 艺人名称

**示例:**
```bash
curl "http://localhost:3002/api/audio-features?song=Shape%20of%20You&artist=Ed%20Sheeran"
```

**响应:**
```json
{
  "success": true,
  "data": {
    "mbid": "d7500dd6-b815-4299-88c6-3fbda358f1fc",
    "title": "Shape of You",
    "artist": "Ed Sheeran",
    "bpm": 96,
    "key": "F# minor",
    "scale": "minor",
    "duration": 277.18
  }
}
```

### POST /api/audio-features

单首精确查询或批量查询。

**单首查询:**
```bash
curl -X POST "http://localhost:3002/api/audio-features" \
  -H "Content-Type: application/json" \
  -d '{
    "song": "Shape of You",
    "artist": "Ed Sheeran"
  }'
```

**批量查询:**
```bash
curl -X POST "http://localhost:3002/api/audio-features" \
  -H "Content-Type: application/json" \
  -d '{
    "songs": [
      { "name": "Shape of You", "artist": "Ed Sheeran" },
      { "name": "Bohemian Rhapsody", "artist": "Queen" },
      { "name": "Blinding Lights", "artist": "The Weeknd" }
    ]
  }'
```

## 在代码中使用

### 服务端调用

```typescript
import { getTempoAndKey, MusicAudioFeaturesClient } from '@/lib/acousticbrainz';

// 方式 1: 使用便捷函数
const song = await getTempoAndKey("Shape of You", "Ed Sheeran");
console.log(song?.bpm);  // 96
console.log(song?.key);  // "F# minor"

// 方式 2: 使用客户端类
const client = new MusicAudioFeaturesClient();
const info = await client.getTempoAndKey("As It Was", "Harry Styles");
```

### 客户端调用

```typescript
// 使用 fetch 调用 API
async function getAudioFeatures(song: string, artist?: string) {
  const params = new URLSearchParams({ song });
  if (artist) params.append('artist', artist);
  
  const res = await fetch(`/api/audio-features?${params}`);
  const data = await res.json();
  
  if (data.success) {
    return data.data;
  }
  return null;
}

// 使用
const features = await getAudioFeatures("Shape of You", "Ed Sheeran");
console.log(features.bpm, features.key);
```

## 测试

运行测试脚本验证功能:

```bash
# 1. 启动开发服务器
npm run dev

# 2. 在另一个终端运行测试
node test-audio-features.mjs
```

## 工作原理

1. **搜索 MusicBrainz** - 通过歌曲名搜索对应的 MusicBrainz ID
2. **查询 AcousticBrainz** - 使用 MBID 获取音频分析数据
3. **提取特征** - 解析 BPM、Key 等信息

## 限制

- 仅支持 MusicBrainz 数据库中有的歌曲
- 仅支持 AcousticBrainz 数据库中已分析的歌曲
- API 有速率限制（每秒约 1 个请求）
- 批量查询最多 20 首歌曲

## 相关链接

- [AcousticBrainz 官网](https://acousticbrainz.org/)
- [MusicBrainz 官网](https://musicbrainz.org/)
- [Essentia 音频分析工具](https://essentia.upf.edu/)
