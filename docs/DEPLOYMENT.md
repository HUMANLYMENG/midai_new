# Midai 部署指南

## 📋 部署模式说明

Midai 支持两种运行模式：

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| **开发模式** | 免登录，自动使用默认用户 | 本地开发、功能测试 |
| **生产模式** | 强制 OAuth 登录，用户数据隔离 | 正式部署、多用户使用 |

---

## 🚀 快速部署

### 1. 环境要求

- Node.js 18+
- npm 或 yarn
- SQLite (内置，无需额外安装)

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

#### 生产环境 `.env.production`

```env
# ==========================================
# 生产环境配置（必须）
# ==========================================
NODE_ENV="production"

# 数据库（SQLite）
DATABASE_URL="file:./prod.db"

# NextAuth.js（必须配置）
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-super-secret-key-generate-with-openssl-rand-base64-32"

# Google OAuth（至少配置一个）
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Microsoft OAuth（可选）
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
MICROSOFT_TENANT_ID="common"

# Spotify API（封面获取，可选但推荐）
SPOTIFY_CLIENT_ID="your-spotify-client-id"
SPOTIFY_CLIENT_SECRET="your-spotify-client-secret"

# MusicBrainz API（流派获取，可选但推荐）
MUSICBRAINZ_APP_NAME="Midai"
MUSICBRAINZ_APP_VERSION="1.0.0"
MUSICBRAINZ_CONTACT="your@email.com"
```

### 4. 初始化数据库

```bash
npx prisma generate
npx prisma migrate deploy
```

### 5. 构建并启动

```bash
npm run build
npm start
```

---

## 🔐 获取 OAuth 凭证

### Google OAuth

1. 访问 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 创建项目或选择现有项目
3. 点击 "创建凭据" → "OAuth 客户端 ID"
4. 配置同意屏幕（外部用户类型）
5. 应用类型选择 "Web 应用程序"
6. 添加授权重定向 URI: `https://your-domain.com/api/auth/callback/google`
7. 复制客户端 ID 和密钥到环境变量

### Microsoft OAuth

1. 访问 [Azure Portal](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. 点击 "新注册"
3. 名称填写 "Midai"，受支持的账户类型选择 "任何组织目录中的帐户和个人 Microsoft 帐户"
4. 重定向 URI 选择 "Web"，填写: `https://your-domain.com/api/auth/callback/microsoft-entra-id`
5. 注册后，在 "证书和机密" 中创建客户端密码
6. 复制应用程序 ID（客户端 ID）和客户端密码到环境变量

---

## 🐳 Docker 部署

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 生成 Prisma 客户端
COPY prisma ./prisma/
RUN npx prisma generate

# 复制应用代码
COPY . .

# 构建
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动
CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  midai:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:./data/prod.db
      - NEXTAUTH_URL=https://your-domain.com
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

---

## 🔧 开发模式配置

### 本地开发 `.env.local`

```env
# 开发模式（免登录）
NODE_ENV="development"
DEV_AUTO_LOGIN="true"

# 数据库
DATABASE_URL="file:./dev.db"

# NextAuth.js（可选，如需测试登录流程则配置）
NEXTAUTH_URL="http://localhost:3002"
NEXTAUTH_SECRET="dev-secret-key"

# OAuth 凭证（可选）
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

### 开发模式特性

- ✅ 自动使用默认用户（dev@midai.local）
- ✅ 无需配置 OAuth 即可使用
- ✅ 登录页面显示 "Enter as Dev User" 按钮
- ✅ 导航栏显示 "Dev Mode" 标签

### 切换为登录模式（开发环境测试登录）

```env
DEV_AUTO_LOGIN="false"
```

---

## 📊 数据隔离说明

### 数据模型

```prisma
model User {
  id       String  @id @default(cuid())
  email    String? @unique
  name     String?
  albums   Album[]  // 一个用户多张专辑
  tracks   Track[]  // 一个用户多首单曲
}

model Album {
  id     Int    @id @default(autoincrement())
  userId String
  user   User   @relation(fields: [userId], references: [id])
  // ... 其他字段
  @@unique([userId, artist, title])  // 用户内唯一
}
```

### 隔离机制

1. **API 层面**: 所有 API 自动过滤 `userId`
2. **数据库层面**: 外键关联 + 唯一约束
3. **中间件层面**: JWT Session 验证

---

## 🔄 部署检查清单

### 生产环境部署前检查

- [ ] `NODE_ENV` 设置为 `"production"`
- [ ] `DEV_AUTO_LOGIN` 设置为 `"false"` 或未设置
- [ ] `NEXTAUTH_SECRET` 已设置（随机字符串，至少 32 字符）
- [ ] `NEXTAUTH_URL` 设置为实际域名
- [ ] 至少配置一个 OAuth Provider（Google/Microsoft）
- [ ] 数据库文件有持久化存储（Docker 卷/挂载）
- [ ] HTTPS 已启用（OAuth 要求）

### 验证部署

1. 访问首页应正常显示
2. 点击 "Collection" 应跳转到登录页面
3. 使用 OAuth 登录后应进入 Collection 页面
4. 添加专辑/单曲后，数据应正确关联到当前用户
5. 退出登录后重新登录，数据应保持不变

---

## 🛠️ 故障排查

### 登录失败

```bash
# 检查日志
npm run dev  # 或查看 Docker 日志

# 常见问题
1. NEXTAUTH_URL 不匹配实际访问地址
2. OAuth 回调地址配置错误
3. HTTPS 未启用（生产环境必需）
```

### 数据库错误

```bash
# 重置数据库（警告：会删除所有数据）
npx prisma migrate reset

# 查看数据库
npx prisma studio
```

### 环境变量未生效

```bash
# 确保变量名正确（没有 NEXT_PUBLIC_ 前缀的是服务端变量）
# 修改 .env 后需要重启服务

# 验证
node -e "console.log(process.env.NODE_ENV)"
```

---

## 📚 相关文档

- [NextAuth.js 文档](https://next-auth.js.org/)
- [Prisma 部署指南](https://www.prisma.io/docs/guides/deployment)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)
