# Midai 认证模式配置说明

## 🎯 功能概述

Midai 现在支持灵活的认证模式，可以根据环境自动切换：

- **开发模式**: 免登录自动使用默认用户
- **生产模式**: 强制 OAuth 登录，多用户数据隔离

---

## ⚙️ 配置方式

### 环境变量

| 变量名 | 说明 | 可选值 | 默认值 |
|--------|------|--------|--------|
| `NODE_ENV` | 运行环境 | `development` / `production` | `development` |
| `DEV_AUTO_LOGIN` | 开发自动登录 | `true` / `false` | `true` |

### 配置组合

```env
# 组合 1: 开发免登录模式（推荐开发使用）
NODE_ENV="development"
DEV_AUTO_LOGIN="true"
# → 自动使用 dev@midai.local 用户，无需登录

# 组合 2: 开发登录测试模式
NODE_ENV="development"
DEV_AUTO_LOGIN="false"
# → 需要正常登录，用于测试 OAuth 流程

# 组合 3: 生产强制登录模式
NODE_ENV="production"
# → 强制 OAuth 登录，数据按用户隔离
```

---

## 🔧 实现机制

### 1. 服务端认证 (lib/auth.ts)

```typescript
// 判断是否开发自动登录
export function isDevAutoLogin(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.DEV_AUTO_LOGIN === 'true'
}

// 获取当前用户 ID
export async function getCurrentUserId(req?: NextRequest): Promise<string | null> {
  const session = await auth()
  if (session?.user?.id) return session.user.id
  
  // 开发环境自动登录
  if (isDevAutoLogin()) {
    const defaultUser = await getOrCreateDefaultUser()
    return defaultUser.id
  }
  return null
}
```

### 2. 路由中间件 (middleware.ts)

```typescript
export async function middleware(request: NextRequest) {
  // 开发环境自动登录模式，跳过所有认证检查
  if (isDevAutoLogin()) {
    return NextResponse.next()
  }
  
  // 生产环境：检查登录状态并保护路由
  // ...
}
```

### 3. API 路由统一处理

所有 API 路由使用 `requireUserId()` 函数：

```typescript
import { requireUserId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const userId = await requireUserId(request)
  if (userId instanceof NextResponse) {
    return userId  // 未登录返回 401
  }
  
  // 继续处理，使用 userId 查询数据
  const albums = await prisma.album.findMany({ where: { userId } })
  // ...
}
```

### 4. 前端适配

- **登录页面**: 开发模式显示 "Enter as Dev User" 快捷按钮
- **Collection 页面**: 导航栏显示 "Dev Mode" 标签

---

## 📁 修改的文件列表

### 新增文件

- `middleware.ts` - Next.js 路由中间件
- `docs/DEPLOYMENT.md` - 部署指南
- `docs/AUTH_MODE.md` - 本文件

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `.env.local` | 添加 `NODE_ENV` 和 `DEV_AUTO_LOGIN` |
| `.env.local.example` | 添加环境模式配置说明 |
| `next.config.mjs` | 添加 `NEXT_PUBLIC_DEV_AUTO_LOGIN` 环境变量 |
| `lib/auth.ts` | 重写认证逻辑，支持开发/生产模式切换 |
| `app/auth/signin/page.tsx` | 添加开发模式快捷入口 |
| `app/collection/page.tsx` | 添加开发模式标签显示 |
| `app/api/albums/route.ts` | 使用新的 `requireUserId()` |
| `app/api/albums/[id]/route.ts` | 使用新的 `requireUserId()` |
| `app/api/tracks/route.ts` | 使用新的 `requireUserId()` |
| `app/api/tracks/[id]/route.ts` | 使用新的 `requireUserId()` |
| `app/api/import/route.ts` | 使用新的 `requireUserId()` |
| `app/api/covers/batch/route.ts` | 使用新的 `requireUserId()` |
| `app/api/covers/batch-process/route.ts` | 使用新的 `requireUserId()` |
| `app/api/playlist/import/route.ts` | 使用新的 `requireUserId()` |
| `app/api/stats/route.ts` | 使用新的 `requireUserId()` |

---

## 🚀 快速开始

### 开发环境

```bash
# 1. 确保 .env.local 配置为开发模式
cat .env.local
# NODE_ENV="development"
# DEV_AUTO_LOGIN="true"

# 2. 安装依赖
npm install

# 3. 初始化数据库
npx prisma migrate dev

# 4. 启动开发服务器
npm run dev

# 5. 访问 http://localhost:3002
# 直接进入 Collection 页面，无需登录
```

### 生产部署

```bash
# 1. 配置环境变量（参考 docs/DEPLOYMENT.md）
# NODE_ENV="production"
# NEXTAUTH_SECRET="..."
# GOOGLE_CLIENT_ID="..."
# GOOGLE_CLIENT_SECRET="..."

# 2. 构建
npm run build

# 3. 启动
npm start

# 4. 访问域名
# 会自动跳转到登录页面
```

---

## 🔐 安全说明

### 开发模式注意事项

- 默认用户 `dev@midai.local` 只在开发环境创建
- 开发模式不会暴露任何真实的用户数据
- 建议开发模式和生产环境使用不同的数据库文件

### 生产环境安全

- `NEXTAUTH_SECRET` 必须设置且保密
- 所有 OAuth 回调地址必须正确配置
- 必须启用 HTTPS
- 数据库文件需要定期备份

---

## ❓ 常见问题

**Q: 如何在开发环境测试登录流程？**

A: 修改 `.env.local`：
```env
DEV_AUTO_LOGIN="false"
```
然后重启开发服务器。

**Q: 如何查看当前是哪个用户在访问？**

A: 查看数据库或使用 Prisma Studio：
```bash
npx prisma studio
```

**Q: 开发模式和生产模式可以共用数据库吗？**

A: 可以但不推荐。建议分开：
```env
# 开发
DATABASE_URL="file:./dev.db"

# 生产
DATABASE_URL="file:./prod.db"
```

**Q: 如何清理开发模式的测试数据？**

A: 直接删除数据库文件：
```bash
rm prisma/dev.db
npx prisma migrate dev
```
