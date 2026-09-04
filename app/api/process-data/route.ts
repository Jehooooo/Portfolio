import {
  processUnprocessedConversations,
  getProcessingStats,
} from '@/lib/knowledge-processor'
import { getDatabase } from '@/lib/mongodb'
import { trimApiResponse, timingSafeCompare, validateRequestHeaders } from '@/lib/security'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

async function checkAuth(req: Request): Promise<boolean> {
  // 1. Check if authenticated as admin (covers cookies, x-admin-secret, Bearer token)
  const isAdmin = await verifyAdminAuth(req)
  if (isAdmin) return true

  // 2. Check CRON_SECRET for automated background cron triggers
  const cronSecret = process.env.CRON_SECRET || ''
  if (cronSecret) {
    const authHeader = req.headers.get('authorization') || ''
    const xCronSecret = req.headers.get('x-cron-secret') || ''
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
    if (bearerToken && timingSafeCompare(bearerToken, cronSecret)) return true
    if (xCronSecret && timingSafeCompare(xCronSecret, cronSecret)) return true
  }

  // 3. If no secrets are configured in development mode, permit access for local testing
  if (
    !process.env.ADMIN_SECRET &&
    !process.env.ADMIN_PASSWORD &&
    !cronSecret &&
    process.env.NODE_ENV === 'development'
  ) {
    return true
  }

  return false
}

/**
 * POST /api/process-data
 * Triggers knowledge extraction on unprocessed chat conversations.
 */
export async function POST(request: Request) {
  const clientIp = getClientIp(request)
  const rateLimit = checkRateLimit(`process-data-post:${clientIp}`, 15, 60 * 1000)
  if (!rateLimit.allowed) {
    return Response.json(
      trimApiResponse({ error: 'Too many processing requests. Please wait.' }),
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetTime) } },
    )
  }

  try {
    const authorized = await checkAuth(request)
    if (!authorized) {
      return Response.json(
        trimApiResponse({ error: 'Forbidden: Valid admin or cron authorization required.' }),
        { status: 403 },
      )
    }

    const contentType = request.headers.get('content-type') || ''
    if (contentType.toLowerCase().includes('application/json')) {
      const headerCheck = validateRequestHeaders(request, 16 * 1024)
      if (!headerCheck.valid) {
        return Response.json(
          trimApiResponse({ error: headerCheck.error }),
          { status: headerCheck.status || 400 },
        )
      }
    }

    let bodyLimit: number | undefined
    let conversationId: string | undefined
    try {
      const body = await request.json()
      if (body && typeof body === 'object') {
        if (typeof body.limit === 'number') bodyLimit = body.limit
        if (typeof body.conversationId === 'string') conversationId = body.conversationId.trim()
      }
    } catch {
      // Body is optional
    }

    const url = new URL(request.url)
    const queryLimit = parseInt(url.searchParams.get('limit') || '', 10)
    const finalLimit = Math.min(Math.max(bodyLimit || (isNaN(queryLimit) ? 50 : queryLimit), 1), 100)
    const targetConvId = conversationId || url.searchParams.get('conversationId') || undefined

    const result = await processUnprocessedConversations({
      trigger: 'api',
      limit: finalLimit,
      conversationId: targetConvId,
    })

    return Response.json(trimApiResponse(result))
  } catch (error) {
    console.error('[API process-data] Extraction error:', error)
    return Response.json(
      trimApiResponse({
        error: 'Failed to execute conversation processor.',
      }),
      { status: 500 },
    )
  }
}

/**
 * GET /api/process-data
 * Returns processing pipeline statistics, pending counts, and recent logs (requires admin/cron auth).
 */
export async function GET(request: Request) {
  const clientIp = getClientIp(request)
  const rateLimit = checkRateLimit(`process-data-get:${clientIp}`, 30, 60 * 1000)
  if (!rateLimit.allowed) {
    return Response.json(
      trimApiResponse({ error: 'Too many requests. Please slow down.' }),
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetTime) } },
    )
  }

  try {
    const authorized = await checkAuth(request)
    if (!authorized) {
      return Response.json(
        trimApiResponse({ error: 'Forbidden: Valid admin or cron authorization required.' }),
        { status: 403 },
      )
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    // If requested action is list of pending knowledge
    if (action === 'pending' || action === 'knowledge') {
      const db = await getDatabase()
      if (!db) {
        return Response.json(
          trimApiResponse({ error: 'Database unavailable', items: [] }),
          { status: 503 },
        )
      }

      const status = url.searchParams.get('status') || 'pending_review'
      const items = await db
        .collection('knowledge')
        .find(status === 'all' ? {} : { status })
        .sort({ created_at: -1 })
        .limit(50)
        .toArray()

      return Response.json(
        trimApiResponse({
          count: items.length,
          items: items.map((item) => ({ ...item, _id: item._id.toString() })),
        }),
      )
    }

    // Default: return processor statistics and audit history
    const stats = await getProcessingStats()
    return Response.json(trimApiResponse(stats))
  } catch (error) {
    console.error('[API process-data] Error fetching stats:', error)
    return Response.json(
      trimApiResponse({
        error: 'Failed to fetch processor status.',
      }),
      { status: 500 },
    )
  }
}
