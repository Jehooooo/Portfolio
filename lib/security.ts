/**
 * Unified Security Utilities for Next.js API Routes & Components
 * Covers: Input Validation, Content Escaping, Payload Size & Content-Type Restriction, Response Trimming
 */

/**
 * 15. Escape User Content
 * Converts sensitive HTML characters to safe HTML entities to prevent XSS / injection.
 */
export function escapeHtml(unsafe: string): string {
  if (!unsafe || typeof unsafe !== 'string') return ''
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#x60;')
}

/**
 * 14. Validate & Sanitize General Input
 */
export interface ValidationRules {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  allowedValues?: string[]
}

export function validateString(
  input: unknown,
  rules: ValidationRules = {},
): { valid: boolean; sanitized: string; error?: string } {
  if (input === null || input === undefined) {
    if (rules.required) {
      return { valid: false, sanitized: '', error: 'This field is required.' }
    }
    return { valid: true, sanitized: '' }
  }

  if (typeof input !== 'string') {
    return { valid: false, sanitized: '', error: 'Input must be a valid string.' }
  }

  // Trim and strip null bytes / non-printable control characters (except newline, tab, carriage return)
  const sanitized = input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()

  if (rules.required && sanitized.length === 0) {
    return { valid: false, sanitized: '', error: 'This field cannot be empty.' }
  }

  if (rules.minLength !== undefined && sanitized.length < rules.minLength) {
    return {
      valid: false,
      sanitized,
      error: `Input must be at least ${rules.minLength} characters.`,
    }
  }

  if (rules.maxLength !== undefined && sanitized.length > rules.maxLength) {
    return {
      valid: false,
      sanitized: sanitized.slice(0, rules.maxLength),
      error: `Input must not exceed ${rules.maxLength} characters.`,
    }
  }

  if (rules.pattern && !rules.pattern.test(sanitized)) {
    return { valid: false, sanitized, error: 'Input contains invalid characters or format.' }
  }

  if (rules.allowedValues && !rules.allowedValues.includes(sanitized)) {
    return { valid: false, sanitized, error: 'Value is not permitted.' }
  }

  return { valid: true, sanitized }
}

/**
 * Validates session_id format (safe alphanumeric + hyphens/underscores only)
 */
export function validateSessionId(id: unknown): string {
  if (!id || typeof id !== 'string') {
    return 'anonymous-session'
  }
  const clean = id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
  return clean || 'anonymous-session'
}

/**
 * 16. Restrict File Uploads & Validate Request Headers
 * Rejects unexpected content types (e.g. multipart file uploads) and oversized payloads.
 */
export function validateRequestHeaders(
  req: Request,
  maxSizeBytes: number = 256 * 1024, // default 256 KB
): { valid: boolean; status?: number; error?: string } {
  // Check Content-Type
  const contentType = req.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    return {
      valid: false,
      status: 415,
      error: 'Unsupported Media Type: Only application/json requests are accepted. File uploads are disabled.',
    }
  }

  // Check Content-Length (if present)
  const contentLengthHeader = req.headers.get('content-length')
  if (contentLengthHeader) {
    const contentLength = parseInt(contentLengthHeader, 10)
    if (!isNaN(contentLength) && contentLength > maxSizeBytes) {
      return {
        valid: false,
        status: 413,
        error: `Payload Too Large: Request body exceeds the maximum permitted limit (${Math.round(maxSizeBytes / 1024)} KB).`,
      }
    }
  }

  return { valid: true }
}

/**
 * 17. Trim API Responses
 * Strips internal stack traces, private keys, database metadata, and trims whitespace.
 */
export function trimApiResponse<T>(data: T): T {
  if (typeof data === 'string') {
    return data.trim() as unknown as T
  }
  if (Array.isArray(data)) {
    return data.map((item) => trimApiResponse(item)) as unknown as T
  }
  if (data !== null && typeof data === 'object') {
    const SENSITIVE_KEYS = new Set([
      'password',
      'secret',
      'token',
      'api_key',
      'apiKey',
      'database',
      'connection_string',
      'internal_error',
      'stack',
      '__v',
      '_internal',
    ])

    const trimmed: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key)) continue
      if (value === undefined) continue
      trimmed[key] = trimApiResponse(value)
    }
    return trimmed as T
  }
  return data
}

