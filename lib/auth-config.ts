import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Google from 'next-auth/providers/google'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'
import { prisma } from './db'

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

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  providers,
  trustHost: true,
  callbacks: {
    async session(params: any) {
      const { session, token } = params
      if (session.user && token?.sub) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt(params: any) {
      const { token, account, user } = params
      // 首次登录时保存 account 信息
      if (account) {
        token.accessToken = account.access_token
        token.provider = account.provider
      }
      // 保存用户 ID
      if (user) {
        token.sub = user.id
      }
      return token
    },
    async signIn() {
      return true
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // 允许返回到 callbackUrl
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (url.startsWith(baseUrl)) return url
      return baseUrl
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  debug: process.env.NODE_ENV === 'development',
}

const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

export { handlers, auth, signIn, signOut }
