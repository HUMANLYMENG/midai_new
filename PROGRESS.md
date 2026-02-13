# Midai 项目进度记录

## 最后更新
2026-02-13 18:30

## 本次更新
- ✅ **性能优化** - Track 列表虚拟滚动，解决 492 首歌曲卡顿问题
- ✅ **认证系统** - 开发/生产环境自动切换（开发免登录，生产强制 OAuth）
- ✅ **共享缓存** - 专辑封面和流派信息共享缓存系统
- ✅ **部署配置** - 生产环境配置模板和文档

## 已完成功能

### 1. 音乐收藏管理
- [x] 专辑和单曲管理
- [x] 力导向图可视化
- [x] Obsidian 风格无限画布
- [x] 节点悬停信息卡片
- [x] **虚拟滚动列表** - 支持上千首歌曲流畅浏览

### 2. 封面获取优化
- [x] 专辑封面获取（从 Spotify/iTunes）
- [x] **单曲封面自动同步** - 从所属专辑同步，不再单独获取
- [x] 批量获取封面功能
- [x] SSE 实时进度推送
- [x] **智能缓存系统** - 所有用户共享的封面/流派缓存
  - Key: `专辑名-艺术家-发行年份`（标准化）
  - Value: `封面URL`, `流派`
  - 自动命中统计和使用追踪

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

### 5. 主页美化（已完成）
- [x] 全新 Hero 设计 - "See How Your Music Connects"
- [x] 实时统计数据展示（专辑/曲目/艺术家/流派）
- [x] 最近添加专辑封面横向滚动
- [x] 流派标签云
- [x] 紧凑底部布局

### 6. 用户认证与部署
- [x] **双模式认证** - 开发环境免登录 / 生产环境强制 OAuth
- [x] Google OAuth 集成
- [x] Microsoft OAuth 集成
- [x] 生产环境部署配置
- [x] Docker 支持

### 7. 数据库管理
- [x] 清理数据库 API（保留用户）

## 已知问题

### 1. Spotify API 流派问题
- Client Credentials Flow 返回空 `genres` 数组
- 已改用 MusicBrainz 作为主要流派来源
- ✅ **缓存系统缓解** - 已获取的流派会缓存共享

### 2. 性能优化完成 ✅
- ~~Track 列表大数据量卡顿~~ - ✅ 虚拟滚动优化，492 首歌曲流畅浏览
- ~~导入性能慢~~ - ✅ 缓存系统优化，重复专辑秒级导入
- ~~封面获取受限~~ - ✅ 缓存系统优化，热门专辑直接读取

## 最近提交

```
xxxxxxx feat: 添加共享专辑缓存系统
7959139 feat: 优化封面获取逻辑和添加歌单导入功能
fa415db chore: 更新依赖包配置
```

## 文件结构

```
app/
├── api/
│   ├── cache/
│   │   └── route.ts                # 缓存管理 API（统计/搜索/清理）
│   ├── covers/
│   │   ├── batch/route.ts          # 批量封面获取（优化后：只处理专辑）
│   │   └── batch-process/route.ts   # SSE 实时进度（集成缓存）
│   ├── playlist/
│   │   ├── import/route.ts         # 歌单导入（集成缓存）
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
├── album-cache.ts                  # 共享专辑缓存核心服务
├── cover-service.ts                # 带缓存的封面获取服务
├── genre-service.ts                # MusicBrainz 流派服务（原始）
├── genre-service-with-cache.ts     # 带缓存的流派服务
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
- [x] ~~主页美化~~ - 已完成
- [x] ~~**封面/流派缓存**~~ - ✅ 已完成！按 `专辑-艺术家-发行年份` 缓存到本地数据库
- [ ] **流派节点动态大小** - 连接多的流派节点变大
- [ ] **图谱性能优化** - 优化力导向图渲染性能

### 中优先级
- [ ] **流派图谱** - 基于流派关系构建可视化图谱
- [ ] **Spotify 用户认证** - 解决流派获取问题
- [ ] **批量编辑** - 多选歌曲进行批量操作

### 低优先级
- [ ] **播放列表** - 创建和管理播放列表
- [x] ~~**导入优化**~~ - ✅ 通过缓存策略大幅优化
