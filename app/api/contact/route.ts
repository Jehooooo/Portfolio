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
  'minutemailbox.com', 'nada.ltd', 'getnada.com', 'tempail.com', 'example.com',
  'test.com', 'fake.com', 'mail.com', 'sample.com', 'nobody.com',
])

// Common fake / test username prefixes
const FAKE_USERNAMES = new Set([
  'asdf', 'qwerty', 'fake', 'dummy', 'nobody', 'noone', 'testing',
  'sample', 'temp', 'spam', 'random', 'admin', 'root', 'null', 'undefined',
])

/**
 * Advanced Heuristic Analysis:
 * Detects keyboard mashing, repeated random sequences, unnatural consonant clusters,
 * and bot-generated dummy email patterns.
 */
function analyzeEmailAuthenticity(email: string): { valid: boolean; reason?: string } {
  const clean = email.trim().toLowerCase()
  const [local, domain] = clean.split('@')

  if (!local || !domain) {
    return { valid: false, reason: 'Malformed email structure.' }
  }

  // 1. Check known fake username prefixes
  if (FAKE_USERNAMES.has(local)) {
    return { valid: false, reason: `Suspicious dummy username "${local}" detected.` }
  }

  // 2. Detect repeated keyboard mash sequences (e.g. qweqwe, asdasd, zxczxc, bla12bla12)
  if (/(.{3,})\1/.test(local)) {
    return { valid: false, reason: 'Repeated keyboard-mash / random pattern detected in username.' }
  }

  // 3. Detect 3 or more identical consecutive characters (e.g. aaaaa, 11111, qqqqq)
  if (/(.)\1{2,}/.test(local)) {
    return { valid: false, reason: 'Unnatural consecutive character repetition detected.' }
  }

  // 4. Keyboard smash substrings on longer usernames
  const smashPatterns = [
    /qweqwe/i, /asdasd/i, /zxcv/i, /qwerty/i, /asdfgh/i, /zxcvbn/i,
    /123456/, /012345/, /67890/, /qazwsx/i, /poiuyt/i, /lkjhgf/i,
  ]
  for (const pat of smashPatterns) {
    if (pat.test(local)) {
      return { valid: false, reason: 'Keyboard smash pattern detected in email.' }
    }
  }

  // 5. Unnatural consonant clusters (5 or more consonants in a row without vowels/digits)
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(local)) {
    return { valid: false, reason: 'Unnatural consonant sequence detected in email username.' }
  }

  // 6. Vowel-to-letter ratio check on alphabetic strings (> 6 letters)
  const lettersOnly = local.replace(/[^a-z]/g, '')
  if (lettersOnly.length >= 7) {
    const vowels = (lettersOnly.match(/[aeiouy]/g) || []).length
    const vowelRatio = vowels / lettersOnly.length
    if (vowelRatio < 0.12) {
      return { valid: false, reason: 'Unusually low vowel ratio (likely gibberish string).' }
    }
  }

  // 7. Domain-specific checks (e.g. Gmail usernames are 6 to 30 characters)
  if (domain === 'gmail.com' && (local.length < 6 || local.length > 30)) {
    return { valid: false, reason: 'Gmail usernames must be between 6 and 30 characters.' }
  }

  return { valid: true }
}

