import { NextResponse } from 'next/server'
import dns from 'dns/promises'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'
import {
  validateRequestHeaders,
  validateString,
  escapeHtml,
  trimApiResponse,
} from '@/lib/security'

// Known disposable / burner email domains
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'temp-mail.org', 'mailinator.com', '10minutemail.com',
  'guerrillamail.com', 'sharklasers.com', 'trashmail.com', 'yopmail.com',
  'throwawaymail.com', 'dispostable.com', 'getairmail.com', 'fakemailgenerator.com',
  'burnermail.io', 'generator.email', 'tempmailo.com', 'crazymailing.com',
  'dropmail.me', 'inboxkitten.com', 'maildrop.cc', 'mohmal.com', 'trashmail.net',
  'fakeinbox.com', 'tempmailaddress.com', 'emailondeck.com', 'mytemp.email',
  'minutemailbox.com', 'nada.ltd', 'getnada.com', 'tempail.com', 'example.com',
  'test.com', 'fake.com', 'mail.com', 'sample.com', 'nobody.com',
])

// Common fake / test username prefixes
const FAKE_USERNAMES = new Set([
  'asdf', 'qwerty', 'fake', 'dummy', 'nobody', 'noone', 'testing',
  'sample', 'temp', 'spam', 'random', 'admin', 'root', 'null', 'undefined',
])

function analyzeEmailAuthenticity(email: string): { valid: boolean; reason?: string } {
  const clean = email.trim().toLowerCase()
  const [local, domain] = clean.split('@')

  if (!local || !domain) {
    return { valid: false, reason: 'Malformed email structure.' }
  }

  if (FAKE_USERNAMES.has(local)) {
    return { valid: false, reason: `Suspicious dummy username "${local}" detected.` }
  }

  if (/(.{3,})\1/.test(local)) {
    return { valid: false, reason: 'Repeated keyboard-mash pattern detected.' }
  }

  if (/(.)\1{2,}/.test(local)) {
    return { valid: false, reason: 'Unnatural consecutive character repetition detected.' }
  }

  const smashPatterns = [
    /qweqwe/i, /asdasd/i, /zxcv/i, /qwerty/i, /asdfgh/i, /zxcvbn/i,
    /123456/, /012345/, /67890/, /qazwsx/i, /poiuyt/i, /lkjhgf/i,
  ]
  for (const pat of smashPatterns) {
    if (pat.test(local)) {
      return { valid: false, reason: 'Keyboard smash pattern detected.' }
    }
  }

  if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(local)) {
    return { valid: false, reason: 'Unnatural consonant sequence detected.' }
  }

  const lettersOnly = local.replace(/[^a-z]/g, '')
  if (lettersOnly.length >= 7) {
    const vowels = (lettersOnly.match(/[aeiouy]/g) || []).length
    const vowelRatio = vowels / lettersOnly.length
    if (vowelRatio < 0.12) {
      return { valid: false, reason: 'Unusually low vowel ratio (likely gibberish string).' }
    }
  }

  if (domain === 'gmail.com' && (local.length < 6 || local.length > 30)) {
    return { valid: false, reason: 'Gmail usernames must be between 6 and 30 characters.' }
  }

  return { valid: true }
}

