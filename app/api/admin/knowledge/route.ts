import { verifyAdminAuth } from '@/lib/admin-auth'
import { getDatabase } from '@/lib/mongodb'
import { trimApiResponse, escapeRegex, validateRequestHeaders } from '@/lib/security'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'
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
  const clientIp = getClientIp(request)
  const rateLimit = checkRateLimit(`admin-knowledge-get:${clientIp}`, 60, 60 * 1000)
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
    const rawStatus = url.searchParams.get('status') || 'pending_review'
    const status = ['all', 'pending_review', 'approved', 'rejected'].includes(rawStatus)
      ? rawStatus
      : 'pending_review'
    const category = (url.searchParams.get('category') || 'all').slice(0, 50)
    const rawSearch = (url.searchParams.get('search') || '').trim().slice(0, 100)
    const search = escapeRegex(rawSearch)
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
    console.error('[AdminKnowledge] GET error:', error)
    return Response.json(
      trimApiResponse({
        error: 'Failed to fetch knowledge items.',
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
  const clientIp = getClientIp(request)
  const rateLimit = checkRateLimit(`admin-knowledge-mod:${clientIp}`, 60, 60 * 1000)
  if (!rateLimit.allowed) {
    return Response.json(
      trimApiResponse({ error: 'Too many requests. Please slow down.' }),
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetTime) } },
    )
  }

  const headerCheck = validateRequestHeaders(request, 32 * 1024)
  if (!headerCheck.valid) {
    return Response.json(
      trimApiResponse({ error: headerCheck.error }),
      { status: headerCheck.status || 400 },
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
    console.error('[AdminKnowledge] PATCH error:', error)
    return Response.json(
      trimApiResponse({
        error: 'Failed to update knowledge item.',
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
  const clientIp = getClientIp(request)
  const rateLimit = checkRateLimit(`admin-knowledge-mod:${clientIp}`, 60, 60 * 1000)
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
    console.error('[AdminKnowledge] DELETE error:', error)
    return Response.json(
      trimApiResponse({
        error: 'Failed to delete knowledge item.',
      }),
      { status: 500 },
    )
  }
}
