import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth-config'
import { isDevAutoLogin, getOrCreateDefaultUser } from '@/lib/auth'

/**
 * Next.js Middleware
 * 
 * 生产环境：保护需要登录的路由
 * 开发环境：如果启用 DEV_AUTO_LOGIN，跳过登录检查
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 开发环境自动登录模式，跳过所有认证检查
  if (isDevAutoLogin()) {
    return NextResponse.next()
  }
  
  // 生产环境：检查登录状态
  const session = await auth()
  
  // 需要保护的路由
  const protectedPaths = ['/collection', '/api/albums', '/api/tracks', '/api/import', '/api/covers']
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  
  // 登录页面和认证 API 不需要保护
  const isAuthPath = pathname.startsWith('/auth') || pathname.startsWith('/api/auth')
  
  if (isProtectedPath && !isAuthPath && !session?.user) {
    // 未登录，重定向到登录页面
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }
  
  return NextResponse.next()
}

/**
 * 配置中间件匹配路径
 */
export const config = {
  matcher: [
    // 页面路由
    '/collection/:path*',
    '/dashboard/:path*',
    
    // API 路由
    '/api/albums/:path*',
    '/api/tracks/:path*',
    '/api/import/:path*',
    '/api/covers/:path*',
    '/api/playlist/:path*',
    '/api/genres/:path*',
    '/api/stats/:path*',
    '/api/admin/:path*',
    
    // 排除静态资源和 Next.js 内部路由
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
