# 音乐平台流派(Genre)信息获取研究报告

## 研究成果摘要

本研究分析了QQ音乐和网易云音乐的API，提供了获取歌曲/专辑流派信息的方法。

---

## 1. QQ音乐

### Genre数字映射表

QQ音乐使用数字编码表示流派，主要映射如下：

| ID | 流派名称 | ID | 流派名称 |
|----|---------|----|---------|
| 1 | 流行 | 11 | 朋克 |
| 2 | 摇滚 | 12 | 世界音乐 |
| 3 | 爵士 | 13 | 拉丁 |
| 4 | 电子 | 14 | 雷鬼 |
| 5 | 民谣 | 15 | 蓝调 |
| 6 | R&B | 16 | 乡村 |
| 7 | 说唱 | 17 | 舞曲 |
| 8 | 古典 | 18 | 另类 |
| 9 | 轻音乐 | 19 | 嘻哈 |
| 10 | 金属 | 20 | 灵魂乐 |

完整映射表见 `music-genre-api.ts` 中的 `QQ_MUSIC_GENRE_MAP`（包含200+条目）。

### API端点

**歌曲详情API**：`https://u.y.qq.com/cgi-bin/musicu.fcg`
- Method: `get_song_detail_yqq`
- Module: `music.pf_song_detail_svr`
- 参数: `{ song_mid: "歌曲MID" }`
- 返回: `track_info.genre` (数字ID) 和 `info.genre.name` (名称)

**专辑详情API**：`https://y.qq.com/n/yqq/album/{albummid}.html`
- 通过网页抓取获取
- 从 `window.__INITIAL_STATE__` 提取 `detail.genre`

---

## 2. 网易云音乐

### 流派获取方式

网易云音乐的流派信息**不直接存储在歌曲详情中**，需要通过以下方式获取：

1. **专辑详情API**: `/album`
   - 返回: `album.tags` (数组) 和 `album.genre` (字符串)
   
2. **歌单详情API**: `/playlist/detail`
   - 返回: `playlist.tags` (数组)

### API端点

**专辑详情**：`http://localhost:3000/album?id={专辑ID}`
- 需要本地部署 NeteaseCloudMusicApi 服务
- 返回专辑的流派标签信息

**歌单详情**：`http://localhost:3000/playlist/detail?id={歌单ID}`
- 返回歌单的分类标签

---

## 3. 提供的代码文件

| 文件名 | 说明 |
|--------|------|
| `music-genre-api.ts` | TypeScript API客户端类，包含完整Genre映射表和API封装 |
| `test-music-genre.ts` | 测试脚本，演示如何使用API获取流派信息 |
| `music-genre-guide.md` | API文档和使用指南 |
| `GENRE_RESEARCH_SUMMARY.md` | 本摘要文档 |

---

## 4. 快速开始

### 安装依赖

```bash
npm install axios
```

### QQ音乐示例

```typescript
import { QQMusicApiClient } from './music-genre-api';

const client = new QQMusicApiClient();
const detail = await client.getSongDetail('0039MnYb0qxYhV');
console.log('流派:', client.getGenreName(detail.track_info.genre));
```

### 网易云音乐示例

```bash
# 1. 启动NeteaseCloudMusicApi服务
git clone https://github.com/Binaryify/NeteaseCloudMusicApi.git
cd NeteaseCloudMusicApi
npm install
npm start
```

```typescript
import { NeteaseMusicApiClient } from './music-genre-api';

const client = new NeteaseMusicApiClient('http://localhost:3000');
const album = await client.getAlbumDetail(18915);
console.log('流派:', album.genres);
```

---

## 5. 注意事项

1. **QQ音乐Genre映射表**：由于QQ音乐官方未公开完整的映射表，提供的映射基于常见值整理，可能需要根据实际数据调整。

2. **网易云音乐流派**：流派信息存储在专辑级别，歌曲详情API不返回genre字段。

3. **Cookie要求**：部分QQ音乐接口需要登录Cookie才能获取完整信息。

4. **服务部署**：网易云音乐API需要自行部署服务，QQ音乐API可直接调用。

---

## 6. 参考资料

- [QQMusicApi](https://github.com/jsososo/QQMusicApi)
- [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)
- [网易云音乐开放平台](https://developer.music.163.com/)
