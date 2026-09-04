import nodemailer from 'nodemailer'

export interface EmailDispatchResult {
  success: boolean
  method: 'smtp_gmail' | 'resend' | 'formsubmit' | 'none'
  needsActivation?: boolean
  error?: string
}

/**
 * Dispatches an email notification to jehosuebiscarra@gmail.com.
 * Multi-tier fallback strategy:
 * 1. Gmail SMTP (via Nodemailer) if GMAIL_APP_PASSWORD or SMTP_PASS is set
 * 2. Resend API if RESEND_API_KEY is set
 * 3. FormSubmit.co as zero-config web forwarder
 */
export async function dispatchContactEmail(data: {
  name: string
  email: string
  message: string
}): Promise<EmailDispatchResult> {
  const recipientEmail = 'jehosuebiscarra@gmail.com'
  const gmailPassword =
    process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || ''
  const gmailUser =
    process.env.GMAIL_USER || process.env.SMTP_USER || recipientEmail

  // 1. TIER 1: Nodemailer via Gmail SMTP (Direct & 100% reliable)
  if (gmailPassword.trim().length > 0) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser.trim(),
          pass: gmailPassword.trim().replace(/\s+/g, ''),
        },
      })

      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1a202c;">
          <div style="border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #1a202c; font-size: 20px; font-weight: 700;">📬 New Message from Portfolio Contact Form</h2>
            <p style="margin: 4px 0 0; color: #718096; font-size: 13px;">Received on ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })} (PHT)</p>
          </div>

          <div style="margin-bottom: 16px; padding: 12px 16px; background-color: #f7fafc; border-radius: 8px;">
            <p style="margin: 0 0 6px; font-size: 14px;"><strong>Sender Name:</strong> ${data.name}</p>
            <p style="margin: 0; font-size: 14px;"><strong>Email Address:</strong> <a href="mailto:${data.email}" style="color: #6366f1; text-decoration: none;">${data.email}</a></p>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="margin: 0 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #4a5568;">Message:</h3>
            <div style="padding: 16px; background-color: #edf2f7; border-radius: 8px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #2d3748;">${data.message}</div>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="mailto:${data.email}?subject=Re:%20Portfolio%20Inquiry" style="display: inline-block; padding: 10px 20px; background-color: #1a202c; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600;">Reply directly to ${data.name}</a>
          </div>

          <p style="margin-top: 24px; font-size: 11px; color: #a0aec0; text-align: center; border-top: 1px solid #edf2f7; padding-top: 12px;">
            Sent automatically from your portfolio website at <a href="https://www.jehobiscarra.com" style="color: #718096;">jehobiscarra.com</a>
          </p>
        </div>
      `

      await transporter.sendMail({
        from: `"${data.name} via Portfolio" <${gmailUser.trim()}>`,
        to: recipientEmail,
        replyTo: data.email,
        subject: `[Portfolio Contact] Message from ${data.name}`,
        text: `From: ${data.name} (${data.email})\n\nMessage:\n${data.message}`,
        html: htmlContent,
      })

      return { success: true, method: 'smtp_gmail' }
    } catch (smtpErr) {
      console.warn('[EmailService] SMTP delivery failed, trying next provider:', smtpErr)
    }
  }

  // 2. TIER 2: Resend API
  const resendApiKey = process.env.RESEND_API_KEY || ''
  if (resendApiKey.trim().length > 0) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Portfolio Contact <onboarding@resend.dev>',
          to: [recipientEmail],
          reply_to: data.email,
          subject: `[Portfolio Contact] Message from ${data.name}`,
          text: `From: ${data.name} (${data.email})\n\nMessage:\n${data.message}`,
        }),
      })

      if (res.ok) {
        return { success: true, method: 'resend' }
      }
    } catch (resendErr) {
      console.warn('[EmailService] Resend delivery failed, trying next provider:', resendErr)
    }
  }

  // 3. TIER 3: FormSubmit (Zero-config web forwarder)
  try {
    const targetUrl = `https://formsubmit.co/ajax/${recipientEmail}`
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: 'https://jehooooo.vercel.app',
        Referer: 'https://jehooooo.vercel.app/',
      },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        message: data.message,
        _subject: `Portfolio Message from ${data.name}`,
        _template: 'table',
        _captcha: 'false',
      }),
    })

    const result = await response.json().catch(() => null)

    if (result && (result.success === 'true' || result.success === true)) {
      return { success: true, method: 'formsubmit' }
    }

    if (result && result.message && result.message.includes('Activation')) {
      return {
        success: false,
        method: 'formsubmit',
        needsActivation: true,
        error: 'FormSubmit requires confirmation on jehosuebiscarra@gmail.com',
      }
    }

    return {
      success: false,
      method: 'formsubmit',
      error: result?.message || 'FormSubmit forwarding did not complete.',
    }
  } catch (fsErr) {
    return {
      success: false,
      method: 'none',
      error: fsErr instanceof Error ? fsErr.message : 'All email dispatch methods failed.',
    }
  }
}
