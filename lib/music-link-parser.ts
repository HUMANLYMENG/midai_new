import axios from 'axios';

// ============ 类型定义 ============

export interface SongInfo {
  id: string;
  name: string;
  artists: string[];
  album: string;
  albumId?: string;
  duration?: string;
  genre?: string;      // 新增：流派
  year?: string;       // 新增：发行年份
  language?: string;   // 新增：语言
}

export interface ParseResult {
  success: boolean;
  type?: 'song' | 'playlist' | 'album';
  platform?: 'qq' | 'netease';
  data?: {
    id: string;
    name: string;
    artists?: string[];
    album?: string;
    albumId?: string;
    albumCover?: string;
    creator?: string;
    description?: string;
    cover?: string;
    songCount?: number;
    songs?: SongInfo[];
    genres?: string[];  // 新增：歌单/专辑的流派标签
    tags?: string[];    // 新增：标签
    url: string;
  };
  error?: string;
}

// ============ QQ音乐流派映射表 ============
const QQ_GENRE_MAP: Record<number, string> = {
  1: '流行',
  2: '摇滚',
  3: '爵士',
  4: '电子',
  5: '民谣',
  6: '轻音乐',
  7: '说唱',
  8: '古典',
  9: '节奏布鲁斯',
  10: '民族',
  11: '英伦',
  12: '朋克',
  13: '布鲁斯',
  14: '后摇',
  15: '舞曲',
  16: '流行舞曲',
  17: '另类/独立',
  18: '浩室',
  19: '蓝草',
  20: '原声',
  21: '香颂',
  22: '儿童音乐',
  23: '口水歌',
  24: '沙发音乐',
  25: '动漫',
  26: '前卫',
  27: '斯卡',
  28: '中国传统',
  29: '福音',
  30: '雷鬼',
  31: '拉丁',
  32: 'trip-hop',
  33: '世界音乐',
  34: '新纪元',
  35: '前卫/实验',
  36: '嘻哈',
  37: '喜剧',
  38: '金属',
  39: '灵魂乐',
  40: '流行摇滚',
  41: '沼泽',
  42: '巴洛克',
  43: 'Celtic',
  44: '音乐剧',
  45: '创意音乐',
  46: '迪斯科',
  47: '前卫摇滚',
  48: '强力流行',
  49: '梦幻流行',
  50: '噪音',
  51: '自赏',
  52: '合成器流行',
  53: '氛围',
  54: '盯鞋',
  55: '独立摇滚',
  56: '硬核朋克',
  57: '垃圾摇滚',
  58: '英伦摇滚',
  59: '暗潮',
  60: '工业',
  61: '暗氛围',
  62: '新民谣',
  63: '后工业',
  64: '军事',
  65: '黑暗艺术',
  66: '新古典',
  67: '中世纪',
  68: '车库摇滚',
  69: '迷幻摇滚',
  70: '交响金属',
  71: '能量金属',
  72: '速度金属',
  73: '激流金属',
  74: '死亡金属',
  75: '黑金属',
  76: '厄运金属',
  77: '新金属',
  78: '流行金属',
  79: '前卫金属',
  80: '碾核',
  81: '氛围黑金属',
  82: '蓝调摇滚',
  83: '南方摇滚',
  84: '硬摇滚',
  85: '基督教摇滚',
  86: '南方金属',
  87: '吉他手',
  88: '爵士布鲁斯',
  89: '钢琴布鲁斯',
  90: '芝加哥布鲁斯',
  91: '三角洲布鲁斯',
  92: '原声布鲁斯',
  93: '路易斯安那布鲁斯',
  94: '电声布鲁斯',
  95: '灵魂布鲁斯',
  96: '灵魂乐',
  97: '摩城',
  98: '新灵魂乐',
  99: '嘟喔普',
  100: '放克',
  101: '灵歌',
  102: '神游舞曲',
  103: '丛林/鼓打贝斯',
  104: '铁克诺',
  105: '出神',
  106: '浩室',
  107: '出神电子',
  108: '电子舞曲',
  109: '氛围出神',
  110: '硬核电子',
  111: '科技舞曲',
  112: '最小化',
  113: '电子实验',
  114: '回响贝斯',
  115: '故障电子',
  116: '智能舞曲',
  117: '芯片音乐',
  118: '嘻哈',
  119: '匪帮说唱',
  120: '东岸说唱',
  121: '西岸说唱',
  122: '流行说唱',
  123: '另类说唱',
  124: '硬核嘻哈',
  125: '低音',
  126: '舞厅',
  127: '回响',
  128: '斯卡',
  129: '舞场雷鬼',
  130: '根源雷鬼',
  131: '牙买加',
  132: '乡村',
  133: '乡村流行',
  134: '另类乡村',
  135: '蓝草',
  136: '美国传统',
  137: '纳什维尔之声',
  138: '另类乡村摇滚',
  139: '唱作人',
  140: '当代民谣',
  141: '迷幻民谣',
  142: '民谣布鲁斯',
  143: '凯尔特民谣',
  144: '根源摇滚',
  145: '原声吉他',
  146: '爱尔兰民谣',
  147: '传统民谣',
  148: '室内乐',
  149: '奏鸣曲',
  150: '协奏曲',
  151: '交响曲',
  152: '管弦乐',
  153: '歌剧',
  154: '艺术歌曲',
  155: '芭蕾',
  156: '组曲',
  157: '合唱',
  158: '当代古典',
  159: '浪漫主义',
  160: '印象派',
  161: '文艺复兴',
  162: '巴洛克',
  163: '古典主义',
  164: '拉丁流行',
  165: '拉丁摇滚',
  166: '拉丁说唱',
  167: '墨西哥音乐',
  168: '萨尔萨',
  169: '雷鬼顿',
  170: '桑巴',
  171: '探戈',
  172: '波萨诺瓦',
  173: '弗拉门戈',
  174: '谣曲',
  175: '非洲音乐',
  176: '卡利普索',
  177: '卡巴莱',
  178: '法国香颂',
  179: '印度音乐',
  180: '日本音乐',
  181: '中东音乐',
  182: '凯尔特',
  183: '波利尼西亚',
  184: '澳大利亚',
  185: '欧洲',
  186: '亚洲',
  187: '北美',
  188: '南美',
  189: '阿拉伯',
  190: '西班牙',
  191: '德国',
  192: '意大利',
  193: '俄语',
  194: '法语',
  195: '希腊语',
  196: '波兰语',
  197: '葡萄牙语',
  198: '希伯来语',
  199: '土耳其',
  200: '韩国',
  201: '现代爵士',
  202: '融合爵士',
  203: '冷爵士',
  204: '自由爵士',
  205: '酸性爵士',
  206: '拉丁爵士',
  207: '比波普',
  208: '摇摆',
  209: '大乐队',
  210: '声乐爵士',
  211: '轻松听',
  212: '沙发音乐',
  213: '自然声音',
  214: '冥想',
  215: '催眠',
  216: '器乐',
  217: '新世纪',
  218: '原声吉他',
  219: '钢琴',
  220: '小提琴',
  221: '大提琴',
  222: '萨克斯',
  223: '小号',
  224: '长笛',
  225: '竖琴',
  226: '口琴',
  227: '班卓琴',
  228: '手风琴',
  229: '打击乐',
  230: '风笛',
  231: '扬琴',
  232: '古琴',
  233: '二胡',
  234: '琵琶',
  235: '笛子',
  236: '古筝',
  237: '葫芦丝',
  238: '马头琴',
  239: '京剧',
  240: '评剧',
  241: '越剧',
  242: '黄梅戏',
  243: '豫剧',
  244: '昆剧',
  245: '粤剧',
  246: '川剧',
  247: '二人转',
  248: '曲艺',
  249: '相声',
  250: '评书',
  251: '快板',
  252: '大鼓',
  253: '民歌',
  254: '山歌',
  255: '号子',
  256: '信天游',
  257: '花儿',
  258: '长调',
  259: '呼麦',
  260: '神曲',
  261: '广场舞',
  262: '健身',
  263: '瑜伽',
  264: '跑步',
  265: '驾驶',
  266: '睡眠',
  267: '学习',
  268: '工作',
  269: '派对',
  270: '婚礼',
  271: '生日',
  272: '节日',
  273: '纪念日',
  274: '旅行',
  275: '风景',
  276: '美食',
  277: '电影',
  278: '电视剧',
  279: '综艺',
  280: '动漫',
  281: '游戏',
  282: '广告',
  283: '预告片',
  284: '纪录片',
  285: '预告',
  286: '片头',
  287: '片尾',
  288: '插曲',
  289: '主题曲',
  290: '背景音乐',
  291: '音效',
  292: '配音',
  293: '朗读',
  294: '有声书',
  295: '播客',
  296: '广播剧',
  297: '脱口秀',
  298: '访谈',
  299: '演讲',
  300: '会议',
  301: '课程',
  302: '讲座',
  303: '培训',
  304: '语言学习',
  305: '儿童教育',
  306: '学前教育',
  307: '小学教育',
  308: '中学教育',
  309: '大学教育',
  310: '职业教育',
  311: '兴趣教育',
  312: '素质教育',
  313: '健康教育',
  314: '心理教育',
  315: '安全教育',
  316: '法律教育',
  317: '财经教育',
  318: '管理教育',
  319: '营销教育',
  320: 'IT教育',
  321: '设计教育',
  322: '音乐教育',
  323: '美术教育',
  324: '体育教育',
  325: '舞蹈教育',
  326: '戏剧教育',
  327: '摄影教育',
  328: '影视教育',
  329: '写作教育',
  330: '演讲教育',
  331: '主持教育',
  332: '表演教育',
  333: '模特教育',
  334: '礼仪教育',
  335: '形象教育',
  336: '情感教育',
  337: '婚恋教育',
  338: '亲子教育',
  339: '家庭教育',
  340: '人际关系',
  341: '职场技能',
  342: '领导力',
  343: '沟通技巧',
  344: '时间管理',
  345: '项目管理',
  346: '团队管理',
  347: '创新思维',
  348: '批判性思维',
  349: '逻辑思维',
  350: '记忆力',
  351: '学习方法',
  352: '考试技巧',
  353: '职业规划',
  354: '求职技巧',
  355: '面试技巧',
  356: '简历制作',
  357: '职场礼仪',
  358: '商务礼仪',
  359: '社交礼仪',
  360: '餐桌礼仪',
  361: '茶道',
  362: '花艺',
  363: '香道',
  364: '书法',
  365: '国画',
  366: '油画',
  367: '素描',
  368: '水彩',
  369: '版画',
  370: '雕塑',
  371: '陶艺',
  372: '编织',
  373: '刺绣',
  374: '剪纸',
  375: '年画',
  376: '泥塑',
  377: '木雕',
  378: '玉雕',
  379: '石雕',
  380: '漆器',
  381: '珐琅',
  382: '金工',
  383: '玻璃艺术',
  384: '纤维艺术',
  385: '纸艺',
  386: '皮艺',
  387: '金属工艺',
  388: '珠宝设计',
  389: '服装设计',
  390: '平面设计',
  391: '工业设计',
  392: '建筑设计',
  393: '室内设计',
  394: '景观设计',
  395: '展示设计',
  396: '广告设计',
  397: '包装设计',
  398: '书籍设计',
  399: '字体设计',
  400: '插画',
};