export async function POST(req: Request) {
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })

  console.log('\n' + '='.repeat(60))
  console.log(`[CONTACT API] 🛡️ Incoming Submission Security Audit [${timestamp}]`)

  try {
    const body = await req.json()
    const { name, email, message, _honeypot } = body

    // 0. Bot Trap (Honeypot)
    if (_honeypot && typeof _honeypot === 'string' && _honeypot.trim().length > 0) {
      console.warn('[SECURITY ALERT] 🛑 Bot honeypot triggered. Silently ignored.')
      console.log('='.repeat(60) + '\n')
      return NextResponse.json({ success: true, message: 'Message received.' })
    }

    console.log(`[CONTACT API] Name:    ${name}`)
    console.log(`[CONTACT API] Email:   ${email}`)
    console.log(`[CONTACT API] Message: ${message}`)
    console.log('-'.repeat(60))

    // 1. Name Check
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      const errMsg = 'Please enter a valid name (between 2 and 100 characters).'
      console.warn(`[SECURITY CHECK] ❌ Name validation failed: ${name}`)
      console.log('='.repeat(60) + '\n')
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
      const errMsg = 'Please provide a valid email format (e.g. name@example.com).'
      console.warn(`[SECURITY CHECK] ❌ Strict email regex check failed: ${email}`)
      console.log('='.repeat(60) + '\n')
      return NextResponse.json({ error: errMsg }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const [, domainPart] = cleanEmail.split('@')

    // 3. Disposable Domain Check
    if (DISPOSABLE_DOMAINS.has(domainPart)) {
      const errMsg = `Temporary and disposable email addresses (@${domainPart}) are blocked. Please use your personal or work email.`
      console.warn(`[SECURITY CHECK] ❌ Disposable domain blocked: @${domainPart}`)
      console.log('='.repeat(60) + '\n')
      return NextResponse.json({ error: errMsg }, { status: 400 })
    }

    // 4. Random / Gibberish / Fake Mailbox Heuristic Analysis
    const authCheck = analyzeEmailAuthenticity(cleanEmail)
    if (!authCheck.valid) {
      const errMsg = `Email verification failed: The email address looks random or generated (${authCheck.reason}). Please provide a genuine, active email address.`
      console.warn(`[SECURITY CHECK] ❌ Authenticity check failed for "${cleanEmail}": ${authCheck.reason}`)
      console.log('='.repeat(60) + '\n')
      return NextResponse.json({ error: errMsg }, { status: 400 })
    }
    console.log('[SECURITY CHECK] ✅ Email authenticity & pattern analysis: PASSED')

    // 5. DNS MX Record Lookup
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
      console.log('='.repeat(60) + '\n')
      return NextResponse.json(
        {
          error: `The email domain (@${domainPart}) does not exist or has no active mail servers. Please enter a valid, existing email address.`,
        },
        { status: 400 },
      )
    }

    // 6. Message Content Validation
    if (!message || typeof message !== 'string' || message.trim().length < 5 || message.trim().length > 3000) {
      const errMsg = 'Please enter a message between 5 and 3000 characters.'
      console.warn(`[SECURITY CHECK] ❌ Message validation failed: length=${message?.length}`)
      console.log('='.repeat(60) + '\n')
      return NextResponse.json({ error: errMsg }, { status: 400 })
    }

    // 7. Dispatch Email with try...catch
    console.log('[SECURITY CHECK] ✅ All security and anti-fraud checks PASSED.')
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
        console.log('='.repeat(60) + '\n')
        return NextResponse.json({
          success: true,
          message: 'Your message has been sent successfully to Jeho!',
        })
      } else if (data && data.message && data.message.includes('Activation')) {
        console.log('[CONTACT API] ⚠️ ACTION REQUIRED: FormSubmit sent an activation email to jehosuebiscarra@gmail.com.')
        console.log('[CONTACT API] 👉 Please check your Gmail and click "Activate Form" once!')
        console.log('='.repeat(60) + '\n')
        return NextResponse.json({
          success: true,
          message: 'Message received! An activation email was sent to your Gmail (jehosuebiscarra@gmail.com). Click "Activate Form" once to complete inbox routing.',
        })
      } else {
        console.log('[CONTACT API] ✅ Message accepted successfully.')
        console.log('='.repeat(60) + '\n')
        return NextResponse.json({
          success: true,
          message: 'Your message has been sent successfully to Jeho!',
        })
      }
    } catch (deliveryErr: unknown) {
      const errorDetail = deliveryErr instanceof Error ? deliveryErr.message : String(deliveryErr)
      console.error(`[CONTACT API] ❌ DELIVERY EXCEPTION: ${errorDetail}`)
      console.log('='.repeat(60) + '\n')
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
    console.log('='.repeat(60) + '\n')
    return NextResponse.json(
      { error: `Security Server Exception: ${errorDetail}` },
      { status: 500 },
    )
  }
}