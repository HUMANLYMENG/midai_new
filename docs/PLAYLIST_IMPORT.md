# 🎵 歌单导入功能文档

## 功能概述

支持从 **QQ音乐** 和 **网易云音乐** 导入歌单到 Midai 系统，自动创建单曲(Track)和对应专辑(Album)。

## 🎯 核心特性

- ✅ 解析 QQ音乐/网易云音乐歌单链接
- ✅ 自动创建单曲 (Track) 到数据库
- ✅ 自动创建/关联专辑 (Album)
- ✅ 支持流派信息（从QQ/网易 + MusicBrainz 增强）
- ✅ 智能去重（避免重复导入）
- ✅ 批量导入（支持50+首歌曲）

## 📊 数据映射

### 从平台到 Midai 数据库

| 平台字段 | Midai Track | Midai Album |
|---------|-------------|-------------|
| 歌曲名 | `title` | - |
| 歌手 | `artist` | `artist` |
| 专辑名 | `albumName` | `title` |
| 发行年份 | `releaseDate` | `releaseDate` |
| 流派 | `genre` | `genre` |
| 时长 | `length` | - |
| 封面 | `coverUrl` | `coverUrl` |

## 🚀 使用方式

### 1. 网页界面导入

1. 进入 Collection 页面
2. 点击工具栏的 **🔗 Link** 按钮
3. 粘贴歌单链接
4. 预览歌单内容
5. 点击导入

### 2. API 直接调用

#### 解析歌单（预览）
```bash
POST /api/playlist/parse
Content-Type: application/json

{
  "url": "https://c6.y.qq.com/base/fcgi-bin/u?__=xxx"
}
```

响应：
```json
{
  "success": true,
  "platform": "QQ音乐",
  "data": {
    "name": "歌单名称",
    "creator": "创建者",
    "songCount": 193,
    "songs": [
      {
        "id": "002M1BCt3q6E4u",
        "name": "Fantasy",
        "artists": ["Miles Davis"],
        "album": "Doo Bop",
        "duration": "4:38",
        "genre": "爵士",
        "year": "1992"
      }
    ]
  }
}
```

#### 导入歌单
```bash
POST /api/playlist/import
Content-Type: application/json

{
  "url": "https://c6.y.qq.com/base/fcgi-bin/u?__=xxx",
  "enhanceGenres": true,
  "limit": 50
}
```

响应：
```json
{
  "success": true,
  "data": {
    "playlistName": "新建歌单",
    "imported": 50,
    "skipped": 3,
    "errors": [],
    "albumsCreated": 12
  }
}
```

## 🔧 实现细节

### 导入流程

```
用户输入链接
    ↓
解析歌单信息 (/api/playlist/parse)
    ↓
显示预览（歌曲列表、流派统计）
    ↓
用户确认导入
    ↓
批量处理每首歌曲 (/api/playlist/import)
    ├─ 检查是否已存在
    ├─ 查询增强流派（MusicBrainz）
    ├─ 创建/获取专辑
    └─ 创建单曲
    ↓
刷新页面显示新数据
```

### 核心代码文件

| 文件 | 说明 |
|------|------|
| `components/collection/PlaylistImportModal.tsx` | 导入弹窗组件 |
| `app/api/playlist/parse/route.ts` | 解析歌单 API |
| `app/api/playlist/import/route.ts` | 导入歌单 API |
| `lib/music-link-parser.ts` | QQ/网易云解析器 |
| `lib/genre-service.ts` | 流派增强服务 |

### 去重逻辑

导入时检查是否已存在（大小写不敏感）：
```typescript
const existingTrack = existingTracks.find(t => 
  t.title.toLowerCase() === song.name.toLowerCase() &&
  t.artist.toLowerCase() === (song.artists[0] || '').toLowerCase() &&
  t.albumName.toLowerCase() === (song.album || '').toLowerCase()
);
```

### 流派增强

当 `enhanceGenres: true` 时，系统会：
1. 先使用 QQ/网易云提供的流派
2. 如果没有，查询 MusicBrainz API
3. 限速 1.1秒/请求，避免触发限制

## 📱 支持的歌单链接格式

### QQ音乐
```
https://c6.y.qq.com/base/fcgi-bin/u?__=e8l9kTx9ItPu
https://y.qq.com/n/ryqq/playlist/9661641626
```

### 网易云音乐
```
https://163cn.tv/1oIsFR4
https://music.163.com/playlist?id=12769548936
```

## ⚠️ 注意事项

1. **速率限制**:
   - MusicBrainz: 1请求/秒
   - QQ/网易: 无限制但建议适量

2. **导入限制**:
   - 默认最多导入50首（可通过 `limit` 参数调整）
   - 大量导入可能需要较长时间

3. **流派获取**:
   - QQ音乐: 数字编码映射为中文
   - 网易云: 依赖专辑标签
   - MusicBrainz: 最丰富但较慢

4. **专辑自动创建**:
   - 每首歌曲都会关联一个专辑
   - 如果专辑不存在会自动创建
   - 避免重复专辑（通过 artist + title 判断）

## 🎉 示例

### 导入 "My Jazz Collection" 歌单

```bash
curl -X POST http://localhost:3002/api/playlist/import \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://c6.y.qq.com/base/fcgi-bin/u?__=e8l9kTx9ItPu",
    "enhanceGenres": true
  }'
```

结果：
- 导入 50 首歌曲
- 创建 12 张专辑
- 流派：爵士 (34%), 嘻哈 (18%), 流行 (14%)...
- 年代：1970s-2020s

## 🔮 未来优化

- [ ] 支持 Spotify 歌单导入
- [ ] 批量获取专辑封面
- [ ] 导入进度实时显示
- [ ] 支持取消导入
- [ ] 导入历史记录
