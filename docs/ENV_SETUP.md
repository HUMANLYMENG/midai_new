# 生产环境变量配置指南

## 🔑 快速配置

### 第一步：生成密钥

```bash
# 在终端运行以下命令生成 NEXTAUTH_SECRET
openssl rand -base64 32

# Windows 没有 openssl 的话，使用 Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

复制生成的字符串作为 `NEXTAUTH_SECRET`。

---

## 🔐 Google OAuth 配置

### 1. 创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 点击右上角项目下拉框 → "新建项目"
3. 项目名称："Midai"（随意）
4. 记下项目 ID，点击 "创建"

### 2. 启用 Google+ API

1. 进入 [API 库](https://console.cloud.google.com/apis/library)
2. 搜索 "Google+ API"（或 "Google People API"）
3. 点击 "启用"

### 3. 创建 OAuth 凭证

1. 进入 [凭据页面](https://console.cloud.google.com/apis/credentials)
2. 点击 "创建凭据" → "OAuth 客户端 ID"
3. 首次使用需要配置同意屏幕：
   - 点击 "配置同意屏幕"
   - 用户类型：选择 "外部"
   - 应用名称："Midai"
   - 用户支持电子邮件：你的邮箱
   - 开发者联系信息：你的邮箱
   - 保存并继续 → 保存并继续 → 返回面板

4. 再次点击 "创建凭据" → "OAuth 客户端 ID"
   - 应用类型："Web 应用程序"
   - 名称："Midai Web"
   - 授权重定向 URI：
     - `https://your-domain.com/api/auth/callback/google`
     - （开发测试可添加）`http://localhost:3002/api/auth/callback/google`
   - 点击 "创建"

5. 复制 **客户端 ID** 和 **客户端密钥** 到 `.env.production`：
   ```env
   GOOGLE_CLIENT_ID="630691963933-xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxxxxx"
   ```

---

## 🔷 Microsoft OAuth 配置

### 1. 注册应用

1. 访问 [Azure Portal](https://portal.azure.com/)
2. 搜索 "应用注册" 并进入
3. 点击 "新注册"
4. 填写信息：
   - 名称："Midai"
   - 受支持的帐户类型："任何组织目录(任何 Azure AD 目录 - 多租户)中的帐户和个人 Microsoft 帐户"
   - 重定向 URI：
     - 平台："Web"
     - URI：`https://your-domain.com/api/auth/callback/microsoft-entra-id`
5. 点击 "注册"

### 2. 获取密钥

1. 在应用概览页面，复制 **应用程序(客户端) ID**
2. 左侧菜单 → "证书和机密" → "新建客户端密码"
   - 说明："Midai Production"
   - 过期："24个月"（或永不过期）
3. 点击 "添加"
4. **立即复制生成的密钥值**（之后无法查看）

### 3. 配置环境变量

```env
MICROSOFT_CLIENT_ID="your-application-id"
MICROSOFT_CLIENT_SECRET="your-client-secret"
MICROSOFT_TENANT_ID="common"
```

---

## 🎵 Spotify API 配置（封面获取）

### 1. 创建 Spotify 应用

1. 访问 [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. 登录你的 Spotify 账号
3. 点击 "Create app"
4. 填写信息：
   - App name："Midai"
   - App description："Music collection manager"
   - Redirect URI：`https://your-domain.com/api/auth/callback/spotify`（实际不需要，但必填）
   - 勾选 API 条款
5. 点击 "Save"

### 2. 获取密钥

1. 进入应用详情页
2. 点击 "Settings"
3. 复制 **Client ID** 和 **Client Secret**
4. 配置环境变量：
   ```env
   SPOTIFY_CLIENT_ID="your-spotify-client-id"
   SPOTIFY_CLIENT_SECRET="your-spotify-client-secret"
   ```

---

## 📧 MusicBrainz 配置

无需 API Key，但需要设置应用标识：

```env
MUSICBRAINZ_APP_NAME="Midai"
MUSICBRAINZ_APP_VERSION="1.0.0"
MUSICBRAINZ_CONTACT="your-email@example.com"
```

使用你的真实邮箱，MusicBrainz 可能会通过此邮箱联系你（如请求过多时）。

---

## 🚀 完整配置示例

```env
# ==========================================
# 核心配置
# ==========================================
NODE_ENV="production"
DATABASE_URL="file:./prod.db"
NEXTAUTH_SECRET="t4tRA3p/6IZxz1ct3yFEJ7sRmMwGO18mQoxpv4ejglU="
NEXTAUTH_URL="https://midai.example.com"

# ==========================================
# Google OAuth（推荐）
# ==========================================
GOOGLE_CLIENT_ID="630691963933-abc123def456.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xyz789uvw456"

# ==========================================
# Microsoft OAuth（可选）
# ==========================================
MICROSOFT_CLIENT_ID="abc12345-1234-5678-90ab-cdef12345678"
MICROSOFT_CLIENT_SECRET="xyz789~abc123.def456"
MICROSOFT_TENANT_ID="common"

# ==========================================
# API 服务
# ==========================================
SPOTIFY_CLIENT_ID="98d47f42ea224ec1a077da4463b528b3"
SPOTIFY_CLIENT_SECRET="b6332169781343adb9df39ea18eaa380"

MUSICBRAINZ_APP_NAME="Midai"
MUSICBRAINZ_APP_VERSION="1.0.0"
MUSICBRAINZ_CONTACT="admin@example.com"
```

---

## 🧪 验证配置

### 1. 本地测试生产构建

```bash
# 复制配置
cp .env.production .env.production.local
# 编辑 .env.production.local 填入真实值

# 安装依赖
npm ci

# 生成 Prisma 客户端
npx prisma generate

# 执行数据库迁移
npx prisma migrate deploy

# 构建
npm run build

# 启动生产服务器
npm start
```

### 2. 测试登录

1. 访问 `https://your-domain.com`
2. 点击 "Collection"
3. 应跳转到登录页面
4. 使用 Google/Microsoft 登录
5. 登录成功后应进入 Collection 页面
6. 添加一张专辑，确认数据保存成功

---

## 🐛 常见问题

### "redirect_uri_mismatch" 错误

OAuth 回调地址不匹配。检查：
1. Google/Microsoft 后台配置的回调地址
2. `NEXTAUTH_URL` 是否正确
3. 两者必须完全一致（包括 https/http）

### "Invalid client" 错误

客户端 ID 或密钥错误。重新复制：
- Google：不要复制错成项目编号
- Microsoft：确保复制的是"应用程序 ID"不是"对象 ID"

### "JWT must be provided" 或会话过期快

`NEXTAUTH_SECRET` 太短或包含特殊字符。重新生成：
```bash
openssl rand -base64 32
```

### 封面获取失败

Spotify API 有请求限制。检查：
1. `SPOTIFY_CLIENT_ID` 和 `SPOTIFY_CLIENT_SECRET` 是否正确
2. Spotify Dashboard 中应用是否处于 "Active" 状态

---

## 📚 相关链接

- [NextAuth.js Google Provider](https://next-auth.js.org/providers/google)
- [NextAuth.js Azure AD Provider](https://next-auth.js.org/providers/azure-ad)
- [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- [MusicBrainz API 文档](https://musicbrainz.org/doc/MusicBrainz_API)
