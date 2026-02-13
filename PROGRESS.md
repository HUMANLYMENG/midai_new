# Midai 项目进度记录

## 最后更新
2026-02-13

## 已完成功能

### 1. 音乐收藏管理
- [x] 专辑和单曲管理
- [x] 力导向图可视化
- [x] Obsidian 风格无限画布
- [x] 节点悬停信息卡片

### 2. 封面获取优化
- [x] 专辑封面获取（从 Spotify/iTunes）
- [x] **单曲封面自动同步** - 从所属专辑同步，不再单独获取
- [x] 批量获取封面功能
- [x] SSE 实时进度推送

### 3. 歌单导入功能
- [x] QQ 音乐链接解析
- [x] 网易云音乐链接解析
- [x] 统一导入模态框（CSV + 链接）
- [x] 可拖拽模态框
- [x] 实时导入进度显示
- [x] 重复歌曲检测和跳过提示

### 4. 流派信息
- [x] MusicBrainz API 集成
- [x] 流派自动获取（导入时）
- [x] 流派查找组件
- [x] 速率限制处理（1 req/sec）

### 5. 数据库管理
- [x] 清理数据库 API（保留用户）

## 已知问题

### 1. Spotify API 流派问题
- Client Credentials Flow 返回空 `genres` 数组
- 已改用 MusicBrainz 作为主要流派来源

### 2. 导入性能
- 193 首歌曲约需 3-4 分钟（MusicBrainz 速率限制）

### 3. 封面获取
- Spotify API 有请求限制，大库可能需要分批处理

## 最近提交

```
7959139 feat: 优化封面获取逻辑和添加歌单导入功能
fa415db chore: 更新依赖包配置
```

## 文件结构

```
app/
├── api/
│   ├── covers/
│   │   ├── batch/route.ts          # 批量封面获取（优化后：只处理专辑）
│   │   └── batch-process/route.ts   # SSE 实时进度（优化后：只处理专辑）
│   ├── playlist/
│   │   ├── import/route.ts         # 歌单导入
│   │   └── parse/route.ts          # 链接解析
│   └── ...
├── collection/
│   └── page.tsx                    # 主页面（封面逻辑优化）

components/
├── collection/
│   ├── UnifiedImportModal.tsx      # 统一导入模态框
│   └── PlaylistImportModal.tsx     # 歌单导入（旧版）
└── MusicGenreFinder.tsx            # 流派查找组件

lib/
├── genre-service.ts                # MusicBrainz 流派服务
├── music-link-parser.ts            # QQ/网易云链接解析
├── spotify-parser.ts               # Spotify 链接解析
└── hooks/
    └── useMusicGenres.ts           # 流派 Hook

docs/
└── PLAYLIST_IMPORT.md              # 歌单导入文档

scripts/
├── clear-database.ts               # 清理数据库
├── test-music-parser.mjs           # 测试音乐链接解析
├── test-genre-service.mjs          # 测试流派服务
└── ...
```

## 环境变量

```env
# MusicBrainz
MUSICBRAINZ_APP_NAME=Midai
MUSICBRAINZ_APP_VERSION=1.0.0
MUSICBRAINZ_CONTACT=your@email.com

# Spotify (封面获取)
SPOTIFY_CLIENT_ID=xxx
SPOTIFY_CLIENT_SECRET=xxx

# Database
DATABASE_URL="file:./dev.db"
```

## TODO 列表

### 高优先级
- [ ] **主页美化** - 改进主页 UI 设计
- [ ] **流派节点动态大小** - 连接多的流派节点变大
- [ ] **图谱性能优化** - 优化力导向图渲染性能

### 中优先级
- [ ] **流派图谱** - 基于流派关系构建可视化图谱
- [ ] **Spotify 用户认证** - 解决流派获取问题
- [ ] **批量编辑** - 多选歌曲进行批量操作

### 低优先级
- [ ] **播放列表** - 创建和管理播放列表
- [ ] **导入优化** - 考虑并行处理或缓存策略
