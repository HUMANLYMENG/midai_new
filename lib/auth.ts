import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './db'
import { auth } from '@/lib/auth-config'

/**
 * 判断是否为开发环境且启用自动登录
 */
export function isDevAutoLogin(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.DEV_AUTO_LOGIN === 'true'
}

/**
 * 获取当前登录用户 ID
 * 
 * 生产环境：必须登录，未登录返回 401
 * 开发环境：如果启用 DEV_AUTO_LOGIN，自动使用默认用户
 */
export async function getCurrentUserId(req?: NextRequest): Promise<string | null> {
  // 首先尝试获取 session
  const session = await auth()
  
  if (session?.user?.id) {
    return session.user.id
  }
  
  // 开发环境自动登录
  if (isDevAutoLogin()) {
    const defaultUser = await getOrCreateDefaultUser()
    return defaultUser.id
  }
  
  return null
}

/**
 * 获取当前登录用户 ID（API 路由专用）
 * 
 * 生产环境：未登录返回 401 Response
 * 开发环境：如果启用 DEV_AUTO_LOGIN，自动使用默认用户
 */
export async function requireUserId(req?: NextRequest): Promise<string | NextResponse> {
  const userId = await getCurrentUserId(req)
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  return userId
}

/**
 * 检查用户是否已认证（页面组件使用）
 * 
 * 生产环境：返回 null 表示未登录
 * 开发环境：如果启用 DEV_AUTO_LOGIN，返回默认用户
 */
export async function requireAuth() {
  const userId = await getCurrentUserId()
  
  if (!userId) {
    return null
  }
  
  // 获取完整用户信息
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true }
  })
  
  return user
}

/**
 * 获取或创建默认用户（用于开发测试）
 */
export async function getOrCreateDefaultUser() {
  const defaultEmail = 'dev@midai.local'
  const defaultName = 'Development User'

  let user = await prisma.user.findUnique({
    where: { email: defaultEmail }
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: defaultEmail,
        name: defaultName,
      }
    })
    console.log('[Auth] Created default development user:', user.id)
  }

  return user
}

/**
 * 获取开发环境默认用户（用于客户端）
 */
export function getDevDefaultUser() {
  if (!isDevAutoLogin()) {
    return null
  }
  
  return {
    id: 'dev-user',
    name: 'Development User',
    email: 'dev@midai.local',
    image: null,
    isDevUser: true
  }
}

/**
 * 包装响应，开发模式下添加特殊头部
 */
export function wrapAuthResponse(response: NextResponse): NextResponse {
  if (isDevAutoLogin()) {
    response.headers.set('X-Dev-Auto-Login', 'true')
  }
  return response
}
