import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'

// 动态配置 providers（只有配置了环境变量才启用）
const providers = []

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }))
}

if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  providers.push(MicrosoftEntraID({
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  }))
}

// 延迟加载 PrismaAdapter（避免 Edge Runtime 问题）
let adapter: any = undefined
if (process.env.NEXT_RUNTIME !== 'edge' && typeof window === 'undefined') {
  try {
    const { PrismaAdapter } = require('@auth/prisma-adapter')
    const { prisma } = require('@/lib/db')
    adapter = PrismaAdapter(prisma)
  } catch (e) {
    console.warn('Failed to load PrismaAdapter:', e)
  }
}

export const authConfig = {
  adapter,
  providers,
  callbacks: {
    async session({ session, user }: { session: any; user: any }) {
      if (session.user) {
        session.user.id = user?.id || session.user.id
      }
      return session
    },
    async signIn() {
      return true
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'database' as const,
  },
}

// Create auth instance for use in other files
const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

export { handlers, auth, signIn, signOut }
