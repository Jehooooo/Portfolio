import { verifyAdminAuth } from '@/lib/admin-auth'
import { getDatabase } from '@/lib/mongodb'
import { trimApiResponse } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
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
    const pingStart = Date.now()
    await db.command({ ping: 1 })
    const dbLatencyMs = Date.now() - pingStart

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [
      totalConversations,
      messagesToday,
      unprocessedCount,
      pendingFactsCount,
      approvedFactsCount,
      rejectedFactsCount,
      recentLogs,
    ] = await Promise.all([
      db.collection('conversations').countDocuments({}),
      db.collection('conversations').countDocuments({
        timestamp: { $gte: oneDayAgo },
      }),
      db.collection('conversations').countDocuments({
        $or: [
          { processing_status: 'pending' },
          { processing_status: { $exists: false }, processed: false },
        ],
      }),
      db.collection('knowledge').countDocuments({ status: 'pending_review' }),
      db.collection('knowledge').countDocuments({ status: 'approved' }),
      db.collection('knowledge').countDocuments({ status: 'rejected' }),
      db
        .collection('processing_logs')
        .find({})
        .sort({ completed_at: -1 })
        .limit(5)
        .toArray(),
    ])

    return Response.json(
      trimApiResponse({
        database: {
          connected: true,
          latencyMs: dbLatencyMs,
        },
        metrics: {
          totalConversations,
          messagesToday,
          unprocessedCount,
          pendingFactsCount,
          approvedFactsCount,
          rejectedFactsCount,
          totalFactsCount: pendingFactsCount + approvedFactsCount + rejectedFactsCount,
        },
        recentLogs: recentLogs.map((log) => ({
          ...log,
          _id: log._id.toString(),
        })),
      }),
    )
  } catch (error) {
    return Response.json(
      trimApiResponse({
        error: `Failed to fetch admin stats: ${
          error instanceof Error ? error.message : String(error)
        }`,
      }),
      { status: 500 },
    )
  }
}
