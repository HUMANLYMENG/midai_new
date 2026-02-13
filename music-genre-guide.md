# QQ音乐和网易云音乐流派(Genre)信息获取指南

## 概述

本文档详细说明如何从QQ音乐和网易云音乐获取歌曲/专辑的流派(genre)信息。

---

## 一、QQ音乐 Genre 映射表

### 1.1 主要流派映射（常见值）

| ID | 中文名称 | 英文名称 |
|----|---------|---------|
| 1 | 流行 | Pop |
| 2 | 摇滚 | Rock |
| 3 | 爵士 | Jazz |
| 4 | 电子 | Electronic |
| 5 | 民谣 | Folk |
| 6 | R&B | R&B |
| 7 | 说唱 | Rap |
| 8 | 古典 | Classical |
| 9 | 轻音乐 | Easy Listening |
| 10 | 金属 | Metal |
| 11 | 朋克 | Punk |
| 12 | 世界音乐 | World Music |
| 13 | 拉丁 | Latin |
| 14 | 雷鬼 | Reggae |
| 15 | 蓝调 | Blues |
| 16 | 乡村 | Country |
| 17 | 舞曲 | Dance |
| 18 | 另类 | Alternative |
| 19 | 嘻哈 | Hip-Hop |
| 20 | 灵魂乐 | Soul |
| 21 | 新世纪 | New Age |
| 27 | 民乐 | Traditional Chinese |
| 28 | 中国风 | Chinese Style |
| 29 | 原声 | Soundtrack |
| 30 | 动漫 | Anime |
| 31 | 游戏 | Game |
| 33 | 影视原声 | OST |

### 1.2 注意事项

- QQ音乐的`genre`字段在API返回中是数字类型
- 需要使用映射表将数字转换为流派名称
- 部分歌曲可能没有设置流派（genre=0）
- 映射表可能不完整，建议根据实际数据补充

---

## 二、API端点和调用方式

### 2.1 QQ音乐

#### 歌曲详情 API

**端点**: `https://u.y.qq.com/cgi-bin/musicu.fcg`

**方法**: GET/POST

**参数**:
```javascript
{
  data: JSON.stringify({
    songinfo: {
      method: 'get_song_detail_yqq',
      module: 'music.pf_song_detail_svr',
      param: {
        song_mid: '0039MnYb0qxYhV'
      }
    }
  })
}
```

**返回示例**:
```json
{
  "songinfo": {
    "data": {
      "track_info": {
        "id": 97773,
        "mid": "0039MnYb0qxYhV",
        "name": "晴天",
        "genre": 1,
        "album": {
          "id": 8212,
          "mid": "002eFUFm2XYZ7z",
          "name": "叶惠美"
        },
        "singer": []
      },
      "info": {
        "genre": {
          "id": 1,
          "name": "流行"
        }
      }
    }
  }
}
```

#### 专辑详情 API（网页抓取）

**端点**: `https://y.qq.com/n/yqq/album/{albummid}.html`

**方法**: GET

---

### 2.2 网易云音乐

#### 专辑详情 API

**端点**: `/album`

**方法**: GET

**参数**:
```javascript
{ id: 18915 }
```

**返回示例**:
```json
{
  "album": {
    "id": 18915,
    "name": "范特西",
    "artist": { "id": 6452, "name": "周杰伦" },
    "publishTime": 999542400000,
    "company": "BMG",
    "tags": ["流行", "华语"],
    "genre": "流行"
  },
  "songs": []
}
```

---

## 三、完整示例代码

### 3.1 QQ音乐 - 获取歌曲流派

```typescript
import axios from 'axios';

const GENRE_MAP: Record<number, string> = {
  1: '流行', 2: '摇滚', 3: '爵士', 4: '电子', 5: '民谣',
  6: 'R&B', 7: '说唱', 8: '古典', 9: '轻音乐', 10: '金属',
};

async function getQQMusicSongGenre(songMid: string): Promise<string> {
  const url = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
  const data = {
    data: JSON.stringify({
      songinfo: {
        method: 'get_song_detail_yqq',
        module: 'music.pf_song_detail_svr',
        param: { song_mid: songMid }
      }
    })
  };

  const response = await axios.get(url, { params: data });
  const genreId = response.data.songinfo.data.track_info.genre;
  
  return GENRE_MAP[genreId] || '未知';
}
```

### 3.2 网易云音乐 - 获取专辑流派

```typescript
import axios from 'axios';

async function getNeteaseAlbumGenre(albumId: number): Promise<string[]> {
  const baseURL = 'http://localhost:3000';
  
  const response = await axios.get(`${baseURL}/album`, {
    params: { id: albumId }
  });

  const album = response.data.album;
  const genres: string[] = [];

  if (album.tags) genres.push(...album.tags);
  if (album.genre) genres.push(album.genre);

  return [...new Set(genres)];
}
```

---

## 四、参考资料

- QQMusicApi: https://github.com/jsososo/QQMusicApi
- NeteaseCloudMusicApi: https://github.com/Binaryify/NeteaseCloudMusicApi
- 网易云音乐开放文档: https://developer.music.163.com/