// ============ 语言映射表 ============
const QQ_LANGUAGE_MAP: Record<number, string> = {
  0: '其他',
  1: '国语',
  2: '粤语',
  3: '英语',
  4: '日语',
  5: '韩语',
  6: '法语',
  7: '德语',
  8: '意大利语',
  9: '西班牙语',
  10: '俄语',
  11: '泰语',
  12: '葡萄牙语',
  13: '阿拉伯语',
  14: '波兰语',
  15: '土耳其语',
  16: '越南语',
  17: '荷兰语',
  18: '印尼语',
  19: '希伯来语',
  20: '希腊语',
  21: '瑞典语',
  22: '挪威语',
  23: '丹麦语',
  24: '芬兰语',
  25: '捷克语',
  26: '匈牙利语',
  27: '罗马尼亚语',
  28: '斯洛伐克语',
  29: '克罗地亚语',
  30: '塞尔维亚语',
  31: '保加利亚语',
  32: '乌克兰语',
  33: '爱沙尼亚语',
  34: '拉脱维亚语',
  35: '立陶宛语',
  36: '斯洛文尼亚语',
  37: '波斯语',
  38: '印地语',
  39: '马来语',
  40: '蒙古语',
  41: '藏语',
  42: '维吾尔语',
  43: '哈萨克语',
  44: '傣语',
  45: '壮语',
  46: '苗语',
  47: '彝语',
  48: '布依语',
  49: '侗语',
  50: '瑶语',
  51: '白语',
  52: '哈尼语',
  53: '黎语',
  54: '傈僳语',
  55: '佤语',
  56: '畲语',
  57: '高山语',
  58: '拉祜语',
  59: '水族语',
  60: '东乡语',
  61: '纳西语',
  62: '景颇语',
  63: '柯尔克孜语',
  64: '土语',
  65: '达斡尔语',
  66: '仫佬语',
  67: '羌语',
  68: '布朗语',
  69: '撒拉语',
  70: '毛南语',
  71: '仡佬语',
  72: '锡伯语',
  73: '阿昌语',
  74: '普米语',
  75: '塔吉克语',
  76: '怒语',
  77: '乌孜别克语',
  78: '俄罗斯语',
  79: '鄂温克语',
  80: '德昂语',
  81: '保安语',
  82: '裕固语',
  83: '京语',
  84: '塔塔尔语',
  85: '独龙语',
  86: '鄂伦春语',
  87: '赫哲语',
  88: '门巴语',
  89: '珞巴语',
  90: '基诺语',
};

