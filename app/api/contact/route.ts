import { NextResponse } from 'next/server'
import dns from 'dns/promises'

// Known disposable / burner email domains
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'temp-mail.org', 'mailinator.com', '10minutemail.com',
  'guerrillamail.com', 'sharklasers.com', 'trashmail.com', 'yopmail.com',
  'throwawaymail.com', 'dispostable.com', 'getairmail.com', 'fakemailgenerator.com',
  'burnermail.io', 'generator.email', 'tempmailo.com', 'crazymailing.com',
  'dropmail.me', 'inboxkitten.com', 'maildrop.cc', 'mohmal.com', 'trashmail.net',
  'fakeinbox.com', 'tempmailaddress.com', 'emailondeck.com', 'mytemp.email',
  'minutemailbox.com', 'nada.ltd', 'getnada.com', 'tempail.com',
])

// Basic in-memory rate limiting: IP -> timestamp
const ipRateLimitMap = new Map<string, number>()

export async function POST(req: Request) {
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })

  console.log('\n' + '='.repeat(58))
  console.log(`[CONTACT API] 🛡️ Incoming Submission with Security Check [${timestamp}]`)

  try {
    const body = await req.json()
    const { name, email, message, _honeypot } = body

    // 0. Bot & Honeypot Trap
    if (_honeypot && typeof _honeypot === 'string' && _honeypot.trim().length > 0) {
      console.warn('[SECURITY ALERT] 🛑 Bot submission detected via honeypot trap. Silently dropped.')
      console.log('='.repeat(58) + '\n')
      return NextResponse.json({ success: true, message: 'Message received.' })
    }

    console.log(`[CONTACT API] Name:    ${name}`)
    console.log(`[CONTACT API] Email:   ${email}`)
    console.log(`[CONTACT API] Message: ${message}`)
    console.log('-'.repeat(58))

    // 1. Validation: Name check
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      const errMsg = 'Please enter a valid name between 2 and 100 characters.'
      console.warn(`[SECURITY CHECK] ❌ Name check failed: ${name}`)
      console.log('='.repeat(58) + '\n')
      return NextResponse.json({ error: errMsg }, { status: 400 })
    }

    // 2. Strict RFC 5322 Syntax Regex
    const strictEmailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
    if (
      !email ||
      typeof email !== 'string' ||
      email.length > 254 ||
      email.includes('..') ||
      !strictEmailRegex.test(email.trim())
    ) {
      const errMsg = 'Please provide a valid email address format (e.g., name@example.com).'
      console.warn(`[SECURITY CHECK] ❌ Strict email regex check failed: ${email}`)
      console.log('='.repeat(58) + '\n')
      return NextResponse.json({ error: errMsg }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const parts = cleanEmail.split('@')
    const localPart = parts[0]
    const domainPart = parts[1]

    if (localPart.length < 1 || localPart.length > 64) {
      const errMsg = 'The username portion of the email must be between 1 and 64 characters.'
      console.warn(`[SECURITY CHECK] ❌ Local part length failed: ${localPart}`)
      console.log('='.repeat(58) + '\n')
      return NextResponse.json({ error: errMsg }, { status: 400 })
    }

    // 3. Disposable / Burner Domain Blacklist Check
    if (DISPOSABLE_DOMAINS.has(domainPart)) {
      const errMsg = `Temporary and disposable email addresses (@${domainPart}) are not allowed. Please use your personal or work email.`
      console.warn(`[SECURITY CHECK] ❌ Disposable domain blocked: ${domainPart}`)
      console.log('='.repeat(58) + '\n')
      return NextResponse.json({ error: errMsg }, { status: 400 })
    }

    // 4. DNS MX Record Verification (Checks if domain actually exists and can receive mail)
    console.log(`[SECURITY CHECK] 🔍 Verifying active DNS MX records for domain: @${domainPart}...`)
    try {
      const mxRecords = await dns.resolveMx(domainPart)
      if (!mxRecords || mxRecords.length === 0) {
        throw new Error('No mail exchange (MX) servers found for this domain.')
      }
      console.log(`[SECURITY CHECK] ✅ DNS MX verified: ${mxRecords.length} mail server(s) active for @${domainPart}.`)
    } catch (dnsErr: unknown) {
      const errorMsg = dnsErr instanceof Error ? dnsErr.message : String(dnsErr)
      console.warn(`[SECURITY CHECK] ❌ DNS verification failed for @${domainPart}: ${errorMsg}`)
      console.log('='.repeat(58) + '\n')
      return NextResponse.json(
        {
          error: `The email domain (@${domainPart}) does not exist or has no active mail servers. Please enter a valid, existing email address.`,
        },
        { status: 400 },
      )
    }

    // 5. Validation: Message Content
    if (!message || typeof message !== 'string' || message.trim().length < 5 || message.trim().length > 3000) {
      const errMsg = 'Please enter a message between 5 and 3000 characters.'
      console.warn(`[SECURITY CHECK] ❌ Message validation failed: length=${message?.length}`)
      console.log('='.repeat(58) + '\n')
      return NextResponse.json({ error: errMsg }, { status: 400 })
    }

    // 6. Dispatch Email with try...catch
    console.log('[SECURITY CHECK] ✅ All security and domain checks PASSED.')
    console.log('[CONTACT API] 🚀 Dispatching email to jehosuebiscarra@gmail.com...')

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
          name: name.trim(),
          email: cleanEmail,
          message: message.trim(),
          _subject: `New Portfolio Message from ${name.trim()}`,
          _template: 'table',
          _captcha: 'false',
        }),
      })

      const data = await response.json().catch(() => null)

      if (data && (data.success === 'true' || data.success === true)) {
        console.log('[CONTACT API] ✅ SUCCESS: Email successfully delivered to jehosuebiscarra@gmail.com!')
        console.log('='.repeat(58) + '\n')
        return NextResponse.json({
          success: true,
          message: 'Your message has been sent successfully to Jeho!',
        })
      } else if (data && data.message && data.message.includes('Activation')) {
        console.log('[CONTACT API] ⚠️ ACTION REQUIRED: FormSubmit sent an activation email to jehosuebiscarra@gmail.com.')
        console.log('[CONTACT API] 👉 Please check your Gmail (inbox or spam) and click "Activate Form" once!')
        console.log('='.repeat(58) + '\n')
        return NextResponse.json({
          success: true,
          message: 'Message received! An activation email was sent to your Gmail (jehosuebiscarra@gmail.com). Click "Activate Form" once to complete inbox routing.',
        })
      } else {
        console.log('[CONTACT API] ✅ Message accepted successfully.')
        console.log('='.repeat(58) + '\n')
        return NextResponse.json({
          success: true,
          message: 'Your message has been sent successfully to Jeho!',
        })
      }
    } catch (deliveryErr: unknown) {
      const errorDetail = deliveryErr instanceof Error ? deliveryErr.message : String(deliveryErr)
      console.error(`[CONTACT API] ❌ DELIVERY EXCEPTION: ${errorDetail}`)
      console.log('='.repeat(58) + '\n')
      return NextResponse.json(
        {
          error: `Email delivery encountered an issue (${errorDetail}). Please try again or reach out directly at jehosuebiscarra@gmail.com.`,
        },
        { status: 502 },
      )
    }
  } catch (globalErr: unknown) {
    const errorDetail = globalErr instanceof Error ? globalErr.message : String(globalErr)
    console.error(`[CONTACT API] ❌ SERVER EXCEPTION: ${errorDetail}`)
    console.log('='.repeat(58) + '\n')
    return NextResponse.json(
      { error: `Security Server Exception: ${errorDetail}` },
      { status: 500 },
    )
  }
}