import { verifyAdminAuth } from '@/lib/admin-auth'
import { getDatabase } from '@/lib/mongodb'
import { trimApiResponse } from '@/lib/security'
import { ObjectId, Filter } from 'mongodb'

export const dynamic = 'force-dynamic'

interface KnowledgeDoc {
  _id: ObjectId
  category: string
  information: string
  status: string
  source: string
  session_id: string
  conversation_id?: string
  confidence?: number
  reason?: string
  created_at: string
  updated_at: string
}

/**
 * GET /api/admin/knowledge
 * Lists knowledge items with filtering, search, and pagination
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
    const status = url.searchParams.get('status') || 'pending_review'
    const category = url.searchParams.get('category') || 'all'
    const search = (url.searchParams.get('search') || '').trim()
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10), 1), 100)
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1)
    const skip = (page - 1) * limit

    const knowColl = db.collection<KnowledgeDoc>('knowledge')

    const filter: Filter<KnowledgeDoc> = {}
    if (status !== 'all') {
      filter.status = status
    }
    if (category !== 'all') {
      filter.category = category
    }
    if (search) {
      filter.$or = [
        { information: { $regex: search, $options: 'i' } },
        { reason: { $regex: search, $options: 'i' } },
        { session_id: { $regex: search, $options: 'i' } },
      ]
    }

    const [items, total, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      knowColl.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).toArray(),
      knowColl.countDocuments(filter),
      knowColl.countDocuments({ status: 'pending_review' }),
      knowColl.countDocuments({ status: 'approved' }),
      knowColl.countDocuments({ status: 'rejected' }),
    ])

    return Response.json(
      trimApiResponse({
        items: items.map((item) => ({ ...item, _id: item._id.toString() })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        counts: {
          pending_review: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          all: pendingCount + approvedCount + rejectedCount,
        },
      }),
    )
  } catch (error) {
    return Response.json(
      trimApiResponse({
        error: `Failed to fetch knowledge: ${
          error instanceof Error ? error.message : String(error)
        }`,
      }),
      { status: 500 },
    )
  }
}

/**
 * PATCH /api/admin/knowledge
 * Updates knowledge item status ('approved', 'rejected', 'pending_review')
 */
export async function PATCH(request: Request) {
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
      trimApiResponse({ error: 'Database unavailable.' }),
      { status: 503 },
    )
  }

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

    const id = String(body.id || '').trim()
    const newStatus = String(body.status || '').trim()

    if (!id || !ObjectId.isValid(id)) {
      return Response.json(
        trimApiResponse({ error: 'A valid ObjectId is required.' }),
        { status: 400 },
      )
    }

    if (!['approved', 'rejected', 'pending_review'].includes(newStatus)) {
      return Response.json(
        trimApiResponse({ error: 'Status must be approved, rejected, or pending_review.' }),
        { status: 400 },
      )
    }

    const knowColl = db.collection('knowledge')
    const updateRes = await knowColl.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: newStatus,
          updated_at: new Date().toISOString(),
        },
      },
    )

    if (updateRes.matchedCount === 0) {
      return Response.json(
        trimApiResponse({ error: 'Knowledge item not found.' }),
        { status: 404 },
      )
    }

    return Response.json(
      trimApiResponse({
        success: true,
        id,
        status: newStatus,
      }),
    )
  } catch (error) {
    return Response.json(
      trimApiResponse({
        error: `Failed to update knowledge: ${
          error instanceof Error ? error.message : String(error)
        }`,
      }),
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/admin/knowledge
 * Permanently removes a knowledge item
 */
export async function DELETE(request: Request) {
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
      trimApiResponse({ error: 'Database unavailable.' }),
      { status: 503 },
    )
  }

  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id') || ''

    if (!id || !ObjectId.isValid(id)) {
      return Response.json(
        trimApiResponse({ error: 'Valid ObjectId is required.' }),
        { status: 400 },
      )
    }

    const deleteRes = await db.collection('knowledge').deleteOne({ _id: new ObjectId(id) })
    if (deleteRes.deletedCount === 0) {
      return Response.json(
        trimApiResponse({ error: 'Knowledge item not found.' }),
        { status: 404 },
      )
    }

    return Response.json(
      trimApiResponse({
        success: true,
        id,
        message: 'Item removed successfully.',
      }),
    )
  } catch (error) {
    return Response.json(
      trimApiResponse({
        error: `Failed to delete knowledge item: ${
          error instanceof Error ? error.message : String(error)
        }`,
      }),
      { status: 500 },
    )
  }
}
