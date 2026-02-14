# Vercel 部署问题修复

## 问题

Vercel 部署时出现大量 `ECONNRESET` 错误：
```
Error: Client network socket disconnected before secure TLS connection was established
```

发生在调用 MusicBrainz API 时。

## 根本原因

1. **axios 在 Serverless 环境下的问题**
   - axios 默认使用 keep-alive 连接
   - Vercel 的 serverless 函数在执行完毕后立即冻结
   - 再次执行时，复用的连接可能已经失效，导致 TLS 错误

2. **MusicBrainz 限速**
   - MusicBrainz API 限制每秒 1 个请求
   - 频繁的请求容易被拒绝

## 修复内容

### 1. genre-service.ts
- ✅ 从 `axios` 切换到原生 `fetch`
- ✅ 添加 `fetchWithRetry` 函数（最多 3 次重试，指数退避）
- ✅ 添加请求超时控制（10-15 秒）
- ✅ 增加请求间隔到 1.2 秒

### 2. genre-service-with-cache.ts  
- ✅ 从 `axios` 切换到原生 `fetch`
- ✅ 添加相同的重试机制
- ✅ 批量请求间隔增加到 1.2 秒

### 3. cover-service.ts
- ✅ 添加 `fetchWithRetry` 函数
- ✅ MusicBrainz 封面请求添加重试机制

## 技术细节

### fetchWithRetry 实现
```typescript
async function fetchWithRetry(
  url: string, 
  options: RequestInit & { timeout?: number } = {},
  maxRetries = 3
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      // 指数退避：100ms, 200ms, 400ms
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

## 部署建议

1. **重新部署**
   ```bash
   git add .
   git commit -m "fix: replace axios with fetch to fix Vercel ECONNRESET errors"
   git push
   ```

2. **环境变量检查**
   确保以下变量已设置：
   ```
   MUSICBRAINZ_APP_NAME="MidAI"
   MUSICBRAINZ_APP_VERSION="1.0.0"
   MUSICBRAINZ_CONTACT="your-email@example.com"
   ```

3. **监控日志**
   部署后检查 Vercel 函数日志，确认错误是否消失。

## 注意事项

- 原生 `fetch` 在 Node.js 18+ 可用（Vercel 支持）
- 重试机制会增加少量延迟，但提高稳定性
- 缓存仍然有效，可以减少 API 调用

## 仍然存在的文件

以下文件仍使用 axios，但它们调用的是 Spotify/QQ音乐/网易云 API，相对 MusicBrainz 更稳定：
- `lib/music-link-parser.ts` - QQ音乐/网易云解析
- `lib/spotify-parser.ts` - Spotify API

如果后续出现类似问题，也可以考虑将这些文件改为 fetch。
