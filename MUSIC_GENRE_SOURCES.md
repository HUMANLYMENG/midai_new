# 🎵 音乐流派信息来源对比

本项目支持多种流派信息来源，每种都有其优缺点：

## 📊 各平台对比

| 特性 | QQ音乐 | 网易云音乐 | Spotify | MusicBrainz |
|------|--------|-----------|---------|-------------|
| **流派位置** | 歌曲.genre | 专辑.tags | 艺术家.genres | 录音/艺术家.tags |
| **准确性** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **覆盖范围** | 华语/亚洲为主 | 华语为主 | 欧美/全球 | 全球/古典/冷门 |
| **详细程度** | 单一标签 | 多标签 | 多标签 | 用户标签系统 |
| **请求限制** | 无 | 无 | 动态限制 | 1请求/秒 |
| **认证要求** | 无 | 无 | OAuth 2.0 | 无需认证 |
| **使用成本** | 免费 | 免费 | 免费额度 | 免费 |

## 🔍 各平台详情

### 1. QQ音乐（内置）

**数据来源**: 歌曲详情 API 中的 `genre` 字段

**优点**:
- 无需额外配置
- 华语歌曲覆盖好
- 响应速度快

**缺点**:
- 流派分类较粗（只有400个预定义分类）
- 部分歌曲无流派标签
- 以数字编码，需要映射表转换

**适用场景**: 华语流行歌曲

```typescript
// 示例返回
{ genre: "嘻哈", language: "韩语", year: "2024" }
```

---

### 2. 网易云音乐（内置）

**数据来源**: 专辑详情 API 中的 `tags` 字段

**优点**:
- 无需额外配置
- 部分专辑有多标签

**缺点**:
- 很多专辑无标签
- 标签质量参差不齐
- 依赖用户编辑

**适用场景**: 热门专辑

```typescript
// 示例返回
{ tags: ["流行", "华语", "失恋"] }
```

---

### 3. Spotify API

**数据来源**: 艺术家详情中的 `genres` 字段

**获取方式**:
1. OAuth 2.0 Client Credentials Flow 认证
2. 搜索曲目获取艺术家 ID
3. 批量查询艺术家详情

**优点**:
- 流派标签最丰富准确
- 现代音乐覆盖好
- 官方维护数据质量

**缺点**:
- 需要 Client ID/Secret
- 华语冷门歌曲覆盖差
- 古典音乐流派不详细

**适用场景**: 欧美流行/现代音乐

```typescript
// 示例返回
{ genres: ["classic rock", "mellow gold", "rock", "singer-songwriter"] }
```

**配置**:
```env
SPOTIFY_CLIENT_ID="your-client-id"
SPOTIFY_CLIENT_SECRET="your-client-secret"
```

获取方式: https://developer.spotify.com/dashboard

---

### 4. MusicBrainz API

**数据来源**: 录音/艺术家/发行版的 `tags` 和 `genres` 字段

**获取方式**:
1. 搜索录音 (recording)
2. 获取详情（包含 tags + genres）
3. 同时查询艺术家和发行版

**优点**:
- 开源社区维护
- 冷门/古典音乐覆盖最好
- 用户标签系统丰富
- 无需认证

**缺点**:
- 严格限速 1请求/秒
- 数据质量参差不齐
- 需要设置 User-Agent

**适用场景**: 古典音乐、冷门歌曲、爵士乐

```typescript
// 示例返回
{ genres: ["rock", "pop", "classic rock", "psychedelic rock", "1970s"] }
```

**配置**:
```env
MUSICBRAINZ_APP_NAME="YourAppName"
MUSICBRAINZ_APP_VERSION="1.0.0"
MUSICBRAINZ_CONTACT="your@email.com"
```

---

## 🎯 推荐使用策略

### 场景 1: 快速获取（默认）
只使用内置来源（QQ音乐/网易云）

```typescript
import { parseMusicLink } from '@/lib/music-link-parser';
const result = await parseMusicLink(url);
```

### 场景 2: 欧美音乐
优先使用 Spotify

```typescript
import { parseMusicLinkEnhanced } from '@/lib/music-link-parser-enhanced';
const result = await parseMusicLinkEnhanced(url, {
  enhanceGenres: true,
  preferGenreSource: 'spotify',
  limitEnhanced: 5,
});
```

### 场景 3: 古典/冷门音乐
优先使用 MusicBrainz

```typescript
const result = await parseMusicLinkEnhanced(url, {
  enhanceGenres: true,
  preferGenreSource: 'musicbrainz',
  limitEnhanced: 5,
});
```

### 场景 4: 全面获取
自动选择最佳来源

```typescript
const result = await parseMusicLinkEnhanced(url, {
  enhanceGenres: true,
  preferGenreSource: 'auto', // 优先 Spotify，失败时用 MusicBrainz
  limitEnhanced: 10,
});
```

---

## 📁 文件结构

```
lib/
├── music-link-parser.ts           # 基础解析器（QQ音乐/网易云）
├── music-link-parser-enhanced.ts  # 增强版（集成流派服务）
└── genre-service.ts               # 流派服务（Spotify + MusicBrainz）

app/api/
├── parse-music-link/route.ts      # 基础解析 API
└── genres/route.ts                # 流派查询 API

scripts/
└── test-genre-service.mjs         # 流派服务测试脚本
```

---

## 🔌 API 使用

### 查询单首歌曲流派

```bash
# 使用自动选择
GET /api/genres?track=Imagine&artist=John+Lennon

# 指定 Spotify
GET /api/genres?track=Imagine&artist=John+Lennon&prefer=spotify

# 指定 MusicBrainz
GET /api/genres?track=Imagine&artist=John+Lennon&prefer=musicbrainz
```

### 批量查询

```bash
POST /api/genres
Content-Type: application/json

{
  "tracks": [
    { "name": "Imagine", "artist": "John Lennon" },
    { "name": "Bohemian Rhapsody", "artist": "Queen" }
  ],
  "prefer": "auto"
}
```

### 解析链接并增强流派

```typescript
// 前端代码
const response = await fetch('/api/parse-music-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    url: 'https://c6.y.qq.com/base/fcgi-bin/u?__=e8l9kTx9ItPu',
    enhanceGenres: true,
    limitEnhanced: 5,
  }),
});

const result = await response.json();
// result.data.genreStats.fromExternal 包含 Spotify/MusicBrainz 的流派统计
```

---

## ⚠️ 注意事项

1. **速率限制**:
   - Spotify: 动态限制（建议缓存结果）
   - MusicBrainz: 严格 1请求/秒（已内置限速）

2. **数据质量**:
   - 不是所有歌曲都有流派标签
   - 流派命名可能不一致（如 "rock" vs "摇滚"）
   - 建议合并多个来源的结果

3. **语言**:
   - 中文歌曲在 Spotify 上可能无流派
   - 英文歌曲在 QQ音乐上可能流派分类不准确

4. **缓存建议**:
   - 流派信息不经常变化，建议缓存 7-30 天
   - 可以在数据库中建立 genre_cache 表
