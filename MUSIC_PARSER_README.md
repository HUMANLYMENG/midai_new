# 🎵 音乐分享链接解析器

支持 **QQ音乐** 和 **网易云音乐** 的单曲、歌单、专辑链接解析。

## ✨ 功能特性

- ✅ 短链接自动跳转解析
- ✅ 支持 **单曲** 和 **歌单/播放列表**
- ✅ 自动识别平台（QQ音乐/网易云）
- ✅ 获取完整歌曲信息：歌名、歌手、专辑、封面、时长
- ✅ 提供 HTTP API 和 JavaScript API 两种方式

## 🔗 支持的链接格式

### QQ音乐
```
短链接:    https://c6.y.qq.com/base/fcgi-bin/u?__=e8l9kTx9ItPu
歌单:      https://y.qq.com/n/ryqq/playlist/9661641626
单曲:      https://y.qq.com/n/ryqq/songDetail/0039MnYb0qxYhV
```

### 网易云音乐
```
短链接:    https://163cn.tv/1oIsFR4
歌单:      https://music.163.com/playlist?id=12769548936
单曲:      https://music.163.com/song?id=123456
```

## 📦 使用方法

### 1. 命令行测试

```bash
# 安装依赖
npm install

# 测试解析
node scripts/test-music-parser.mjs "https://c6.y.qq.com/base/fcgi-bin/u?__=e8l9kTx9ItPu"
node scripts/test-music-parser.mjs "https://163cn.tv/1oIsFR4"
```

### 2. HTTP API

**POST** `/api/parse-music-link`

```bash
curl -X POST http://localhost:3002/api/parse-music-link \
  -H "Content-Type: application/json" \
  -d '{"url": "https://c6.y.qq.com/base/fcgi-bin/u?__=e8l9kTx9ItPu"}'
```

**GET** `/api/parse-music-link?url=xxx`

```bash
curl "http://localhost:3002/api/parse-music-link?url=https://163cn.tv/1oIsFR4"
```

### 3. JavaScript API

```typescript
import { parseMusicLink, MusicLinkParser } from '@/lib/music-link-parser';

// 方法1: 使用便捷函数
const result = await parseMusicLink('https://c6.y.qq.com/base/fcgi-bin/u?__=e8l9kTx9ItPu');

if (result.success) {
  console.log(result.data.name);      // 歌单/歌曲名称
  console.log(result.data.songs);     // 歌曲列表（歌单时）
  console.log(result.data.artists);   // 歌手（单曲时）
}

// 方法2: 使用类实例（可复用）
const parser = new MusicLinkParser();
const result2 = await parser.parse('https://163cn.tv/1oIsFR4');
```

## 📋 返回数据结构

### 歌单 (playlist)

```json
{
  "success": true,
  "type": "playlist",
  "platform": "qq",
  "data": {
    "id": "9661641626",
    "name": "新建歌单",
    "creator": "冲浪冠军",
    "description": "歌单描述",
    "cover": "https://...",
    "songCount": 193,
    "songs": [
      {
        "id": "0039MnYb0qxYhV",
        "name": "歌曲名",
        "artists": ["歌手名"],
        "album": "专辑名",
        "duration": "3:45"
      }
    ],
    "url": "https://y.qq.com/n/ryqq/playlist/9661641626"
  }
}
```

### 单曲 (song)

```json
{
  "success": true,
  "type": "song",
  "platform": "netease",
  "data": {
    "id": "123456",
    "name": "歌曲名",
    "artists": ["歌手1", "歌手2"],
    "album": "专辑名",
    "albumCover": "https://...",
    "url": "https://music.163.com/song?id=123456"
  }
}
```

## 🔧 技术实现

### 解析原理

1. **短链接跳转**: 使用 axios 自动跟随 HTTP 重定向
2. **页面数据提取**: 
   - QQ音乐: 从 `window.__ssrFirstPageData__` 提取
   - 网易云: 从 `window.__REDUX_STATE__` 提取
3. **API 调用**: 调用官方公开 API 获取详细信息

### 关键 API

| 平台 | API 端点 |
|------|----------|
| QQ音乐歌单 | `c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg` |
| QQ音乐单曲 | `u.y.qq.com/cgi-bin/musicu.fcg` |
| 网易云歌单 | `music.163.com/api/v6/playlist/detail` |
| 网易云单曲 | `music.163.com/api/song/detail` |

## ⚠️ 注意事项

1. **链接有效性**: 部分短链接有过期时间，过期后无法解析
2. **版权限制**: 部分歌曲信息可能因版权原因无法获取
3. **频率限制**: 频繁调用可能会被平台限制，建议添加缓存
4. **仅供学习**: 请遵守各平台的服务条款

## 📁 文件结构

```
lib/
  └── music-link-parser.ts    # 核心解析库
app/api/parse-music-link/
  └── route.ts                # HTTP API 路由
scripts/
  └── test-music-parser.mjs   # 命令行测试脚本
MUSIC_PARSER_README.md         # 本文档
```