// ============ 主解析类 ============

export class MusicLinkParser {
  private http = axios.create({
    timeout: 15000,
    maxRedirects: 10,
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.0(0x18000028) NetType/WIFI Language/zh_CN',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
  });

  async parse(url: string): Promise<ParseResult> {
    try {
      const platform = this.detectPlatform(url);
      if (!platform) {
        return { success: false, error: '不支持的平台，仅支持 QQ音乐 和 网易云音乐' };
      }

      if (platform === 'qq') {
        return await this.parseQQMusic(url);
      } else {
        return await this.parseNetease(url);
      }
    } catch (error) {
      console.error('解析失败:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      };
    }
  }

  private detectPlatform(url: string): 'qq' | 'netease' | null {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('y.qq.com') || lowerUrl.includes('qq.com')) return 'qq';
    if (lowerUrl.includes('163cn.tv') || lowerUrl.includes('163.com') || lowerUrl.includes('netease') || lowerUrl.includes('music.163')) return 'netease';
    return null;
  }

  // ============ QQ音乐解析 ============

  private async parseQQMusic(url: string): Promise<ParseResult> {
    const response = await this.http.get(url);
    const html = response.data as string;
    const finalUrl = response.request?.res?.responseUrl || url;

    const isPlaylist = finalUrl.includes('playlist') || finalUrl.includes('details/playlist');
    const isSong = finalUrl.includes('song') || finalUrl.includes('songDetail');

    let id = null;
    const idMatch = finalUrl.match(/[?&]id=([\d]+)/);
    if (idMatch) id = idMatch[1];

    if (isPlaylist && id) {
      const playlistData = await this.fetchQQPlaylist(id);
      return {
        success: true,
        type: 'playlist',
        platform: 'qq',
        data: {
          id,
          ...playlistData,
          url: `https://y.qq.com/n/ryqq/playlist/${id}`,
        },
      };
    }

    if (isSong) {
      let songMid = null;
      const midMatch = finalUrl.match(/songmid=([\w]+)/i) || finalUrl.match(/songDetail\/([\w]+)/i);
      if (midMatch) songMid = midMatch[1];
      
      if (songMid) {
        const songData = await this.fetchQQSong(songMid);
        return {
          success: true,
          type: 'song',
          platform: 'qq',
          data: {
            id: songMid,
            ...songData,
            url: `https://y.qq.com/n/ryqq/songDetail/${songMid}`,
          },
        };
      }
    }

    return { success: false, error: '无法识别的 QQ音乐 链接类型' };
  }

