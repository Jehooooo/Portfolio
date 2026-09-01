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