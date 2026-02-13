'use client'

import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Disc3, Code } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

// 开发环境标志（在构建时确定）
const isDevAutoLogin = process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === 'true'

export default function SignIn() {
  return (
    <div className="min-h-screen flex flex-col bg-background-primary">
      {/* Navigation */}
      <nav className="nav-capsule">
        <div className="flex items-center gap-2">
          <Disc3 size={20} className="text-accent" />
          <span className="font-semibold">Midai</span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="p-8 rounded-2xl bg-background-secondary/50 border border-border-color">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 text-accent mb-4">
                <Disc3 size={32} />
              </div>
              <h1 className="text-2xl font-bold text-foreground-primary mb-2">
                Welcome to Midai
              </h1>
              <p className="text-foreground-secondary">
                {isDevAutoLogin 
                  ? 'Development mode - No login required' 
                  : 'Sign in to manage your music collection'}
              </p>
            </div>

            {/* 开发模式快捷入口 */}
            {isDevAutoLogin && (
              <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Code size={18} className="text-amber-500" />
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    Development Mode
                  </span>
                </div>
                <p className="text-sm text-foreground-secondary mb-3">
                  You are in development mode. Click below to enter without login.
                </p>
                <Link href="/collection">
                  <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                    Enter as Dev User
                  </Button>
                </Link>
              </div>
            )}

            {/* OAuth Providers */}
            <div className="space-y-3">
              {/* Google */}
              <Button
                variant="secondary"
                className="w-full flex items-center justify-center gap-3"
                onClick={() => signIn('google', { callbackUrl: '/collection', redirect: true })}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-color" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-background-secondary text-foreground-muted">
                    More options coming soon
                  </span>
                </div>
              </div>

              {/* WeChat & QQ - Coming Soon */}
              <Button
                variant="ghost"
                className="w-full flex items-center justify-center gap-3 opacity-50 cursor-not-allowed"
                disabled
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z" />
                </svg>
                WeChat (Coming Soon)
              </Button>

              <Button
                variant="ghost"
                className="w-full flex items-center justify-center gap-3 opacity-50 cursor-not-allowed"
                disabled
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.003 2c-2.265 0-6.29 1.364-6.29 7.325v1.195S3.55 14.96 3.55 17.474c0 .665.17 1.025.281 1.025.114 0 .902-.484 1.748-2.072 0 0-.18 2.197 1.904 3.967 0 0-1.77.495-1.77 1.182 0 .686 4.078.43 6.29.43 2.21 0 6.287.257 6.287-.43 0-.687-1.768-1.182-1.768-1.182 2.085-1.77 1.905-3.967 1.905-3.967.845 1.588 1.634 2.072 1.746 2.072.111 0 .283-.36.283-1.025 0-2.514-2.166-6.954-2.166-6.954V9.325C18.29 3.364 14.268 2 12.003 2z" />
                </svg>
                QQ (Coming Soon)
              </Button>
            </div>

            {/* Footer */}
            <p className="mt-6 text-center text-sm text-foreground-muted">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
