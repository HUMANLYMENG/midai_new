// 主流派颜色映射 - 扩展更多颜色
export const genreColors: Record<string, string> = {
  // 流行
  'pop': '#e91e63',
  'indie pop': '#f48fb1',
  'synthpop': '#ec407a',
  
  // 电子
  'electronic': '#00bcd4',
  'edm': '#26c6da',
  'house': '#4dd0e1',
  'techno': '#80deea',
  'trance': '#b2ebf2',
  
  // 嘻哈/R&B
  'hip hop': '#ff9800',
  'rap': '#ffb74d',
  'r&b': '#9c27b0',
  'soul': '#ba68c8',
  'funk': '#ce93d8',
  
  // 拉丁
  'latin': '#ff5722',
  'reggaeton': '#ff8a65',
  'salsa': '#ffab91',
  
  // 摇滚
  'rock': '#f44336',
  'indie rock': '#e57373',
  'alternative rock': '#ef5350',
  'punk': '#ef9a9a',
  'grunge': '#ffcdd2',
  
  // 金属
  'metal': '#607d8b',
  'heavy metal': '#78909c',
  'death metal': '#90a4ae',
  
  // 乡村/民谣
  'country': '#795548',
  'folk': '#8d6e63',
  'folk/acoustic': '#a1887f',
  'bluegrass': '#bcaaa4',
  
  // 古典
  'classical': '#ffc107',
  'orchestral': '#ffd54f',
  'opera': '#ffe082',
  
  // 爵士/蓝调
  'jazz': '#ffeb3b',
  'blues': '#2196f3',
  'swing': '#64b5f6',
  
  // 轻松/新世纪
  'easy listening': '#00e676',
  'new age': '#1de9b6',
  'ambient': '#69f0ae',
  
  // 世界音乐
  'world music': '#ff1744',
  'reggae': '#f50057',
  'afrobeat': '#d500f9',
  'bossa nova': '#651fff',
  
  // 其他
  'undefined': '#9e9e9e',
  'experimental': '#455a64',
  'soundtrack': '#37474f',
};

// 预定义的鲜艳颜色数组，用于动态分配
export const colorPalette = [
  '#e91e63', // pink
  '#9c27b0', // purple
  '#673ab7', // deep purple
  '#3f51b5', // indigo
  '#2196f3', // blue
  '#03a9f4', // light blue
  '#00bcd4', // cyan
  '#009688', // teal
  '#4caf50', // green
  '#8bc34a', // light green
  '#cddc39', // lime
  '#ffeb3b', // yellow
  '#ffc107', // amber
  '#ff9800', // orange
  '#ff5722', // deep orange
  '#f44336', // red
  '#795548', // brown
  '#607d8b', // blue grey
  '#e53935', // red 600
  '#d81b60', // pink 600
  '#8e24aa', // purple 600
  '#5e35b1', // deep purple 600
  '#3949ab', // indigo 600
  '#1e88e5', // blue 600
  '#039be5', // light blue 600
  '#00acc1', // cyan 600
  '#00897b', // teal 600
  '#43a047', // green 600
  '#7cb342', // light green 600
  '#c0ca33', // lime 600
  '#fdd835', // yellow 600
  '#ffb300', // amber 600
  '#fb8c00', // orange 600
  '#f4511e', // deep orange 600
];

// 获取流派颜色
export function getGenreColor(genre: string): string {
  const normalized = genre.toLowerCase().trim();
  
  // 直接匹配
  if (genreColors[normalized]) {
    return genreColors[normalized];
  }
  
  // 使用哈希算法从调色板中选择颜色
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
}

// 解析流派字符串为数组
export function parseGenres(genreString?: string): string[] {
  if (!genreString) return ['undefined'];
  return genreString.split(/[,/]/).map(g => g.trim().toLowerCase());
}

// 获取主流派（用于图例）
export function getMainGenre(subGenre: string): string {
  const normalized = subGenre.toLowerCase().trim();
  
  // 简化的流派映射
  const mappings: Record<string, string> = {
    'pop': 'pop',
    'dance pop': 'pop',
    'indie pop': 'indie pop',
    'synthpop': 'synthpop',
    'electronic': 'electronic',
    'edm': 'edm',
    'house': 'house',
    'techno': 'techno',
    'trance': 'trance',
    'rock': 'rock',
    'indie rock': 'indie rock',
    'alternative rock': 'alternative rock',
    'punk': 'punk',
    'metal': 'metal',
    'heavy metal': 'heavy metal',
    'jazz': 'jazz',
    'classical': 'classical',
    'hip hop': 'hip hop',
    'rap': 'rap',
    'r&b': 'r&b',
    'soul': 'soul',
    'funk': 'funk',
    'country': 'country',
    'folk': 'folk',
    'folk/acoustic': 'folk/acoustic',
    'blues': 'blues',
    'latin': 'latin',
    'reggaeton': 'reggaeton',
    'reggae': 'reggae',
    'world': 'world music',
  };
  
  return mappings[normalized] || 'undefined';
}
