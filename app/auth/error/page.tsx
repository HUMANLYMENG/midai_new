'use client'

import Link from 'next/link'
import { Disc3, AlertCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessages: Record<string, string> = {
    Configuration: 'Authentication configuration error. Please check your environment variables.',
    AccessDenied: 'Access denied. You do not have permission to sign in.',
    Verification: 'The verification token has expired or is invalid.',
    Default: 'An authentication error occurred. Please try again.',
  }

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
        <div className="w-full max-w-md text-center">
          <div className="p-8 rounded-2xl bg-background-secondary/50 border border-border-color">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 mb-4">
              <AlertCircle size={32} />
            </div>
            
            <h1 className="text-2xl font-bold text-foreground-primary mb-2">
              Authentication Error
            </h1>
            
            <p className="text-foreground-secondary mb-6">
              {errorMessages[error || ''] || errorMessages.Default}
            </p>

            {error === 'Configuration' && (
              <div className="text-left text-sm text-foreground-muted mb-6 p-4 bg-background-tertiary rounded-lg">
                <p className="font-medium mb-2">Common causes:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET</li>
                  <li>Incorrect NEXTAUTH_URL</li>
                  <li>Invalid OAuth callback URL in Google Cloud Console</li>
                </ul>
              </div>
            )}

            <Link 
              href="/auth/signin"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