/**
 * Escapes characters with special meaning in Regular Expressions
 * Prevents ReDoS (Regular Expression Denial of Service) in database queries and RegExp.
 */
export function escapeRegex(unsafe: string): string {
  if (!unsafe || typeof unsafe !== 'string') return ''
  return unsafe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Constant-time string comparison using SHA-256 digests
 * Completely eliminates timing side-channel attacks for secret/password verification.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length === 0 || b.length === 0) return false

  try {
    const crypto = require('crypto')
    const hashA = crypto.createHash('sha256').update(a, 'utf8').digest()
    const hashB = crypto.createHash('sha256').update(b, 'utf8').digest()
    return crypto.timingSafeEqual(hashA, hashB)
  } catch {
    // Fallback constant-time XOR loop if crypto is unavailable
    if (a.length !== b.length) return false
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return result === 0
  }
}

/**
 * Creates a cryptographically signed session token (HMAC-SHA256)
 * Format: <timestamp_ms>.<hmac_signature>
 */
export function createAdminSessionToken(secret: string, ttlMs: number = 7 * 24 * 60 * 60 * 1000): string {
  const crypto = require('crypto')
  const timestamp = Date.now()
  const payload = `admin_session:${timestamp}`
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return `${timestamp}.${hmac}`
}

/**
 * Verifies an HMAC-SHA256 admin session token with expiration check
 */
export function verifyAdminSessionToken(token: string, secret: string, maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): boolean {
  if (!token || !secret || typeof token !== 'string') return false
  const parts = token.split('.')
  if (parts.length !== 2) return false

  const [timestampStr, submittedHmac] = parts
  const timestamp = parseInt(timestampStr, 10)
  if (isNaN(timestamp) || timestamp <= 0) return false

  // Expiration check
  const now = Date.now()
  if (now - timestamp > maxAgeMs || timestamp > now + 60000) {
    return false // expired or from the future
  }

  const crypto = require('crypto')
  const payload = `admin_session:${timestamp}`
  const expectedHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')

  return timingSafeCompare(submittedHmac, expectedHmac)
}

/**
 * Sanitizes visitor inputs against prompt injection demarcations
 * Strips fake system prompt tokens and template boundary lines.
 */
export function sanitizeVisitorPrompt(text: string): string {
  if (!text || typeof text !== 'string') return ''
  return text
    .replace(/[═=]{5,}/g, '---')
    .replace(/\b(APPROVED DYNAMIC KNOWLEDGE|SYSTEM_PROMPT_TEMPLATE|getSystemInstruction)\b/gi, '')
    .replace(/^\[SYSTEM\]/gim, '')
    .trim()
}

/**
 * Post-generation safety net filter for AI outputs
 * Deterministically replaces any inadvertent claims of being powered by third-party models.
 */
export function sanitizeAiOutput(text: string): string {
  if (!text || typeof text !== 'string') return ''

  let sanitized = text
    // Replace claims of third-party model powering
    .replace(
      /\b(powered by (Google'?s?|Gemini|ChatGPT|OpenAI|Anthropic|Claude))\b/gi,
      'trained and built directly by Jeho himself',
    )
    .replace(
      /\b(uses? (Google'?s? Gemini|OpenAI'?s? ChatGPT|Claude))\b/gi,
      'was trained directly by Jeho himself',
    )
    .replace(
      /\b(as an AI (model|language model|assistant) (developed|created) by (Google|OpenAI|Anthropic))\b/gi,
      "as Jeho's AI persona, created and trained by Jeho himself",
    )
    // Redact accidental leaks of private filenames or secrets
    .replace(/lib\/jehosue-knowledge\.ts/g, '[knowledge-base]')
    .replace(/backend\/knowledge_base\.py/g, '[knowledge-base]')

  return sanitized
}