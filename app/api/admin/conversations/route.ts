import { verifyAdminAuth } from '@/lib/admin-auth'
import { getDatabase } from '@/lib/mongodb'
import { trimApiResponse } from '@/lib/security'
import { ObjectId, Filter } from 'mongodb'

export const dynamic = 'force-dynamic'

interface ConversationDoc {
  _id: ObjectId
  session_id: string
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
    const search = (url.searchParams.get('search') || '').trim()
    const sessionId = (url.searchParams.get('sessionId') || '').trim()
    const status = url.searchParams.get('status') || 'all'
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
            ],
          },
        ]
        delete filter.$or
      } else {
        filter.$or = [
          { visitor_message: searchRegex },
          { ai_response: searchRegex },
          { session_id: searchRegex },
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
    return Response.json(
      trimApiResponse({
        error: `Failed to fetch conversations: ${
          error instanceof Error ? error.message : String(error)
        }`,
      }),
      { status: 500 },
    )
  }
}
