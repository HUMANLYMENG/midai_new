# 音乐流派信息获取 API 指南

本文档详细介绍如何使用 Spotify API 和 MusicBrainz API 获取歌曲/专辑的流派信息。

## 目录

1. [Spotify API](#spotify-api)
2. [MusicBrainz API](#musicbrainz-api)
3. [API 对比](#api-对比)
4. [集成建议](#集成建议)
5. [常见问题](#常见问题)

---

## Spotify API

### 1. 申请开发者账号

1. 访问 https://developer.spotify.com/dashboard
2. 使用 Spotify 账号登录
3. 点击 "Create app" 创建应用
4. 获取 `Client ID` 和 `Client Secret`

### 2. 认证流程

Spotify API 使用 **OAuth 2.0 Client Credentials Flow**，不需要用户交互：

```
┌─────────────┐                                    ┌─────────────────┐
│  你的应用    │──(1) POST /api/token──────────────▶│  Spotify Auth   │
│             │    Authorization: Basic xxx        │    Server       │
│             │◄────────(2) access_token───────────│                 │
│             │                                    └─────────────────┘
│             │                                              │
│             │──(3) GET /v1/search?q=xxx ─────────────────▶│
│             │    Authorization: Bearer {access_token}      │
│             │◄────────(4) search results──────────────────│
└─────────────┘                                             │
                                                     ┌──────┴──────┐
                                                     │ Spotify API │
                                                     │   Server    │
                                                     └─────────────┘
```

### 3. 核心 API 端点

| 端点 | 用途 | 文档 |
|------|------|------|
| `POST /api/token` | 获取 access token | [认证](https://developer.spotify.com/documentation/general/guides/authorization/client-credentials/) |
| `GET /v1/search` | 搜索歌曲/艺术家/专辑 | [搜索](https://developer.spotify.com/documentation/web-api/reference/search) |
| `GET /v1/artists/{id}` | 获取艺术家详情（含流派） | [艺术家](https://developer.spotify.com/documentation/web-api/reference/get-an-artist) |
| `GET /v1/tracks/{id}` | 获取歌曲详情 | [歌曲](https://developer.spotify.com/documentation/web-api/reference/get-track) |
| `GET /v1/albums/{id}` | 获取专辑详情 | [专辑](https://developer.spotify.com/documentation/web-api/reference/get-an-album) |

### 4. 流派数据位置

**注意：** Spotify 的流派信息仅在 **Artist** 对象中提供，Track 和 Album 对象中没有直接的流派字段。

```json
// GET /v1/artists/{id}
{
  "id": "0TnOYISbd1XYRBk9myaseg",
  "name": "Pitbull",
  "genres": [
    "dance pop",
    "miami hip hop",
    "pop"
  ],
  "popularity": 86,
  ...
}
```

**获取歌曲流派的流程：**
1. 搜索歌曲 → 获取 track 对象
2. 从 track 中提取 artists 列表
3. 对每个 artist 调用 `GET /v1/artists/{id}`
4. 合并所有艺术家的流派

### 5. 代码示例

```typescript
import { SpotifyGenreClient } from './music-genre-api';

const spotify = new SpotifyGenreClient(
  process.env.SPOTIFY_CLIENT_ID!,
  process.env.SPOTIFY_CLIENT_SECRET!
);

// 获取歌曲流派
const result = await spotify.getTrackGenres('Bohemian Rhapsody', 'Queen');
console.log(result);
// {
//   track: 'Bohemian Rhapsody',
//   artists: ['Queen'],
//   genres: ['classic rock', 'glam rock', 'rock'],
//   source: 'spotify'
// }
```

---

## MusicBrainz API

### 1. 基本介绍

- **开放 API**：无需申请账号或 API Key
- **User-Agent 要求**：必须设置有意义的 User-Agent 头
- **非盈利项目**：由 MetaBrainz 基金会运营

### 2. 速率限制

**重要！** MusicBrainz 有严格的速率限制：

| 限制类型 | 规则 | 超出限制后果 |
|---------|------|-------------|
| IP 地址 | 平均 1 请求/秒 | 返回 503 错误，所有请求被拒绝 |
| 用户代理 | 平均 50 请求/秒（对于良好行为的应用） | 返回 503 错误 |
| 全局 | 300 请求/秒 | 返回 503 错误 |

### 3. User-Agent 格式

必须包含应用名称、版本和联系方式：

```
ApplicationName/1.0.0 ( contact@example.com )
```

**不良 User-Agent 示例（会被限制）：**
- `Java`
- `Python-urllib`
- `Apache-HttpClient`
- （空白）

### 4. 核心 API 端点

| 端点 | 用途 | 示例 |
|------|------|------|
| `/ws/2/recording` | 搜索录音（歌曲） | `?query=Hotel+California&fmt=json` |
| `/ws/2/release` | 搜索专辑 | `?query=Dark+Side+of+the+Moon&fmt=json` |
| `/ws/2/artist` | 搜索艺术家 | `?query=The+Beatles&fmt=json` |
| `/ws/2/recording/{mbid}` | 获取录音详情 | `?inc=tags+genres&fmt=json` |
| `/ws/2/release/{mbid}` | 获取专辑详情 | `?inc=tags+genres&fmt=json` |
| `/ws/2/artist/{mbid}` | 获取艺术家详情 | `?inc=tags+genres&fmt=json` |

### 5. 流派数据位置

MusicBrainz 的流派信息分布在多个地方：

```json
// 实体对象中的 genres 字段（社区投票的流派）
{
  "id": "...",
  "title": "Hotel California",
  "genres": [
    { "name": "classic rock", "count": 15 },
    { "name": "rock", "count": 12 }
  ],
  "tags": [
    { "name": "1976", "count": 5 },
    { "name": "soft rock", "count": 3 }
  ]
}
```

**流派 vs 标签：**
- **Genres**: 经过社区审核的官方流派标签
- **Tags**: 用户自由添加的标签，可能包含流派

### 6. 代码示例

```typescript
import { MusicBrainzGenreClient } from './music-genre-api';

const mb = new MusicBrainzGenreClient(
  'MyApp',           // 应用名称
  '1.0.0',           // 版本
  'me@example.com'   // 联系方式
);

// 获取歌曲流派（包含置信度）
const result = await mb.getTrackGenres('Hotel California', 'Eagles');
console.log(result);
// {
//   track: 'Hotel California',
//   artists: ['Eagles'],
//   genres: ['classic rock', 'rock', 'soft rock'],
//   source: 'musicbrainz',
//   confidence: { 'classic rock': 15, 'rock': 12, 'soft rock': 3 }
// }
```

---

## API 对比

### 准确度

| 维度 | Spotify | MusicBrainz |
|------|---------|-------------|
| **流派覆盖** | ⭐⭐⭐ 流行/现代音乐更全 | ⭐⭐⭐ 全流派覆盖，包括冷门音乐 |
| **流派粒度** | ⭐⭐⭐ 非常具体（如 "miami hip hop"） | ⭐⭐☆ 较宽泛（如 "rock", "pop"） |
| **数据准确性** | ⭐⭐⭐ 商业数据，较准确 | ⭐⭐⭐ 社区维护，可能更全面 |
| **更新频率** | ⭐⭐⭐ 商业驱动，更新快 | ⭐⭐☆ 依赖社区贡献 |
| **中文音乐** | ⭐⭐⭐ 较好的中文支持 | ⭐★☆ 中文数据较少 |

**结论：**
- 流行音乐/新歌：Spotify 更准确
- 古典/爵士/冷门音乐：MusicBrainz 更全面
- 建议两者结合使用

### 易用性

| 维度 | Spotify | MusicBrainz |
|------|---------|-------------|
| **认证** | 需要 OAuth 流程 | 无需认证 |
| **注册** | 需要开发者账号 | 不需要 |
| **API 设计** | RESTful，设计良好 | RESTful，设计良好 |
| **文档** | ⭐⭐⭐ 非常详细 | ⭐⭐☆ 较详细 |
| **SDK/库** | ⭐⭐⭐ 官方 SDK 多 | ⭐⭐☆ 社区库多 |
| **请求限制** | 较宽松 | 1 req/sec，严格 |

**结论：**
- 快速原型开发：MusicBrainz 更容易上手
- 生产环境：Spotify 更稳定，但需要更多配置

### 请求限制

| API | 限制 | 商业使用 | 备注 |
|-----|------|---------|------|
| **Spotify** | 动态限制，基于 30 秒滑动窗口 | 需要申请扩展配额 | 超出返回 429 + Retry-After |
| **MusicBrainz** | 1 请求/秒/IP | 非商业免费，商业需联系 | 超出返回 503 |

**Spotify 详细限制：**
- 开发模式：较低限制
- 扩展配额模式：较高限制
- 可批量请求（如一次获取多个艺术家）

**MusicBrainz 详细限制：**
- 硬限制：1 请求/秒
- 建议间隔：1.1-1.5 秒/请求
- 可通过设置合理的 User-Agent 获得更好待遇

---

## 集成建议

### 方案 1：自动回退（推荐）

```typescript
import { MusicGenreService } from './music-genre-api';

const service = new MusicGenreService({
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID!,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
  },
  musicbrainz: {
    appName: 'MyApp',
    appVersion: '1.0.0',
    contactInfo: 'me@example.com',
  },
});

// 优先 Spotify，失败或没有流派数据时回退到 MusicBrainz
const genres = await service.getTrackGenres('Song Name', 'Artist');
```

### 方案 2：按音乐类型选择

```typescript
async function getGenresByType(trackName: string, artistName: string, type: 'pop' | 'classical' | 'jazz') {
  if (type === 'pop') {
    return spotify.getTrackGenres(trackName, artistName);
  } else {
    // 古典、爵士等使用 MusicBrainz
    return musicbrainz.getTrackGenres(trackName, artistName);
  }
}
```

### 方案 3：数据融合

```typescript
async function getMergedGenres(trackName: string, artistName: string) {
  const [spotifyResult, mbResult] = await Promise.allSettled([
    spotify.getTrackGenres(trackName, artistName),
    musicbrainz.getTrackGenres(trackName, artistName),
  ]);

  const allGenres = new Set<string>();
  
  if (spotifyResult.status === 'fulfilled' && spotifyResult.value) {
    spotifyResult.value.genres.forEach(g => allGenres.add(g));
  }
  
  if (mbResult.status === 'fulfilled' && mbResult.value) {
    mbResult.value.genres.forEach(g => allGenres.add(g));
  }

  return Array.from(allGenres);
}
```

---

## 常见问题

### Q: Spotify API 返回的流派为空？

**可能原因：**
1. 艺术家本身没有流派标签（较罕见）
2. 艺术家是新人，数据尚未完善
3. 你查询的是 Track，而不是 Artist

**解决方案：**
```typescript
// 错误：直接从 track 获取
const track = await spotify.searchTrack('song', 'artist');
console.log(track.genres); // undefined!

// 正确：从 artist 获取
const genres = await spotify.getArtistGenres(track.artists[0].id);
console.log(genres); // ['pop', 'dance pop', ...]
```

### Q: MusicBrainz 返回 503 错误？

**原因：** 请求频率过高，触发了速率限制。

**解决方案：**
1. 确保请求间隔至少 1 秒
2. 检查 User-Agent 是否正确设置
3. 实现指数退避重试

```typescript
async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url);
    if (response.status !== 503) return response;
    
    const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error('Max retries exceeded');
}
```

### Q: 如何缓存 API 结果？

建议对 API 结果进行缓存，减少重复请求：

```typescript
import { LRUCache } from 'lru-cache';

const genreCache = new LRUCache({
  max: 1000,
  ttl: 1000 * 60 * 60 * 24, // 24 小时
});

async function getCachedGenres(trackName: string, artistName: string) {
  const key = `${trackName}:${artistName}`;
  if (genreCache.has(key)) {
    return genreCache.get(key);
  }
  
  const result = await service.getTrackGenres(trackName, artistName);
  genreCache.set(key, result);
  return result;
}
```

### Q: 商业项目可以使用这些 API 吗？

| API | 商业使用 | 备注 |
|-----|---------|------|
| **Spotify** | ✅ 可以 | 免费，但需要申请扩展配额 |
| **MusicBrainz** | ⚠️ 需要联系 | 非商业免费，商业需购买许可证 |

---

## 参考资料

- [Spotify Web API 文档](https://developer.spotify.com/documentation/web-api)
- [MusicBrainz API 文档](https://musicbrainz.org/doc/MusicBrainz_API)
- [MusicBrainz 速率限制](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting)
- [musicbrainz-api Node.js 库](https://github.com/Borewit/musicbrainz-api)