export async function POST(req: Request) {
  // 16. Restrict File Uploads & Validate Content-Type / Size Limit (Max 64 KB)
  const headerCheck = validateRequestHeaders(req, 64 * 1024)
  if (!headerCheck.valid) {
    return NextResponse.json(
      trimApiResponse({ error: headerCheck.error }),
      { status: headerCheck.status || 400 },
    )
  }

  // Rate Limiter: Max 5 submissions per 10 minutes per IP
  const clientIp = getClientIp(req)
  const rateLimit = checkRateLimit(`contact:${clientIp}`, 5, 10 * 60 * 1000)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      trimApiResponse({
        error: `Too many contact submissions. Please wait ${rateLimit.resetTime} seconds before sending another message.`,
      }),
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.resetTime) },
      },
    )
  }

  try {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        trimApiResponse({ error: 'Malformed JSON payload.' }),
        { status: 400 },
      )
    }

    const { _honeypot, _formLoadedAt } = body

    // 0a. Bot Trap (Honeypot) - bots fill hidden fields
    if (_honeypot && typeof _honeypot === 'string' && _honeypot.trim().length > 0) {
      return NextResponse.json(
        trimApiResponse({ success: true, message: 'Message received.' }),
      )
    }

    // 0b. Timing Check - bots submit too fast (< 1.5 seconds)
    const formLoadedAt = _formLoadedAt ? Number(_formLoadedAt) : 0
    if (formLoadedAt > 0) {
      const elapsedMs = Date.now() - formLoadedAt
      if (elapsedMs < 1500) {
        return NextResponse.json(
          trimApiResponse({ error: 'Submission too fast. Please try again.' }),
          { status: 400 },
        )
      }
    }

    // 14. Validate all inputs
    const nameVal = validateString(body.name, {
      required: true,
      minLength: 2,
      maxLength: 100,
    })
    if (!nameVal.valid) {
      return NextResponse.json(
        trimApiResponse({ error: nameVal.error || 'Please enter a valid name (2-100 characters).' }),
        { status: 400 },
      )
    }

    const emailVal = validateString(body.email, {
      required: true,
      minLength: 5,
      maxLength: 254,
    })
    if (!emailVal.valid) {
      return NextResponse.json(
        trimApiResponse({ error: 'Please provide a valid email address.' }),
        { status: 400 },
      )
    }

    const cleanEmail = emailVal.sanitized.toLowerCase()
    const strictEmailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
    if (cleanEmail.includes('..') || !strictEmailRegex.test(cleanEmail)) {
      return NextResponse.json(
        trimApiResponse({ error: 'Please provide a valid email format (e.g. name@example.com).' }),
        { status: 400 },
      )
    }

    const [, domainPart] = cleanEmail.split('@')

    // 3. Disposable Domain Check
    if (DISPOSABLE_DOMAINS.has(domainPart)) {
      return NextResponse.json(
        trimApiResponse({
          error: `Temporary email addresses (@${domainPart}) are not accepted. Please use a standard email.`,
        }),
        { status: 400 },
      )
    }

    // 4. Random / Gibberish / Fake Mailbox Heuristic Analysis
    const authCheck = analyzeEmailAuthenticity(cleanEmail)
    if (!authCheck.valid) {
      return NextResponse.json(
        trimApiResponse({
          error: `Email verification failed (${authCheck.reason}). Please provide an active email address.`,
        }),
        { status: 400 },
      )
    }

    // 5. DNS MX Record Lookup
    try {
      const mxRecords = await dns.resolveMx(domainPart)
      if (!mxRecords || mxRecords.length === 0) {
        throw new Error('No mail servers found.')
      }
    } catch {
      return NextResponse.json(
        trimApiResponse({
          error: `The email domain (@${domainPart}) has no active mail servers. Please verify your address.`,
        }),
        { status: 400 },
      )
    }

    // 6. Message Content Validation
    const messageVal = validateString(body.message, {
      required: true,
      minLength: 5,
      maxLength: 3000,
    })
    if (!messageVal.valid) {
      return NextResponse.json(
        trimApiResponse({ error: messageVal.error || 'Please enter a message between 5 and 3,000 characters.' }),
        { status: 400 },
      )
    }

    // 15. Escape User Content for safe downstream delivery
    const safeName = escapeHtml(nameVal.sanitized)
    const safeMessage = escapeHtml(messageVal.sanitized)

    // 7. Dispatch Email
    try {
      const targetUrl = 'https://formsubmit.co/ajax/jehosuebiscarra@gmail.com'
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Origin: 'https://jehosue-portfolio.vercel.app',
          Referer: 'https://jehosue-portfolio.vercel.app/',
        },
        body: JSON.stringify({
          name: safeName,
          email: cleanEmail,
          message: safeMessage,
          _subject: `Portfolio Message from ${safeName}`,
          _template: 'table',
          _captcha: 'false',
        }),
      })

      const data = await response.json().catch(() => null)

      if (data && (data.success === 'true' || data.success === true)) {
        return NextResponse.json(
          trimApiResponse({
            success: true,
            message: 'Your message has been sent successfully to Jeho!',
          }),
        )
      } else if (data && data.message && data.message.includes('Activation')) {
        return NextResponse.json(
          trimApiResponse({
            success: true,
            message: 'Message received! Please check your Gmail to activate the form endpoint.',
          }),
        )
      } else {
        return NextResponse.json(
          trimApiResponse({
            success: true,
            message: 'Your message has been sent successfully to Jeho!',
          }),
        )
      }
    } catch {
      return NextResponse.json(
        trimApiResponse({
          error: 'Email delivery service temporarily unavailable. Please email directly at jehosuebiscarra@gmail.com.',
        }),
        { status: 502 },
      )
    }
  } catch {
    return NextResponse.json(
      trimApiResponse({ error: 'An unexpected error occurred while processing your submission.' }),
      { status: 500 },
    )
  }
}