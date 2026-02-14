# SSE 实时进度同步修复

## 问题
前端进度条显示 "Finalizing..." 时，后端实际才处理了 19/164 首歌。进度不同步是因为前端使用 `setInterval` 模拟进度，而不是真实的后端进度。

## 解决方案
使用 Server-Sent Events (SSE) 实现前后端进度实时同步。

## 实现

### 1. 后端 API
**文件**: `app/api/playlist/import/sse/route.ts`

新的 SSE 端点，支持实时推送进度：
- `type: 'start'` - 开始导入
- `type: 'playlist'` - 歌单信息（歌曲总数）
- `type: 'progress'` - 每首歌处理完成后的进度更新
- `type: 'complete'` - 导入完成
- `type: 'error'` - 导入错误

### 2. 前端修改
**文件**: `app/collection/page.tsx`

修改 `handlePlaylistImport` 函数：
- 使用 `EventSource` 连接 SSE 端点
- 实时更新进度回调
- 正确处理完成和错误状态

**文件**: `components/collection/UnifiedImportModal.tsx`

更新接口定义以支持新的回调参数。

## 数据流

```
用户点击导入
    ↓
前端: handlePlaylistImport 创建 EventSource 连接
    ↓
后端: SSE 连接建立，发送 type='start'
    ↓
后端: 解析歌单，发送 type='playlist' (包含 total)
    ↓
后端: 处理每首歌，发送 type='progress' (current, total)
    ↓
前端: 实时更新进度条
    ↓
后端: 全部完成，发送 type='complete'
    ↓
前端: 显示完成结果
```

## 使用方式

### 前端调用
```typescript
const handleImport = async () => {
  const onProgress = (current: number, total: number) => {
    setProgress({ current, total }); // 实时更新 UI
  };
  
  try {
    const result = await handlePlaylistImport(url, onProgress);
    // 导入完成
  } catch (error) {
    // 导入失败
  }
};
```

## 优势
1. **实时同步**: 前端进度与后端实际处理完全一致
2. **减少等待焦虑**: 用户可以看到真实的处理进度
3. **错误处理**: 可以实时捕获和处理错误
4. **无需轮询**: SSE 是服务器推送，比轮询更高效

## 注意事项
- SSE 连接在 Vercel 上可能会遇到超时限制（最长 30 秒）
- 对于大量歌曲，建议分批处理或增加超时时间
- 网络断开时会自动触发错误处理
