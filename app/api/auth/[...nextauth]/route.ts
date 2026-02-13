import { handlers } from '@/lib/auth-config'

export const { GET, POST } = handlers

// Force Node.js runtime (not Edge) for auth
export const runtime = 'nodejs'
