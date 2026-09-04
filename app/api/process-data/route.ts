import {
  processUnprocessedConversations,
  getProcessingStats,
} from '@/lib/knowledge-processor'
import { getDatabase } from '@/lib/mongodb'
import { trimApiResponse } from '@/lib/security'

export const dynamic = 'force-dynamic'

function checkAuth(req: Request): boolean {
  const adminSecret = process.env.ADMIN_SECRET
  const cronSecret = process.env.CRON_SECRET

  // In development, allow testing without a secret
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  // If neither secret is set, allow (or log warning)
  if (!adminSecret && !cronSecret) {
    return true
  }

  const authHeader = req.headers.get('authorization') || ''
  const xAdminSecret = req.headers.get('x-admin-secret') || ''

  if (adminSecret && (xAdminSecret === adminSecret || authHeader === `Bearer ${adminSecret}`)) {
    return true
  }

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true
  }

  return false
}

/**
 * POST /api/process-data
 * Triggers knowledge extraction on unprocessed chat conversations.
 */
export async function POST(request: Request) {
  try {
    if (!checkAuth(request)) {
      return Response.json(
        trimApiResponse({ error: 'Forbidden: Valid admin or cron authorization required.' }),
        { status: 403 },
      )
    }

    const result = await processUnprocessedConversations({
      trigger: 'api',
      limit: 20,
    })

    return Response.json(trimApiResponse(result))
  } catch (error) {
    console.error('[API process-data] Extraction error:', error)
    return Response.json(
      trimApiResponse({
        error: `Failed to execute conversation processor: ${
          error instanceof Error ? error.message : String(error)
        }`,
      }),
      { status: 500 },
    )
  }
}

/**
 * GET /api/process-data
 * Returns processing pipeline statistics, pending counts, and recent logs.
 */
export async function GET(request: Request) {
  try {
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
        error: `Failed to fetch processor status: ${
          error instanceof Error ? error.message : String(error)
        }`,
      }),
      { status: 500 },
    )
  }
}
