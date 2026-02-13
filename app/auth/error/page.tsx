'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'Configuration':
        return 'Authentication configuration error. Please check your environment variables.'
      case 'AccessDenied':
        return 'Access denied. You do not have permission to sign in.'
      case 'Verification':
        return 'The verification link has expired or has already been used.'
      case 'OAuthSignin':
        return 'Error signing in with OAuth provider. Please try again.'
      case 'OAuthCallback':
        return 'Error processing OAuth callback. Please try again.'
      case 'OAuthCreateAccount':
        return 'Error creating account. Please try again.'
      case 'EmailCreateAccount':
        return 'Error creating email account. Please try again.'
      case 'Callback':
        return 'Error during authentication callback. Please try again.'
      case 'OAuthAccountNotLinked':
        return 'This email is already associated with another account.'
      case 'EmailSignin':
        return 'Error sending email. Please check your email address.'
      case 'CredentialsSignin':
        return 'Invalid credentials. Please check your email and password.'
      default:
        return 'An unknown error occurred during authentication. Please try again.'
    }
  }

  return (
    <>
      <p className="text-foreground-secondary mb-4">
        {getErrorMessage(error)}
      </p>
      {error === 'Configuration' && (
        <div className="text-sm text-foreground-secondary mb-4 p-3 bg-background-primary rounded-lg">
          <p className="font-medium mb-2">Common causes:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET</li>
            <li>Incorrect NEXTAUTH_URL</li>
            <li>Invalid OAuth callback URL in Google Cloud Console</li>
          </ul>
        </div>
      )}
    </>
  )
}

export default function AuthError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-primary">
      <div className="max-w-md w-full p-8 bg-background-secondary rounded-2xl border border-border-color">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle size={24} className="text-red-500" />
          <h1 className="text-xl font-bold">Authentication Error</h1>
        </div>
        <Suspense fallback={<p className="text-foreground-secondary mb-4">Loading error details...</p>}>
          <AuthErrorContent />
        </Suspense>
        <Link href="/auth/signin" className="text-accent hover:underline inline-block">
          Back to Sign In
        </Link>
      </div>
    </div>
  )
}