  private async fetchQQPlaylist(id: string) {
    try {
      const apiUrl = 'https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg';
      const response = await this.http.get(apiUrl, {
        params: {
          type: 1, json: 1, utf8: 1, onlysong: 0, new_format: 1,
          disstid: id, g_tk: 5381, loginUin: 0, hostUin: 0,
          format: 'json', inCharset: 'utf8', outCharset: 'utf-8',
          notice: 0, platform: 'yqq.json', needNewCode: 0,
        },
        headers: { 'Referer': 'https://y.qq.com/' },
      });

      const cdlist = response.data.cdlist?.[0];
      if (!cdlist) throw new Error('获取歌单信息失败');

      // 收集歌单中所有流派和标签
      const genreSet = new Set<string>();
      const songs = cdlist.songlist?.map((s: any) => {
        // 解析流派和语言
        const genre = s.genre ? QQ_GENRE_MAP[s.genre] : undefined;
        const language = s.language ? QQ_LANGUAGE_MAP[s.language] : undefined;
        
        if (genre) genreSet.add(genre);

        return {
          id: s.mid,
          name: s.title || s.name,
          artists: s.singer?.map((sg: any) => sg.name) || [],
          album: s.album?.name || '',
          albumId: s.album?.mid,
          duration: this.formatDuration(s.interval * 1000),
          genre,
          language,
          year: s.time_public?.split('-')[0],
        };
      }) || [];

      return {
        name: cdlist.dissname || '未知歌单',
        creator: cdlist.nickname || '未知用户',
        description: cdlist.desc || '',
        cover: cdlist.logo || cdlist.cover,
        songCount: songs.length,
        songs,
        genres: Array.from(genreSet),
      };
    } catch (error) {
      console.error('QQ歌单 API 失败:', error);
      return { name: '歌单 #' + id, creator: '未知', songCount: 0, songs: [], genres: [] };
    }
  }

