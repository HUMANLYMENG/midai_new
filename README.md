# 🎵 Midai - 音乐收藏与发现平台

一款帮助音乐爱好者管理专辑收藏、探索流派关系的可视化 Web 应用。核心体验是**交互式流派关系图谱**，让你一眼看出专辑间的音乐关联。

![Tech Stack](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![Tech Stack](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Tech Stack](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)
![Tech Stack](https://img.shields.io/badge/D3.js-7-F9A03C?style=flat-square&logo=d3.js)
![Tech Stack](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma)

---

## ✨ 核心特性

### 🕸️ 交互式流派图谱
- **力导向图可视化**：专辑与流派的动态关系网络
- **节点交互**：拖拽节点、悬停高亮、点击查看详情
- **流畅动画**：从中心自然展开的入场动画
- **边界约束**：节点限制在画布范围内，不会跑出去
- **缩放控制**：鼠标滚轮 + 按钮缩放，自适应初始视图

### 📀 专辑管理
- **手动录入**：表单添加专辑信息（标题、艺术家、流派、发行日期、封面等）
- **CSV 批量导入**：支持 UTF-8/GBK 编码，自动去重
- **右键快捷操作**：聚焦 / 编辑 / 删除专辑
- **可拖拽编辑窗口**：自由调整编辑弹窗位置

### 🖼️ 智能封面获取
- **一键批量获取**：自动为所有缺失封面的专辑获取封面
- **实时进度显示**：显示处理进度和结果统计
- **Spotify 数据源**：基于 `album-art` 库，封面质量高
- **单张获取**：添加/编辑专辑时一键获取封面

### 🎨 现代 UI/UX
- **双主题系统**：深色 / 浅色 / 跟随系统
- **玻璃拟态设计**：毛玻璃效果、柔和阴影
- **响应式布局**：自适应浏览器窗口大小
- **流畅动画**：Framer Motion 驱动的页面过渡和交互

### 📊 数据与存储
- **SQLite 数据库**：本地文件存储，零配置
- **Prisma ORM**：类型安全的数据库操作
- **自动迁移**：数据库版本管理

---

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装依赖
```bash
cd midai
npm install
```

### 初始化数据库
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000

---

## 📁 项目结构

```
midai/
├── app/                          # Next.js App Router
│   ├── api/                      # API 路由
│   │   ├── albums/route.ts       # 专辑 CRUD
│   │   ├── albums/[id]/route.ts  # 单专辑操作
│   │   ├── cover/route.ts        # 单张封面获取
│   │   ├── covers/batch/route.ts # 批量封面获取
│   │   ├── import/route.ts       # CSV 导入
│   │   └── genres/route.ts       # 流派列表
│   ├── collection/page.tsx       # 主页面（图谱+侧边栏）
│   ├── page.tsx                  # 首页
│   ├── layout.tsx                # 根布局
│   └── globals.css               # 全局样式（CSS Variables 主题）
├── components/
│   ├── album/
│   │   ├── AlbumList.tsx         # 侧边栏专辑列表
│   │   ├── AlbumForm.tsx         # 编辑/添加表单
│   │   └── ImportModal.tsx       # CSV 导入弹窗
│   ├── graph/
│   │   ├── ForceGraph.tsx        # D3 力导向图核心
│   │   └── GraphLegend.tsx       # 图例组件
│   ├── ui/
│   │   ├── Button.tsx            # 按钮组件
│   │   ├── Input.tsx             # 输入框组件
│   │   ├── Modal.tsx             # 弹窗组件
│   │   ├── DraggableModal.tsx    # 可拖拽弹窗
│   │   ├── ContextMenu.tsx       # 右键菜单
│   │   ├── Select.tsx            # 下拉选择
│   │   └── ThemeToggle.tsx       # 主题切换
├── lib/
│   ├── cover.ts                  # 封面获取工具 (album-art)
│   ├── db.ts                     # Prisma 客户端
│   ├── genres.ts                 # 流派颜色映射（34种颜色）
│   ├── theme.ts                  # 主题状态管理（Zustand）
│   └── utils.ts                  # 工具函数
├── prisma/
│   └── schema.prisma             # 数据库模型
├── types/
│   └── index.ts                  # TypeScript 类型定义
└── package.json
```

---

## ✅ 当前状态

### 🎯 核心功能（已完成）

| 功能 | 状态 | 描述 |
|------|------|------|
| 专辑 CRUD | ✅ | 创建、读取、更新、删除专辑 |
| CSV 批量导入 | ✅ | 支持编码检测、自动去重 |
| 力导向图谱 | ✅ | D3.js 实现，节点可拖拽 |
| 图谱交互 | ✅ | 悬停高亮、点击查看详情 |
| 侧边栏列表 | ✅ | 排序、点击聚焦图谱节点 |
| 深色/浅色主题 | ✅ | CSS Variables 实现 |
| 玻璃拟态 UI | ✅ | 毛玻璃效果、圆角、阴影 |
| 可拖拽弹窗 | ✅ | 编辑窗口可自由拖动 |
| 右键菜单 | ✅ | Focus / Edit / Delete 快捷操作 |
| **封面自动获取** | ✅ | 一键批量获取，Spotify 数据源 |
| 图谱高亮交互 | ✅ **NEW** | 图例/流派/专辑单击高亮，背景取消 |
| 节点悬停效果 | ✅ **NEW** | 放大、发光、边框增强 |
| 排序性能优化 | ✅ **NEW** | 排序时不重新加载图谱 |

---

## 🗺️ Roadmap

### 🚀 P1 - 体验优化（进行中）

| 功能 | 状态 | 描述 |
|------|------|------|
| 悬浮信息卡片 | 📝 | 鼠标悬停显示专辑详情 |
| 图例筛选 | 📝 | 点击图例隐藏/显示流派 |
| 搜索过滤 | 📝 | 侧边栏搜索专辑/艺术家 |
| 键盘快捷键 | 📝 | Ctrl+N 新增、Delete 删除等 |
| 数据导出 | 📝 | CSV/JSON 备份导出 |

### 🌟 P2 - 功能扩展（规划中）

#### 高优先级

| 功能 | 优先级 | 描述 |
|------|--------|------|
| 专辑详情页 | 🔴 | 独立页面展示完整信息 |
| 相似专辑推荐 | 🟡 | 基于共同流派推荐 |
| 统计面板 | 🟡 | 流派分布、收藏趋势图表 |
| 专辑评分 | 🟢 | 1-5 星评分系统 |

#### 中优先级

| 功能 | 优先级 | 描述 |
|------|--------|------|
| 播放链接 | 🟢 | 跳转 Spotify/Apple Music |
| 批量编辑 | 🟢 | 多选专辑批量修改流派/标签 |
| 导入增强 | 🟢 | 支持更多格式（JSON, Excel）|
| 时间线视图 | 🟢 | 按发行日期展示专辑 |

#### 低优先级 / 未来探索

| 功能 | 优先级 | 描述 |
|------|--------|------|
| 用户账户 | 🟢 | 多用户支持、登录系统 |
| 社交分享 | 🟢 | 生成分享卡片 |
| PWA 支持 | 🟢 | 离线访问、桌面安装 |
| 协作编辑 | 🟢 | 多人实时协作 |
| AI 推荐 | ⚪ | 基于听歌历史的智能推荐 |

### 🔧 技术债务

| 任务 | 优先级 | 描述 |
|------|--------|------|
| 数据库迁移 | 🟡 | SQLite → PostgreSQL |
| 移动端适配 | 🟡 | 触摸优化、响应式调整 |
| 性能优化 | 🟢 | 虚拟滚动（1000+ 专辑）|
| 测试覆盖 | 🟢 | 单元测试、E2E 测试 |

---

## 🎯 建议下一步实现

### 1. 🔍 搜索过滤（最实用）
在侧边栏顶部添加搜索框，实时过滤专辑列表：
```
[🔍 Search...]          [Sort ▼]
--------------------------
Album 1
Album 2
...
```

### 2. 💬 悬浮信息卡片（提升体验）
鼠标悬停在图谱节点上时，显示浮动卡片：
- 专辑封面大图
- 标题 + 艺术家
- 发行日期
- 时长
- 唱片公司

### 3. 💾 数据导出（数据安全）
支持导出为：
- CSV（兼容导入）
- JSON（完整数据）
- 自动备份功能

---

## 🛠️ 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS + CSS Variables
- **数据库**: SQLite (开发) / PostgreSQL (生产)
- **ORM**: Prisma
- **可视化**: D3.js v7
- **动画**: Framer Motion
- **状态管理**: Zustand
- **图标**: Lucide React
- **封面 API**: album-art (Spotify)

---

## 📸 界面预览

```
┌─────────────────────────────────────────────────────────────┐
│  [Home] [Collection] [☀️/🌙/💻]                              │  ← 导航栏
├──────────────┬──────────────────────────────────────────────┤
│              │                                               │
│  My Collection│                                              │
│  ┌─────────┐ │    [图谱区域 - 自适应窗口大小]                │
│  │Sort ▼   │ │                                               │
│  ├─────────┤ │         🎸 Rock ── Album 1                   │
│  │ Album 1 │ │          │                                     │
│  │ Album 2 │ │         Album 2 ── Pop                       │
│  │ ...     │ │          │                                     │
│  └─────────┘ │         Album 3                               │
│              │                                               │
│              │  [Get 10 Covers] [+] [Import] [Hide]          │  ← 批量封面获取
│              │                                               │
└──────────────┴──────────────────────────────────────────────┘
```

---

## 📝 更新日志

### 2025-02-09
- ✅ **图谱高亮交互**
  - 点击图例可高亮/取消高亮指定流派
  - 点击流派节点高亮关联专辑
  - 单击专辑节点高亮该专辑及其流派
  - 背景点击取消所有高亮
- ✅ **节点悬停效果**
  - 鼠标悬停节点时放大 15%
  - 显示白色边框和增强发光效果
- ✅ **性能优化**
  - 调整左侧边栏排序时不再重新加载右侧图谱
  - 数据分离：`rawAlbums`（图表）+ `sortedAlbums`（列表）

### 2025-02-07
- ✅ 新增封面自动获取功能
- ✅ 集成 `album-art` 库 (Spotify 数据源)
- ✅ 支持一键批量获取所有缺失封面的专辑
- ✅ 添加进度弹窗显示处理状态

---

## 🤝 贡献

欢迎提交 Issue 和 PR！

---

## 📄 License

MIT License

---

<p align="center">
  Made with ❤️ for music lovers
</p>
