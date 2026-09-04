import { ObjectId } from 'mongodb'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { getDatabase } from '@/lib/mongodb'
import { trimApiResponse, validateRequestHeaders } from '@/lib/security'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/messages
 * Retrieves submitted contact form messages with optional filter and pagination.
 */
export async function GET(request: Request) {
  const clientIp = getClientIp(request)
  const rateLimit = checkRateLimit(`admin-messages-get:${clientIp}`, 60, 60 * 1000)
  if (!rateLimit.allowed) {
    return Response.json(
      trimApiResponse({ error: 'Too many requests. Please slow down.' }),
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetTime) } },
    )
  }

  const isAuth = await verifyAdminAuth(request)
  if (!isAuth) {
    return Response.json(
      trimApiResponse({ error: 'Unauthorized: Admin authentication required.' }),
      { status: 401 },
    )
  }

  const db = await getDatabase()
  if (!db) {
    return Response.json(
      trimApiResponse({ error: 'Database connection unavailable.' }),
      { status: 503 },
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 100)
    const status = searchParams.get('status')

    const query: Record<string, unknown> = {}
    if (status && status !== 'all') {
      query.status = status
    }

    const [messages, totalCount, unreadCount] = await Promise.all([
      db
        .collection('contact_messages')
        .find(query)
        .sort({ created_at: -1 })
        .limit(limit)
        .toArray(),
      db.collection('contact_messages').countDocuments(query),
      db.collection('contact_messages').countDocuments({ status: 'unread' }),
    ])

    return Response.json(
      trimApiResponse({
        messages: messages.map((m) => ({
          _id: m._id.toString(),
          name: m.name,
          email: m.email,
          message: m.message,
          created_at: m.created_at,
          status: m.status || 'unread',
          delivery_status: m.delivery_status || 'saved_locally',
          delivery_method: m.delivery_method || 'none',
          delivery_error: m.delivery_error || null,
        })),
        totalCount,
        unreadCount,
      }),
    )
  } catch (err) {
    console.error('[AdminMessages] Failed to fetch messages:', err)
    return Response.json(
      trimApiResponse({ error: 'Failed to retrieve contact messages.' }),
      { status: 500 },
    )
  }
}

/**
 * PATCH /api/admin/messages
 * Toggles message status between 'read' and 'unread'.
 */
export async function PATCH(request: Request) {
  const clientIp = getClientIp(request)
  const rateLimit = checkRateLimit(`admin-messages-mod:${clientIp}`, 60, 60 * 1000)
  if (!rateLimit.allowed) {
    return Response.json(
      trimApiResponse({ error: 'Too many requests. Please slow down.' }),
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetTime) } },
    )
  }

  const headerCheck = validateRequestHeaders(request, 16 * 1024)
  if (!headerCheck.valid) {
    return Response.json(
      trimApiResponse({ error: headerCheck.error }),
      { status: headerCheck.status || 400 },
    )
  }

  const isAuth = await verifyAdminAuth(request)
  if (!isAuth) {
    return Response.json(
      trimApiResponse({ error: 'Unauthorized: Admin authentication required.' }),
      { status: 401 },
    )
  }

  const db = await getDatabase()
  if (!db) {
    return Response.json(
      trimApiResponse({ error: 'Database connection unavailable.' }),
      { status: 503 },
    )
  }

  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || typeof id !== 'string' || !ObjectId.isValid(id)) {
      return Response.json(
        trimApiResponse({ error: 'Invalid message ID.' }),
        { status: 400 },
      )
    }

    if (!status || !['read', 'unread'].includes(status)) {
      return Response.json(
        trimApiResponse({ error: 'Invalid status. Must be "read" or "unread".' }),
        { status: 400 },
      )
    }

    await db.collection('contact_messages').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updated_at: new Date().toISOString() } },
    )

    return Response.json(trimApiResponse({ success: true, status }))
  } catch (err) {
    console.error('[AdminMessages] Failed to update message:', err)
    return Response.json(
      trimApiResponse({ error: 'Failed to update message.' }),
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/admin/messages
 * Removes a contact message.
 */
export async function DELETE(request: Request) {
  const clientIp = getClientIp(request)
  const rateLimit = checkRateLimit(`admin-messages-mod:${clientIp}`, 60, 60 * 1000)
  if (!rateLimit.allowed) {
    return Response.json(
      trimApiResponse({ error: 'Too many requests. Please slow down.' }),
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetTime) } },
    )
  }

  const isAuth = await verifyAdminAuth(request)
  if (!isAuth) {
    return Response.json(
      trimApiResponse({ error: 'Unauthorized: Admin authentication required.' }),
      { status: 401 },
    )
  }

  const db = await getDatabase()
  if (!db) {
    return Response.json(
      trimApiResponse({ error: 'Database connection unavailable.' }),
      { status: 503 },
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id || typeof id !== 'string' || !ObjectId.isValid(id)) {
      return Response.json(
        trimApiResponse({ error: 'Invalid message ID.' }),
        { status: 400 },
      )
    }

    await db.collection('contact_messages').deleteOne({ _id: new ObjectId(id) })

    return Response.json(trimApiResponse({ success: true }))
  } catch (err) {
    console.error('[AdminMessages] Failed to delete message:', err)
    return Response.json(
      trimApiResponse({ error: 'Failed to delete message.' }),
      { status: 500 },
    )
  }
}