  private async fetchQQSong(songMid: string) {
    const apiUrl = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
    const response = await this.http.get(apiUrl, {
      params: {
        format: 'json',
        data: JSON.stringify({
          req_0: {
            module: 'songlist.InfoServer',
            method: 'GetSongDetail',
            param: { song_mid: songMid }
          }
        }),
      },
    });

    const info = response.data.req_0?.data?.songinfo;
    if (!info) throw new Error('获取歌曲详情失败');

    // 解析流派和语言
    const genre = info.genre ? QQ_GENRE_MAP[info.genre] : undefined;
    const language = info.language ? QQ_LANGUAGE_MAP[info.language] : undefined;
    const year = info.time_public?.split('-')[0] || 
                 (info.publish_date ? info.publish_date.split('-')[0] : undefined);

    return {
      name: info.name,
      artists: info.singer?.map((s: any) => s.name) || [],
      album: info.album?.name || '',
      albumId: info.album?.mid,
      albumCover: info.album?.mid ? 
        `https://y.gtimg.cn/music/photo_new/T002R300x300M000${info.album.mid}.jpg` : 
        undefined,
      genre,
      language,
      year,
    };
  }

  // ============ 网易云音乐解析 ============

  private async parseNetease(url: string): Promise<ParseResult> {
    const response = await this.http.get(url, { headers: { 'Referer': 'https://music.163.com/' } });
    const html = response.data as string;
    const finalUrl = response.request?.res?.responseUrl || url;

    const isPlaylist = finalUrl.includes('playlist');
    const isSong = finalUrl.includes('song');

    let id = null;
    const idMatch = finalUrl.match(/[?&]id=(\d+)/);
    if (idMatch) id = idMatch[1];

    if (isPlaylist && id) {
      const playlistData = await this.fetchNeteasePlaylist(id);
      return {
        success: true,
        type: 'playlist',
        platform: 'netease',
        data: {
          id,
          ...playlistData,
          url: `https://music.163.com/playlist?id=${id}`,
        },
      };
    }

    if (isSong && id) {
      const songData = await this.fetchNeteaseSong(id);
      return {
        success: true,
        type: 'song',
        platform: 'netease',
        data: {
          id,
          ...songData,
          url: `https://music.163.com/song?id=${id}`,
        },
      };
    }

    return { success: false, error: '无法识别的网易云音乐链接类型' };
  }

