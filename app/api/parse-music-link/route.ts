import { NextRequest, NextResponse } from 'next/server';
import { parseMusicLink } from '@/lib/music-link-parser';

/**
 * POST /api/parse-music-link
 * 解析 QQ音乐/网易云音乐 分享链接
 * 
 * Body: { "url": "https://c6.y.qq.com/..." }
 * Response: { "success": true, "data": { ...song info... } }
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

    // 验证 URL 格式
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const result = await parseMusicLink(url);
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      );
    }

  } catch (error) {
    console.error('[Parse Music Link] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 也支持 GET 方式，通过 query 参数
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Missing url query parameter' },
        { status: 400 }
      );
    }

    const result = await parseMusicLink(url);
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      );
    }

  } catch (error) {
    console.error('[Parse Music Link] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
