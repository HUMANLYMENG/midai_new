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

export const authConfig = {
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
      const { token, account } = params
      // 首次登录时保存 account 信息
      if (account) {
        token.accessToken = account.access_token
        token.provider = account.provider
      }
      return token
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
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60,
  },
  debug: process.env.NODE_ENV === 'development',
}

const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

export { handlers, auth, signIn, signOut }