  private async fetchNeteasePlaylist(id: string) {
    try {
      // 获取歌单详情
      const response = await this.http.get('https://music.163.com/api/v6/playlist/detail', {
        params: { id, n: 1000 },
        headers: { 'Referer': 'https://music.163.com/' },
      });

      const playlist = response.data.playlist;
      if (!playlist) throw new Error('获取歌单信息失败');

      // 获取歌单中所有歌曲的详细信息（为了流派）
      const trackIds = playlist.trackIds?.map((t: any) => t.id).join(',') || '';
      const songDetails = await this.fetchNeteaseSongsDetails(trackIds);

      // 获取专辑详情以获取流派信息
      const albumIds = [...new Set(playlist.tracks?.map((t: any) => t.al?.id).filter(Boolean))].slice(0, 20); // 限制前20个专辑
      const albumGenres = await this.fetchNeteaseAlbumsGenres(albumIds as string[]);

      // 合并歌曲信息
      const songs = playlist.tracks?.map((t: any) => {
        const detail = songDetails.get(t.id);
        const albumGenre = t.al?.id ? albumGenres.get(String(t.al.id)) : undefined;
        
        return {
          id: t.id,
          name: t.name,
          artists: t.ar?.map((a: any) => a.name) || [],
          album: t.al?.name || '',
          albumId: t.al?.id,
          duration: this.formatDuration(t.dt),
          genre: albumGenre || detail?.genre,
          year: t.publishTime ? new Date(t.publishTime).getFullYear().toString() : undefined,
        };
      }) || [];

      // 统计歌单流派
      const genreSet = new Set<string>();
      songs.forEach((s: SongInfo) => { if (s.genre) genreSet.add(s.genre); });

      return {
        name: playlist.name || '未知歌单',
        creator: playlist.creator?.nickname || '未知用户',
        description: playlist.description || '',
        cover: playlist.coverImgUrl,
        songCount: playlist.trackCount || songs.length,
        songs,
        genres: Array.from(genreSet),
        tags: playlist.tags || [],
      };
    } catch (error) {
      console.error('网易云歌单 API 失败:', error);
      return { name: '歌单 #' + id, creator: '未知', songCount: 0, songs: [], genres: [], tags: [] };
    }
  }

  private async fetchNeteaseSongsDetails(ids: string): Promise<Map<number, { genre?: string }>> {
    try {
      const response = await this.http.get('https://music.163.com/api/song/detail', {
        params: { ids: `[${ids}]` },
        headers: { 'Referer': 'https://music.163.com/' },
      });

      const result = new Map();
      response.data.songs?.forEach((s: any) => {
        // 网易云歌曲详情中没有直接的genre字段
        result.set(s.id, { genre: undefined });
      });
      return result;
    } catch (error) {
      return new Map();
    }
  }

  private async fetchNeteaseAlbumsGenres(albumIds: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    
    // 批量获取专辑详情（限制并发）
    const batchSize = 5;
    for (let i = 0; i < albumIds.length; i += batchSize) {
      const batch = albumIds.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (albumId) => {
        try {
          const response = await this.http.get(`https://music.163.com/api/album/${albumId}`, {
            headers: { 'Referer': 'https://music.163.com/' },
          });
          
          const album = response.data.album;
          if (album?.tags?.length > 0) {
            result.set(albumId, album.tags.join('/'));
          } else if (album?.genre) {
            result.set(albumId, album.genre);
          }
        } catch (e) {
          // 忽略单个专辑的错误
        }
      }));
    }
    
    return result;
  }

  private async fetchNeteaseSong(id: string) {
    // 获取歌曲详情
    const songRes = await this.http.get('https://music.163.com/api/song/detail', {
      params: { ids: `[${id}]` },
      headers: { 'Referer': 'https://music.163.com/' },
    });

    const song = songRes.data.songs?.[0];
    if (!song) throw new Error('获取歌曲详情失败');

    const album = song.album || song.al || {};
    const artists = song.artists || song.ar || [];

    // 获取专辑详情以获取流派
    let genre: string | undefined;
    try {
      const albumRes = await this.http.get(`https://music.163.com/api/album/${album.id}`, {
        headers: { 'Referer': 'https://music.163.com/' },
      });
      const albumDetail = albumRes.data.album;
      if (albumDetail?.tags?.length > 0) {
        genre = albumDetail.tags.join('/');
      } else if (albumDetail?.genre) {
        genre = albumDetail.genre;
      }
    } catch (e) {
      // 忽略专辑详情错误
    }

    return {
      name: song.name,
      artists: artists.map((a: any) => a.name),
      album: album.name || '',
      albumId: album.id,
      albumCover: album.picUrl || undefined,
      genre,
      year: song.publishTime ? new Date(song.publishTime).getFullYear().toString() : undefined,
    };
  }

  // ============ 工具方法 ============

  private formatDuration(ms?: number): string | undefined {
    if (!ms) return undefined;
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }
}

// 便捷函数
export async function parseMusicLink(url: string): Promise<ParseResult> {
  const parser = new MusicLinkParser();
  return parser.parse(url);
}
