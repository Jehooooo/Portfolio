import { cookies } from 'next/headers'
import { verifyAdminAuth } from '@/lib/admin-auth'
import {
  trimApiResponse,
  timingSafeCompare,
  createAdminSessionToken,
  validateRequestHeaders,
} from '@/lib/security'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/auth
 * Verifies secret with rate limiting and sets an HMAC-signed admin_session cookie
 */
export async function POST(request: Request) {
  try {
    // Validate headers & payload limit (16 KB max)
    const headerCheck = validateRequestHeaders(request, 16 * 1024)
    if (!headerCheck.valid) {
      return Response.json(
        trimApiResponse({ error: headerCheck.error }),
        { status: headerCheck.status || 400 },
      )
    }

    // 1. Rate Limiting: Max 5 login attempts per minute per IP
    const clientIp = getClientIp(request)
    const rateLimit = checkRateLimit(`admin-login:${clientIp}`, 5, 60 * 1000)

    if (!rateLimit.allowed) {
      return Response.json(
        trimApiResponse({
          error: `Too many login attempts. Please slow down and try again in ${rateLimit.resetTime}s.`,
        }),
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetTime) } },
      )
    }

    let body: Record<string, unknown> = {}
    try {
      body = await request.json()
    } catch {
      return Response.json(
        trimApiResponse({ error: 'Malformed JSON payload.' }),
        { status: 400 },
      )
    }

    const submitted = String(body.password || body.secret || '').trim()
    const configuredPassword = (process.env.ADMIN_PASSWORD || '').replace(/^["']|["']$/g, '').trim()
    const configuredSecret = (process.env.ADMIN_SECRET || '').replace(/^["']|["']$/g, '').trim()

    if (!configuredPassword && !configuredSecret) {
      return Response.json(
        trimApiResponse({
          error: 'Neither ADMIN_PASSWORD nor ADMIN_SECRET is configured in server environment variables.',
        }),
        { status: 500 },
      )
    }

    // 2. Timing-safe constant-time comparison
    const isValid =
      (configuredPassword && timingSafeCompare(submitted, configuredPassword)) ||
      (configuredSecret && timingSafeCompare(submitted, configuredSecret))

    if (!isValid) {
      return Response.json(
        trimApiResponse({ error: 'Invalid admin credentials.' }),
        { status: 401 },
      )
    }

    // 3. Cryptographically signed HMAC session token
    const authKey = configuredSecret || configuredPassword
    const signedSessionToken = createAdminSessionToken(authKey)

    // Set secure HTTP-only cookie
    const cookieStore = await cookies()
    cookieStore.set('admin_session', signedSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return Response.json(
      trimApiResponse({
        success: true,
        message: 'Authentication successful.',
      }),
    )
  } catch (error) {
    console.error('[AdminAuth] Login error:', error)
    return Response.json(
      trimApiResponse({
        error: 'Authentication failed due to an unexpected error.',
      }),
      { status: 500 },
    )
  }
}

/**
 * GET /api/admin/auth
 * Returns whether current session is authenticated
 */
export async function GET(request: Request) {
  const clientIp = getClientIp(request)
  const rateLimit = checkRateLimit(`admin-auth-check:${clientIp}`, 60, 60 * 1000)
  if (!rateLimit.allowed) {
    return Response.json(
      trimApiResponse({ error: 'Too many status check requests.' }),
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetTime) } },
    )
  }

  const isAuth = await verifyAdminAuth(request)
  return Response.json(
    trimApiResponse({
      authenticated: isAuth,
    }),
  )
}

/**
 * DELETE /api/admin/auth
 * Logs out and clears admin_session cookie
 */
export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
  return Response.json(
    trimApiResponse({
      success: true,
      message: 'Logged out successfully.',
    }),
  )
}
