import { cookies } from 'next/headers'
import { timingSafeCompare, verifyAdminSessionToken } from '@/lib/security'

/**
 * Checks whether the incoming request is authorized as Admin.
 * Supports:
 * 1. Header `x-admin-secret`
 * 2. Header `authorization: Bearer <secret | signed_token>`
 * 3. Cookie `admin_session` (HMAC signed session token)
 */
export async function verifyAdminAuth(request: Request): Promise<boolean> {
  const adminSecret = process.env.ADMIN_SECRET || ''
  const adminPassword = process.env.ADMIN_PASSWORD || ''
  const authSecret = adminSecret || adminPassword

  // If neither is set in development, permit access
  if (!adminSecret && !adminPassword && process.env.NODE_ENV === 'development') {
    return true
  }

  if (!authSecret) {
    return false
  }

  // 1. Check x-admin-secret header (timing-safe comparison)
  const headerSecret =
    request.headers.get('x-admin-secret') || request.headers.get('X-Admin-Secret')
  if (headerSecret) {
    if (adminSecret && timingSafeCompare(headerSecret, adminSecret)) return true
    if (adminPassword && timingSafeCompare(headerSecret, adminPassword)) return true
  }

  // 2. Check Authorization Bearer header
  const authHeader = request.headers.get('authorization') || ''
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (adminSecret && timingSafeCompare(token, adminSecret)) return true
    if (adminPassword && timingSafeCompare(token, adminPassword)) return true
    if (verifyAdminSessionToken(token, authSecret)) return true
  }

  // 3. Check cookies (both from next/headers and Request header)
  let sessionCookie: string | undefined
  try {
    const cookieStore = await cookies()
    sessionCookie = cookieStore.get('admin_session')?.value
  } catch {
    const rawCookie = request.headers.get('cookie') || ''
    const match = rawCookie.match(/(?:^|;\s*)admin_session=([^;]+)/)
    if (match) {
      sessionCookie = decodeURIComponent(match[1])
    }
  }

  if (sessionCookie) {
    // Check cryptographically signed HMAC session token
    if (verifyAdminSessionToken(sessionCookie, authSecret)) {
      return true
    }
    // Also accept raw secret if matched via constant-time comparison
    if (adminSecret && timingSafeCompare(sessionCookie, adminSecret)) return true
    if (adminPassword && timingSafeCompare(sessionCookie, adminPassword)) return true
  }

  return false
}
