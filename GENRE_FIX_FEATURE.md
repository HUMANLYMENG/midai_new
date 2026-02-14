# 批量修复缺失流派功能

## 问题
导入歌单失败后，会有大量歌曲和专辑的流派是 undefined 或空字符串，一个一个修改不现实。

## 解决方案
添加了批量修复缺失流派的功能，一键修复所有缺失的流派。

## 实现

### 1. API 端点
**POST /api/genres/fix**
- 批量修复缺失的流派
- 支持修复 tracks、albums 或 both
- 支持 mode: missing (只修复空的) 或 all (全部重新获取)
- 自动限速，遵守 MusicBrainz 1 req/sec 限制

**GET /api/genres/fix**
- 获取缺失流派的统计信息
- 返回 tracks 和 albums 的缺失数量

### 2. 前端界面
- **工具栏按钮**: 当检测到有缺失流派的歌曲/专辑时，显示 "Fix X Genres" 按钮
- **进度弹窗**: 显示修复进度和结果

## 使用方式

### 自动检测
1. 进入 Collection 页面
2. 如果有缺失流派的歌曲/专辑，右上角会显示 "Fix X Genres" 按钮
3. 点击按钮开始修复
4. 等待完成（会自动从 MusicBrainz 获取流派）

### 手动调用 API
```bash
# 获取统计
curl /api/genres/fix

# 修复缺失的流派
curl -X POST /api/genres/fix \
  -H "Content-Type: application/json" \
  -d '{
    "type": "both",
    "mode": "missing",
    "batchSize": 10
  }'
```

## 修复逻辑
1. 查询所有 genre 为 null、'' 或 'undefined' 的 tracks 和 albums
2. 调用 MusicBrainz API 获取流派
3. 更新数据库
4. 自动限速：每首歌之间间隔 1.2 秒

## 注意事项
- 修复过程可能需要较长时间（每首歌 1.2 秒）
- 如果 MusicBrainz 没有该歌曲的数据，流派会保持为空
- 修复完成后页面会自动刷新
