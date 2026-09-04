import { cookies } from 'next/headers'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { trimApiResponse } from '@/lib/security'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/auth
 * Verifies secret and sets admin_session cookie
 */
export async function POST(request: Request) {
  try {
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
    const configuredPassword = process.env.ADMIN_PASSWORD || ''
    const configuredSecret = process.env.ADMIN_SECRET || ''

    if (!configuredPassword && !configuredSecret) {
      return Response.json(
        trimApiResponse({
          error: 'Neither ADMIN_PASSWORD nor ADMIN_SECRET is configured in server environment variables.',
        }),
        { status: 500 },
      )
    }

    const isValid =
      (configuredPassword && submitted === configuredPassword) ||
      (configuredSecret && submitted === configuredSecret)

    if (!isValid) {
      return Response.json(
        trimApiResponse({ error: 'Invalid admin password.' }),
        { status: 401 },
      )
    }

    const sessionToken = configuredSecret || configuredPassword || 'admin_session_authenticated'

    // Set secure HTTP-only cookie
    const cookieStore = await cookies()
    cookieStore.set('admin_session', sessionToken, {
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
        token: sessionToken,
      }),
    )
  } catch (error) {
    return Response.json(
      trimApiResponse({
        error: `Authentication failed: ${error instanceof Error ? error.message : String(error)}`,
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
