import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './db'
import { auth } from '@/lib/auth-config'

/**
 * 获取当前登录用户 ID
 * 用于 API 路由权限控制
 */
export async function getCurrentUserId(req: NextRequest): Promise<string | NextResponse> {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return session.user.id
}

/**
 * 检查用户是否已认证
 * 用于页面组件
 */
export async function requireAuth() {
  const session = await auth()

  if (!session?.user) {
    return null
  }

  return session.user
}

/**
 * 获取或创建默认用户（用于开发测试）
 */
export async function getOrCreateDefaultUser() {
  const defaultEmail = 'dev@midai.local'

  let user = await prisma.user.findUnique({
    where: { email: defaultEmail }
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: defaultEmail,
        name: 'Dev User',
      }
    })
  }

  return user
}
