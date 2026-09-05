import { verifyAdminAuth } from '@/lib/admin-auth'
import { getDatabase } from '@/lib/mongodb'
import { trimApiResponse, escapeRegex } from '@/lib/security'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'
import { ObjectId, Filter } from 'mongodb'

export const dynamic = 'force-dynamic'

interface ConversationDoc {
  _id: ObjectId
  conversation_id?: string
  session_id: string
  visitor_id?: string
  title?: string
  messages?: Array<{
    message_id: string
    role: string
    raw_content: string
    created_at: string
  }>
  visitor_message: string
  ai_response: string
  timestamp: string
  processed: boolean
  processing_status?: string
  processing_error?: string
  metadata?: Record<string, unknown>
}

/**
 * GET /api/admin/conversations
 * Returns conversations list with search, filter, and pagination
 */
export async function GET(request: Request) {
  const clientIp = getClientIp(request)
  const rateLimit = checkRateLimit(`admin-conversations:${clientIp}`, 60, 60 * 1000)
  if (!rateLimit.allowed) {
    return Response.json(
      trimApiResponse({ error: 'Too many requests. Please slow down.' }),
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetTime) } },
    )
  }

  const isAuth = await verifyAdminAuth(request)
  if (!isAuth) {
    return Response.json(
      trimApiResponse({ error: 'Unauthorized: Admin access required.' }),
      { status: 401 },
    )
  }

  const db = await getDatabase()
  if (!db) {
    return Response.json(
      trimApiResponse({ error: 'Database unavailable.', items: [] }),
      { status: 503 },
    )
  }

  try {
    const url = new URL(request.url)
    const rawSearch = (url.searchParams.get('search') || '').trim().slice(0, 100)
    const search = escapeRegex(rawSearch)
    const rawSessionId = (url.searchParams.get('sessionId') || '').trim().slice(0, 100)
    const sessionId = escapeRegex(rawSessionId)
    const rawStatus = url.searchParams.get('status') || 'all'
    const status = ['all', 'pending', 'processed', 'failed'].includes(rawStatus) ? rawStatus : 'all'
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '30', 10), 1), 100)
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1)
    const skip = (page - 1) * limit

    const convColl = db.collection<ConversationDoc>('conversations')

    const filter: Filter<ConversationDoc> = {}

    if (sessionId) {
      filter.session_id = sessionId
    }

    if (status === 'pending') {
      filter.$or = [
        { processing_status: 'pending' },
        { processing_status: { $exists: false }, processed: false },
      ]
    } else if (status === 'processed') {
      filter.processed = true
    } else if (status === 'failed') {
      filter.processing_status = 'failed'
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' }
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          {
            $or: [
              { visitor_message: searchRegex },
              { ai_response: searchRegex },
              { session_id: searchRegex },
              { title: searchRegex },
            ],
          },
        ]
        delete filter.$or
      } else {
        filter.$or = [
          { visitor_message: searchRegex },
          { ai_response: searchRegex },
          { session_id: searchRegex },
          { title: searchRegex },
        ]
      }
    }

    const [items, total] = await Promise.all([
      convColl.find(filter).sort({ timestamp: -1, _id: -1 }).skip(skip).limit(limit).toArray(),
      convColl.countDocuments(filter),
    ])

    return Response.json(
      trimApiResponse({
        items: items.map((item) => ({
          ...item,
          _id: item._id.toString(),
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }),
    )
  } catch (error) {
    console.error('[AdminConversations] Error:', error)
    return Response.json(
      trimApiResponse({
        error: 'Failed to retrieve conversations.',
      }),
      { status: 500 },
    )
  }
}
