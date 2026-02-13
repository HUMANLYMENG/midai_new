// 测试导入并查看详细日志
const testImport = async () => {
  const url = 'https://c6.y.qq.com/base/fcgi-bin/u?__=your_playlist_url';
  
  console.log('开始导入测试...\n');
  console.time('总耗时');
  
  const startTime = Date.now();
  
  try {
    const res = await fetch('http://localhost:3002/api/playlist/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, limit: 10 }), // 先测试10首
    });
    
    const data = await res.json();
    const endTime = Date.now();
    
    console.log('\n===== 导入结果 =====');
    console.log('成功:', data.success);
    console.log('导入:', data.data?.imported);
    console.log('跳过:', data.data?.skipped);
    console.log('缓存命中 - 封面:', data.data?.cacheHits?.cover);
    console.log('缓存命中 - 流派:', data.data?.cacheHits?.genre);
    console.log('总耗时:', ((endTime - startTime) / 1000).toFixed(2), '秒');
    console.log('平均每首:', ((endTime - startTime) / (data.data?.imported || 1) / 1000).toFixed(2), '秒');
    
  } catch (e) {
    console.error('错误:', e.message);
  }
};

testImport();
