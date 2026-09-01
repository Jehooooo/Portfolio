/**
 * In-Memory Sliding Window Rate Limiter for Next.js API Routes.
 * Tracks client IP / session requests and enforces rate limits.
 */

interface RateLimitRecord {
  timestamps: number[]
}

const rateLimitStore = new Map<string, RateLimitRecord>()

// Clean up stale entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 15 * 60 * 1000)
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const windowStart = now - windowMs

  let record = rateLimitStore.get(identifier)
  if (!record) {
    record = { timestamps: [] }
    rateLimitStore.set(identifier, record)
  }

  // Filter timestamps within the current sliding window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart)

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0]
    const resetTime = Math.ceil((oldestTimestamp + windowMs - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      resetTime: Math.max(resetTime, 1),
    }
  }

  // Record this request
  record.timestamps.push(now)

  return {
    allowed: true,
    remaining: limit - record.timestamps.length,
    resetTime: Math.ceil(windowMs / 1000),
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  return '127.0.0.1'
}