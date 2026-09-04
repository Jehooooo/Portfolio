import { processUnprocessedConversations } from '@/lib/knowledge-processor'
import { timingSafeCompare } from '@/lib/security'

export const dynamic = 'force-dynamic'

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET || ''
  // In development or if CRON_SECRET is not configured yet, allow execution
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

  // Also support custom x-cron-secret header
  const xCronSecret = req.headers.get('x-cron-secret') || ''
  if (xCronSecret && timingSafeCompare(xCronSecret, cronSecret)) {
    return true
  }

  return false
}

async function handleCronTrigger(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json(
      { error: 'Unauthorized: Invalid or missing CRON_SECRET.' },
      { status: 401 },
    )
  }

  try {
    const result = await processUnprocessedConversations({
      trigger: 'cron',
      limit: 25,
    })

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    })
  } catch (error) {
    console.error('[Cron Process Conversations] Unexpected error:', error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown cron processing error',
      },
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
