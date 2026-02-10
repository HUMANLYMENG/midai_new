# Midai 项目进度记录

## 项目概述
Midai 是一个音乐收藏与发现平台，核心功能是交互式流派关系图谱。

## 当前进度（2026-02-10）

### ✅ 已完成的功能

#### 1. 单曲功能（单曲/Track）
- **数据库**: 添加 Track 模型，包含 albumName 字段
- **API**: 完整的 CRUD API (/api/tracks, /api/tracks/[id])
- **前端**: Collection 页面支持 Albums/Tracks 标签切换
- **类型**: Track 和 TrackInput 类型定义
- **表单**: CollectionForm 支持创建/编辑单曲
- **列表**: CollectionList 显示单曲，显示专辑名

#### 2. 专辑节点聚合功能
- **点击展开**: 点击专辑节点展开显示该专辑的 tracks
- **圆形布局**: Tracks 围绕专辑节点呈圆形排列
- **视觉指示**: 展开/收起状态用绿色/蓝色圆点表示
- **无专辑 tracks**: 直接连接到流派节点

#### 3. 示例数据
- 添加了 46 首示例单曲（2026-02-10）
- 包括 Kendrick Lamar, Miles Davis, The Beatles 等艺术家

#### 4. 修复
- 修复了 `highlightedAlbumId` 未定义的运行时错误
- 添加了 `expandedAlbumId` state 用于专辑展开功能

### 📊 数据库统计
- **专辑**: 133 张
- **单曲**: 46 首

### 📝 待开发功能（Roadmap）
1. **悬浮信息卡片** - 鼠标悬停显示专辑/单曲详情
2. **数据导出** - 导出收藏到 CSV/JSON
3. **自动抓取专辑歌曲列表** - 从 Spotify 抓取专辑曲目

### 🐛 已知问题
- 无

### 💻 技术栈
- Next.js 15 + React 18
- TypeScript
- Prisma ORM + SQLite
- NextAuth.js v5 (Google/Microsoft OAuth)
- D3.js v7 (力导向图谱)
- Tailwind CSS

---
*最后更新: 2026-02-10*
