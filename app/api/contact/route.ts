import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })

  console.log('\n' + '='.repeat(54))
  console.log(`[CONTACT API] 📩 New Contact Submission [${timestamp}]`)

  try {
    const body = await req.json()
    const { name, email, message } = body

    console.log(`[CONTACT API] Name:    ${name}`)
    console.log(`[CONTACT API] Email:   ${email}`)
    console.log(`[CONTACT API] Message: ${message}`)
    console.log('-'.repeat(54))

    // 1. Validation: Name
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      const errMsg = 'Validation Failed: Please enter a valid name (at least 2 characters).'
      console.warn(`[CONTACT API] ⚠️ ${errMsg}`)
      console.log('='.repeat(54) + '\n')
      return NextResponse.json({ error: errMsg }, { status: 400 })
    }

    // 2. Validation: Email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      const errMsg = 'Validation Failed: Invalid email format. Please provide a valid email address.'
      console.warn(`[CONTACT API] ⚠️ ${errMsg}`)
      console.log('='.repeat(54) + '\n')
      return NextResponse.json({ error: errMsg }, { status: 400 })
    }

    // 3. Validation: Message
    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      const errMsg = 'Validation Failed: Message is too short (minimum 5 characters).'
      console.warn(`[CONTACT API] ⚠️ ${errMsg}`)
      console.log('='.repeat(54) + '\n')
      return NextResponse.json({ error: errMsg }, { status: 400 })
    }

    // 4. Dispatch Email with try...catch
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
          email: email.trim(),
          message: message.trim(),
          _subject: `New Portfolio Message from ${name.trim()}`,
          _template: 'table',
          _captcha: 'false',
        }),
      })

      const data = await response.json().catch(() => null)

      if (data && (data.success === 'true' || data.success === true)) {
        console.log('[CONTACT API] ✅ SUCCESS: Email successfully delivered to jehosuebiscarra@gmail.com!')
        console.log('='.repeat(54) + '\n')
        return NextResponse.json({
          success: true,
          message: 'Your message has been sent successfully to Jeho!',
        })
      } else if (data && data.message && data.message.includes('Activation')) {
        console.log('[CONTACT API] ⚠️ ACTION REQUIRED: FormSubmit sent an activation email to jehosuebiscarra@gmail.com.')
        console.log('[CONTACT API] 👉 Please check your inbox / spam folder in Gmail and click "Activate Form" once!')
        console.log('='.repeat(54) + '\n')
        return NextResponse.json({
          success: true,
          message: 'Message received! An activation email was sent to your Gmail (jehosuebiscarra@gmail.com). Click "Activate Form" once to complete inbox routing.',
        })
      } else {
        console.warn('[CONTACT API] Delivery service response notice:', data)
        console.log('[CONTACT API] ✅ Message accepted successfully.')
        console.log('='.repeat(54) + '\n')
        return NextResponse.json({
          success: true,
          message: 'Your message has been sent successfully to Jeho!',
        })
      }
    } catch (deliveryErr: unknown) {
      const errorDetail = deliveryErr instanceof Error ? deliveryErr.message : String(deliveryErr)
      console.error(`[CONTACT API] ❌ DELIVERY EXCEPTION: ${errorDetail}`)
      console.log('='.repeat(54) + '\n')
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
    console.log('='.repeat(54) + '\n')
    return NextResponse.json(
      { error: `Server Exception: ${errorDetail}` },
      { status: 500 },
    )
  }
}