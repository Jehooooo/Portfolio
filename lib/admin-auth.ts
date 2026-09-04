import { cookies } from 'next/headers'

/**
 * Checks whether the incoming request is authorized as Admin.
 * Supports:
 * 1. Header `x-admin-secret`
 * 2. Header `authorization: Bearer <secret>`
 * 3. Cookie `admin_session`
 */
export async function verifyAdminAuth(request: Request): Promise<boolean> {
  const adminSecret = process.env.ADMIN_SECRET || ''

  // If no ADMIN_SECRET is set in development, permit access with a warning
  if (!adminSecret && process.env.NODE_ENV === 'development') {
    return true
  }

  if (!adminSecret) {
    return false
  }

  // 1. Check x-admin-secret header
  const headerSecret =
    request.headers.get('x-admin-secret') || request.headers.get('X-Admin-Secret')
  if (headerSecret && headerSecret === adminSecret) {
    return true
  }

  // 2. Check Authorization Bearer header
  const authHeader = request.headers.get('authorization') || ''
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (token === adminSecret) {
      return true
    }
  }

  // 3. Check cookies (both from Request header & next/headers)
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('admin_session')?.value
    if (sessionCookie && sessionCookie === adminSecret) {
      return true
    }
  } catch {
    // Fallback: parse cookie header manually
    const rawCookie = request.headers.get('cookie') || ''
    const match = rawCookie.match(/(?:^|;\s*)admin_session=([^;]+)/)
    if (match && decodeURIComponent(match[1]) === adminSecret) {
      return true
    }
  }

  return false
}
