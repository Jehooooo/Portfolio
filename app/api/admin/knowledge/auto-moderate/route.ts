import { verifyAdminAuth } from '@/lib/admin-auth'
import { getDatabase } from '@/lib/mongodb'
import { trimApiResponse, validateRequestHeaders } from '@/lib/security'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'
import { ObjectId, Filter } from 'mongodb'

export const dynamic = 'force-dynamic'

interface KnowledgeDoc {
  _id: ObjectId
  category: string
  information: string
  status: string
  confidence?: number
  updated_at: string
}

/**
 * POST /api/admin/knowledge/auto-moderate
 * Performs automated or batch approval/rejection of knowledge items
 */
export async function POST(request: Request) {
  const clientIp = getClientIp(request)
  const rateLimit = checkRateLimit(`admin-auto-mod:${clientIp}`, 30, 60 * 1000)
  if (!rateLimit.allowed) {
    return Response.json(
      trimApiResponse({ error: 'Too many requests. Please slow down.' }),
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetTime) } },
    )
  }

  const headerCheck = validateRequestHeaders(request, 64 * 1024)
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

    const action = String(body.action || 'auto_threshold')
    const knowColl = db.collection<KnowledgeDoc>('knowledge')
    const nowIso = new Date().toISOString()

    // 1. Bulk Update specific IDs
    if (action === 'batch_status') {
      const rawIds = body.ids
      const newStatus = String(body.status || '').trim()

      if (!Array.isArray(rawIds) || rawIds.length === 0) {
        return Response.json(
          trimApiResponse({ error: 'Array of item IDs is required.' }),
          { status: 400 },
        )
      }

      if (!['approved', 'rejected', 'pending_review'].includes(newStatus)) {
        return Response.json(
          trimApiResponse({ error: 'Status must be approved, rejected, or pending_review.' }),
          { status: 400 },
        )
      }

      const validObjectIds = rawIds
        .filter((id) => typeof id === 'string' && ObjectId.isValid(id))
        .map((id) => new ObjectId(id as string))

      if (validObjectIds.length === 0) {
        return Response.json(
          trimApiResponse({ error: 'No valid ObjectIds provided.' }),
          { status: 400 },
        )
      }

      const updateRes = await knowColl.updateMany(
        { _id: { $in: validObjectIds } },
        {
          $set: {
            status: newStatus,
            updated_at: nowIso,
          },
        },
      )

      return Response.json(
        trimApiResponse({
          success: true,
          action: 'batch_status',
          matchedCount: updateRes.matchedCount,
          modifiedCount: updateRes.modifiedCount,
          status: newStatus,
          message: `Successfully updated ${updateRes.modifiedCount} items to "${newStatus}".`,
        }),
      )
    }

    // 2. Automated threshold moderation
    if (action === 'auto_threshold') {
      const minConfidence =
        typeof body.minConfidence === 'number' ? Math.max(0, Math.min(1, body.minConfidence)) : 0.85
      const rejectBelow =
        typeof body.rejectBelow === 'number' ? Math.max(0, Math.min(1, body.rejectBelow)) : undefined
      const category = body.category && body.category !== 'all' ? String(body.category) : undefined

      // Auto-approve items meeting minConfidence
      const approveFilter: Filter<KnowledgeDoc> = {
        status: 'pending_review',
        confidence: { $gte: minConfidence },
      }
      if (category) {
        approveFilter.category = category
      }

      const approveRes = await knowColl.updateMany(approveFilter, {
        $set: {
          status: 'approved',
          updated_at: nowIso,
        },
      })

      let rejectRes = { matchedCount: 0, modifiedCount: 0 }
      if (rejectBelow !== undefined && rejectBelow > 0) {
        const rejectFilter: Filter<KnowledgeDoc> = {
          status: 'pending_review',
          confidence: { $lt: rejectBelow },
        }
        if (category) {
          rejectFilter.category = category
        }

        rejectRes = await knowColl.updateMany(rejectFilter, {
          $set: {
            status: 'rejected',
            updated_at: nowIso,
          },
        })
      }

      return Response.json(
        trimApiResponse({
          success: true,
          action: 'auto_threshold',
          approvedCount: approveRes.modifiedCount,
          rejectedCount: rejectRes.modifiedCount,
          minConfidence,
          rejectBelow,
          message: `Automation complete: ${approveRes.modifiedCount} approved (≥ ${Math.round(
            minConfidence * 100,
          )}%)${
            rejectBelow !== undefined
              ? `, ${rejectRes.modifiedCount} rejected (< ${Math.round(rejectBelow * 100)}%)`
              : ''
          }.`,
        }),
      )
    }

    // 3. Approve All or Reject All Filtered
    if (action === 'approve_all' || action === 'reject_all') {
      const targetStatus = action === 'approve_all' ? 'approved' : 'rejected'
      const category = body.category && body.category !== 'all' ? String(body.category) : undefined

      const filter: Filter<KnowledgeDoc> = {
        status: 'pending_review',
      }
      if (category) {
        filter.category = category
      }

      const updateRes = await knowColl.updateMany(filter, {
        $set: {
          status: targetStatus,
          updated_at: nowIso,
        },
      })

      return Response.json(
        trimApiResponse({
          success: true,
          action,
          modifiedCount: updateRes.modifiedCount,
          message: `Successfully marked ${updateRes.modifiedCount} pending items as "${targetStatus}".`,
        }),
      )
    }

    return Response.json(
      trimApiResponse({ error: `Unknown automation action "${action}".` }),
      { status: 400 },
    )
  } catch (error) {
    console.error('[AutoModerate] Error:', error)
    return Response.json(
      trimApiResponse({
        error: 'Auto-moderation failed due to an unexpected server error.',
      }),
      { status: 500 },
    )
  }
}
