import { NextRequest, NextResponse } from 'next/server';
import { MusicLinkParser } from '@/lib/music-link-parser';

/**
 * POST /api/playlist/parse
 * 解析 QQ音乐/网易云音乐歌单链接，返回预览数据
 * 
 * Body: { "url": "https://c6.y.qq.com/..." }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    // 识别平台
    const platform = detectPlatform(url);
    if (!platform) {
      return NextResponse.json(
        { success: false, error: 'Unsupported platform. Only QQ Music and NetEase Cloud Music are supported.' },
        { status: 400 }
      );
    }

    // 解析歌单
    const parser = new MusicLinkParser();
    const result = await parser.parse(url);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to parse playlist' },
        { status: 422 }
      );
    }

    // 只返回歌单类型
    if (result.type !== 'playlist') {
      return NextResponse.json(
        { success: false, error: 'URL does not point to a playlist' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      platform: platform === 'qq' ? 'QQ音乐' : '网易云音乐',
      data: {
        name: result.data.name,
        creator: result.data.creator,
        description: result.data.description,
        cover: result.data.cover,
        songCount: result.data.songCount,
        songs: result.data.songs,
        genres: result.data.genres,
        tags: result.data.tags,
      },
    });

  } catch (error) {
    console.error('[Playlist Parse API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function detectPlatform(url: string): 'qq' | 'netease' | null {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('y.qq.com') || lowerUrl.includes('qq.com')) return 'qq';
  if (lowerUrl.includes('163cn.tv') || lowerUrl.includes('163.com') || lowerUrl.includes('netease') || lowerUrl.includes('music.163')) return 'netease';
  return null;
}
