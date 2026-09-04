import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'
import { trimApiResponse } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // 1. Rate Limiting: Max 10 requests per minute per IP
  const clientIp = getClientIp(request)
  const rateLimit = checkRateLimit(`db-check:${clientIp}`, 10, 60 * 1000)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      trimApiResponse({
        error: `Too many health check requests. Please retry in ${rateLimit.resetTime}s.`,
      }),
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetTime) } },
    )
  }

  // 2. Check Admin Authentication
  const isAdmin = await verifyAdminAuth(request)

  const startedAt = Date.now()
  const dbName = process.env.MONGODB_DB_NAME || 'portfolio'
  const uri = process.env.MONGODB_URI || ''

  // 3. For Public Non-Admin Requests: Return Minimal Sanitized Health Status Only
  // (Prevents disclosure of MongoDB cluster domains, collection names, or backend URLs)
  if (!isAdmin) {
    try {
      if (!uri) {
        return NextResponse.json({ status: 'degraded' }, { status: 503 })
      }
      const client = await clientPromise
      const db = client.db(dbName)
      await db.command({ ping: 1 })
      return NextResponse.json({ status: 'online', timestamp: new Date().toISOString() }, { status: 200 })
    } catch {
      return NextResponse.json({ status: 'unavailable', timestamp: new Date().toISOString() }, { status: 503 })
    }
  }

  // 4. For Authenticated Administrators: Return Full Diagnostics
  const result: {
    status: 'connected' | 'error' | 'unconfigured'
    timestamp: string
    latencyMs?: number
    database: string
    mongodb: {
      configured: boolean
      uriMasked: string
      pingSuccess: boolean
      collections?: string[]
      error?: string
      hint?: string
    }
    services: {
      geminiConfigured: boolean
      pythonBackendUrl: string
      pythonBackendReachable?: boolean
    }
  } = {
    status: 'unconfigured',
    timestamp: new Date().toISOString(),
    database: dbName,
    mongodb: {
      configured: Boolean(uri && uri.trim().length > 0),
      uriMasked: uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') : 'NOT_SET',
      pingSuccess: false,
    },
    services: {
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
      pythonBackendUrl: process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:5000',
    },
  }

  // Check Python backend reachability
  try {
    const pyCheck = await fetch(`${result.services.pythonBackendUrl}/api/knowledge`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    })
    result.services.pythonBackendReachable = pyCheck.ok || pyCheck.status === 403
  } catch {
    result.services.pythonBackendReachable = false
  }

  if (!result.mongodb.configured) {
    result.status = 'unconfigured'
    result.mongodb.error = 'MONGODB_URI is not declared in environment variables.'
    return NextResponse.json(trimApiResponse(result), { status: 503 })
  }

  try {
    const client = await clientPromise
    const db = client.db(dbName)
    const pingStart = Date.now()
    await db.command({ ping: 1 })
    const pingLatency = Date.now() - pingStart

    result.status = 'connected'
    result.latencyMs = pingLatency
    result.mongodb.pingSuccess = true

    try {
      const collections = await db.listCollections().toArray()
      result.mongodb.collections = collections.map((c) => c.name)
    } catch {
      result.mongodb.collections = []
    }

    return NextResponse.json(trimApiResponse(result), { status: 200 })
  } catch (err: unknown) {
    const error = err as Error & { code?: number | string }
    result.status = 'error'
    result.latencyMs = Date.now() - startedAt
    result.mongodb.pingSuccess = false
    result.mongodb.error = error?.message || 'Database connection error'

    return NextResponse.json(trimApiResponse(result), { status: 500 })
  }
}
