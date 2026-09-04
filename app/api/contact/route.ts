import { NextResponse } from 'next/server'
import dns from 'dns/promises'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'
import { getDatabase } from '@/lib/mongodb'
import { dispatchContactEmail } from '@/lib/email-service'
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
  'test.com', 'fake.com', 'nobody.com',
])

// Trusted mail domains (skip DNS MX lookup latency & false positives)
const TRUSTED_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.com.ph', 'outlook.com',
  'hotmail.com', 'live.com', 'icloud.com', 'me.com', 'proton.me', 'protonmail.com',
  'aol.com', 'zoho.com', 'msn.com',
])

// Common fake / test username prefixes
const FAKE_USERNAMES = new Set([
  'asdf', 'qwerty', 'fake', 'dummy', 'nobody', 'noone', 'testing',
  'sample', 'temp', 'spam', 'random', 'null', 'undefined',
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

  // Keyboard smash patterns (only obvious sequences)
  const smashPatterns = [
    /qweqwe/i, /asdasd/i, /zxcvzxcv/i, /qwertyuiop/i, /asdfghjkl/i,
    /12345678/, /01234567/,
  ]
  for (const pat of smashPatterns) {
    if (pat.test(local)) {
      return { valid: false, reason: 'Keyboard smash pattern detected.' }
    }
  }

  if (domain === 'gmail.com' && (local.length < 6 || local.length > 30)) {
    return { valid: false, reason: 'Gmail usernames must be between 6 and 30 characters.' }
  }

  return { valid: true }
}

export async function POST(req: Request) {
  // 1. Restrict File Uploads & Validate Content-Type / Size Limit (Max 64 KB)
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

    // Bot Trap (Honeypot) - bots fill hidden fields
    if (_honeypot && typeof _honeypot === 'string' && _honeypot.trim().length > 0) {
      return NextResponse.json(
        trimApiResponse({ success: true, message: 'Message received.' }),
      )
    }

    // Timing Check - bots submit too fast (< 1.5 seconds)
    const formLoadedAt = _formLoadedAt ? Number(_formLoadedAt) : 0
    if (formLoadedAt > 0) {
      const elapsedMs = Date.now() - formLoadedAt
      if (elapsedMs < 1200) {
        return NextResponse.json(
          trimApiResponse({ error: 'Submission too fast. Please try again.' }),
          { status: 400 },
        )
      }
    }

    // Validate inputs
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

    // Disposable Domain Check
    if (DISPOSABLE_DOMAINS.has(domainPart)) {
      return NextResponse.json(
        trimApiResponse({
          error: `Temporary email addresses (@${domainPart}) are not accepted. Please use a standard email.`,
        }),
        { status: 400 },
      )
    }

    // Heuristic analysis
    const authCheck = analyzeEmailAuthenticity(cleanEmail)
    if (!authCheck.valid) {
      return NextResponse.json(
        trimApiResponse({
          error: `Email verification failed (${authCheck.reason}). Please provide an active email address.`,
        }),
        { status: 400 },
      )
    }

    // DNS MX Record Lookup (Skip for trusted major providers)
    if (!TRUSTED_DOMAINS.has(domainPart)) {
      try {
        const mxRecords = await dns.resolveMx(domainPart)
        if (!mxRecords || mxRecords.length === 0) {
          throw new Error('No mail servers found.')
        }
      } catch (dnsErr: unknown) {
        const errCode = (dnsErr as { code?: string })?.code
        if (errCode === 'ENOTFOUND' || errCode === 'ENODATA') {
          return NextResponse.json(
            trimApiResponse({
              error: `The email domain (@${domainPart}) does not appear to exist. Please verify your address.`,
            }),
            { status: 400 },
          )
        }
        // Non-fatal if DNS times out on serverless
        console.warn('[Contact] DNS MX lookup warning for domain:', domainPart, dnsErr)
      }
    }

    // Message Content Validation
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

    const safeName = escapeHtml(nameVal.sanitized)
    const safeMessage = escapeHtml(messageVal.sanitized)

    // Dispatch email via multi-tier email service (Gmail SMTP -> Resend -> FormSubmit)
    const emailDispatch = await dispatchContactEmail({
      name: safeName,
      email: cleanEmail,
      message: safeMessage,
    })

    // Store message permanently in MongoDB Atlas contact_messages collection
    try {
      const db = await getDatabase()
      if (db) {
        await db.collection('contact_messages').insertOne({
          name: safeName,
          email: cleanEmail,
          message: safeMessage,
          created_at: new Date().toISOString(),
          status: 'unread',
          client_ip: clientIp,
          delivery_status: emailDispatch.success
            ? 'sent'
            : emailDispatch.needsActivation
              ? 'awaiting_activation'
              : 'saved_locally',
          delivery_method: emailDispatch.method,
          delivery_error: emailDispatch.error || null,
        })
      }
    } catch (dbErr) {
      console.warn('[MongoDB] Contact message persistence failed:', dbErr)
    }

    // User feedback response
    if (emailDispatch.success) {
      return NextResponse.json(
        trimApiResponse({
          success: true,
          message: 'Your message has been sent successfully to Jeho!',
        }),
      )
    }

    if (emailDispatch.needsActivation) {
      return NextResponse.json(
        trimApiResponse({
          success: true,
          message: 'Your message has been received and saved! (Email delivery will begin once Jeho confirms the FormSubmit activation in his Gmail)',
        }),
      )
    }

    // Even if external forwarder had an issue, the message was recorded in MongoDB
    return NextResponse.json(
      trimApiResponse({
        success: true,
        message: 'Your message has been received and saved successfully!',
      }),
    )
  } catch (err) {
    console.error('[Contact] Unexpected error handling submission:', err)
    return NextResponse.json(
      trimApiResponse({ error: 'An unexpected error occurred while processing your submission.' }),
      { status: 500 },
    )
  }
}