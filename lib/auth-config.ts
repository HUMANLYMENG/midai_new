import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GitHub from 'next-auth/providers/github'
import { prisma } from './db'

// 动态配置 providers（只有配置了环境变量才启用）
const providers = []

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push({
    id: 'google',
    name: 'Google',
    type: 'oidc' as const,
    issuer: 'https://accounts.google.com',
    authorization: {
      url: 'https://accounts.google.com/o/oauth2/v2/auth',
      params: {
        redirect_uri: 'http://127.0.0.1:3002/api/auth/callback/google'
      }
    },
    token: 'https://oauth2.googleapis.com/token',
    userinfo: 'https://openidconnect.googleapis.com/v1/userinfo',
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    profile(profile: any) {
      return {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        image: profile.picture
      }
    }
  })
}

// Spotify provider with fixed redirect URI
const spotifyProvider = {
  id: 'spotify',
  name: 'Spotify',
  type: 'oauth' as const,
  authorization: {
    url: 'https://accounts.spotify.com/authorize',
    params: {
      scope: 'user-read-email user-read-private',
      redirect_uri: 'http://127.0.0.1:3002/api/auth/callback/spotify'
    }
  },
  token: {
    url: 'https://accounts.spotify.com/api/token',
    params: {
      redirect_uri: 'http://127.0.0.1:3002/api/auth/callback/spotify'
    }
  },
  userinfo: 'https://api.spotify.com/v1/me',
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  profile: (profile: any) => {
    return {
      id: profile.id,
      name: profile.display_name,
      email: profile.email,
      image: profile.images?.[0]?.url ?? null
    }
  }
}

if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
  providers.push(spotifyProvider)
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push({
    id: 'github',
    name: 'GitHub',
    type: 'oauth' as const,
    authorization: {
      url: 'https://github.com/login/oauth/authorize',
      params: {
        redirect_uri: 'http://127.0.0.1:3002/api/auth/callback/github'
      }
    },
    token: 'https://github.com/login/oauth/access_token',
    userinfo: 'https://api.github.com/user',
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    profile(profile: any) {
      return {
        id: profile.id.toString(),
        name: profile.name || profile.login,
        email: profile.email,
        image: profile.avatar_url
      }
    }
  })
}

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  providers,
  trustHost: true,
  basePath: '/api/auth',
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
      // 开发环境强制使用 127.0.0.1
      const devBaseUrl = process.env.NODE_ENV === 'development' 
        ? (process.env.AUTH_URL || 'http://127.0.0.1:3002')
        : baseUrl
      // 允许返回到 callbackUrl
      if (url.startsWith('/')) return `${devBaseUrl}${url}`
      if (url.startsWith(baseUrl)) return url.replace('localhost:3002', '127.0.0.1:3002')
      return devBaseUrl
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
  debug: false,
}

const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

export { handlers, auth, signIn, signOut }
