import { verifyAdminAuth } from '@/lib/admin-auth'
import { getDatabase } from '@/lib/mongodb'
import { trimApiResponse, escapeRegex } from '@/lib/security'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/visitors
 * Returns visitor profiles and their extracted memories with pagination
 */
export async function GET(request: Request) {
  const clientIp = getClientIp(request)
  const rateLimit = checkRateLimit(`admin-visitors:${clientIp}`, 60, 60 * 1000)
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
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '30', 10), 1), 100)
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1)
    const skip = (page - 1) * limit

    const filter: Record<string, unknown> = {}
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' }
      filter.$or = [
        { visitor_id: searchRegex },
        { display_name: searchRegex },
        { relationship: searchRegex },
        { key_interests: searchRegex },
      ]
    }

    const [profiles, total] = await Promise.all([
      db
        .collection('visitor_profiles')
        .find(filter)
        .sort({ last_seen: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('visitor_profiles').countDocuments(filter),
    ])

    // Also fetch associated memories for these visitors
    const visitorIds = profiles.map((p) => p.visitor_id)
    const memories = await db
      .collection('visitor_memories')
      .find({ visitor_id: { $in: visitorIds }, status: 'active' })
      .toArray()

    const memoriesByVisitor = new Map<string, Array<Record<string, unknown>>>()
    for (const mem of memories) {
      const vid = mem.visitor_id
      if (!memoriesByVisitor.has(vid)) {
        memoriesByVisitor.set(vid, [])
      }
      memoriesByVisitor.get(vid)!.push({
        ...mem,
        _id: mem._id.toString(),
      })
    }

    const enrichedProfiles = profiles.map((p) => ({
      ...p,
      _id: p._id.toString(),
      memories: memoriesByVisitor.get(p.visitor_id) || [],
    }))

    return Response.json(
      trimApiResponse({
        items: enrichedProfiles,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }),
    )
  } catch (error) {
    console.error('[AdminVisitors] Error:', error)
    return Response.json(
      trimApiResponse({
        error: 'Failed to retrieve visitors.',
      }),
      { status: 500 },
    )
  }
}
