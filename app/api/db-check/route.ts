import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startedAt = Date.now()
  const dbName = process.env.MONGODB_DB_NAME || 'jehosue_ai'
  const uri = process.env.MONGODB_URI || ''

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

  // Check Python backend reachability (with short timeout)
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
    result.mongodb.hint =
      'Add MONGODB_URI to your Vercel Project Settings -> Environment Variables and redeploy.'
    return NextResponse.json(result, { status: 503 })
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

    // List collections
    try {
      const collections = await db.listCollections().toArray()
      result.mongodb.collections = collections.map((c) => c.name)
    } catch {
      result.mongodb.collections = []
    }

    return NextResponse.json(result, { status: 200 })
  } catch (err: unknown) {
    const error = err as Error & { code?: number | string }
    const errorMessage = error?.message || 'Unknown database connection error'

    result.status = 'error'
    result.latencyMs = Date.now() - startedAt
    result.mongodb.pingSuccess = false
    result.mongodb.error = errorMessage

    // Diagnose common MongoDB Atlas failure causes
    if (
      errorMessage.includes('whitelist') ||
      errorMessage.includes('ServerSelectionTimeoutError') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('ECONNREFUSED') ||
      error.code === 'ETIMEDOUT'
    ) {
      result.mongodb.hint =
        'Connection timed out. Your MongoDB Atlas cluster is likely blocking Vercel serverless IPs. Go to MongoDB Atlas -> Security -> Network Access -> Add IP Address -> Choose "Allow Access from Anywhere" (0.0.0.0/0).'
    } else if (
      errorMessage.includes('bad auth') ||
      errorMessage.includes('Authentication failed') ||
      error.code === 18
    ) {
      result.mongodb.hint =
        'Authentication failed. Verify the database username and password in your MONGODB_URI in Vercel settings.'
    } else {
      result.mongodb.hint =
        'Ensure MONGODB_URI is accurate and the cluster is currently active in MongoDB Atlas.'
    }

    return NextResponse.json(result, { status: 500 })
  }
}
