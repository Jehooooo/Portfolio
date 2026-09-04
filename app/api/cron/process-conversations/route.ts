import { processUnprocessedConversations } from '@/lib/knowledge-processor'
import { timingSafeCompare, trimApiResponse } from '@/lib/security'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET || ''
  if (!cronSecret && process.env.NODE_ENV === 'development') {
    return true
  }

  if (!cronSecret) {
    return false
  }

  const authHeader = req.headers.get('authorization') || ''
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (timingSafeCompare(token, cronSecret)) {
      return true
    }
  }

  const xCronSecret = req.headers.get('x-cron-secret') || ''
  if (xCronSecret && timingSafeCompare(xCronSecret, cronSecret)) {
    return true
  }

  return false
}

async function handleCronTrigger(req: Request) {
  // Rate limiting: Max 10 calls per minute
  const clientIp = getClientIp(req)
  const rateLimit = checkRateLimit(`cron:${clientIp}`, 10, 60 * 1000)
  if (!rateLimit.allowed) {
    return Response.json(
      trimApiResponse({ error: `Too many cron requests. Retry in ${rateLimit.resetTime}s.` }),
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetTime) } },
    )
  }

  if (!isAuthorized(req)) {
    return Response.json(
      trimApiResponse({ error: 'Unauthorized: Invalid or missing CRON_SECRET.' }),
      { status: 401 },
    )
  }

  try {
    const result = await processUnprocessedConversations({
      trigger: 'cron',
      limit: 25,
    })

    return Response.json(
      trimApiResponse({
        success: true,
        timestamp: new Date().toISOString(),
        ...result,
      }),
    )
  } catch (error) {
    console.error('[Cron Process Conversations] Unexpected error:', error)
    return Response.json(
      trimApiResponse({
        success: false,
        error: 'Cron processing encountered an unexpected error.',
      }),
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  return handleCronTrigger(request)
}

export async function POST(request: Request) {
  return handleCronTrigger(request)
}
