'use client'

import { useState, useEffect, useRef } from 'react'
import { FileText, Mail, Phone, Send, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react'
import { Reveal } from '@/components/reveal'
import { profile } from '@/lib/portfolio-data'

const INITIAL_CHALLENGE = { question: '3 + 4', answer: 7 }

/** Generates a simple integer math challenge */
function generateChallenge(): { question: string; answer: number } {
  const ops = ['+', '-', '*'] as const
  const op = ops[Math.floor(Math.random() * ops.length)]
  let a: number, b: number, answer: number

  if (op === '+') {
    a = Math.floor(Math.random() * 12) + 1
    b = Math.floor(Math.random() * 12) + 1
    answer = a + b
  } else if (op === '-') {
    a = Math.floor(Math.random() * 12) + 4
    b = Math.floor(Math.random() * (a - 1)) + 1
    answer = a - b
  } else {
    a = Math.floor(Math.random() * 9) + 2
    b = Math.floor(Math.random() * 5) + 2
    answer = a * b
  }

  return { question: `${a} ${op} ${b}`, answer }
}

export function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [emailError, setEmailError] = useState('')

  // Bot protection: timing token (set when form mounts on client)
  const formOpenedAt = useRef<number>(0)

  // Bot protection: math CAPTCHA (initialized with deterministic constant to prevent SSR hydration mismatch)
  const [challenge, setChallenge] = useState<{ question: string; answer: number }>(INITIAL_CHALLENGE)
  const [captchaInput, setCaptchaInput] = useState('')
  const [captchaError, setCaptchaError] = useState('')

  // Bot protection: honeypot (visually hidden, real users never fill this)
  const [honeypot, setHoneypot] = useState('')

  // Client-side initialization after mount to generate random challenge safely
  useEffect(() => {
    setChallenge(generateChallenge())
    formOpenedAt.current = Date.now()
  }, [])

  // Refresh CAPTCHA challenge on every failed submit
  const refreshChallenge = () => {
    setChallenge(generateChallenge())
    setCaptchaInput('')
    setCaptchaError('')
  }

  const validateEmail = (val: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!val.trim()) return 'Email address is required.'
    if (!emailRegex.test(val.trim())) return 'Please enter a valid email address (e.g. name@example.com).'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMessage(null)

    // 1. Honeypot check (filled only by bots)
    if (honeypot.trim().length > 0) {
      // Silently succeed for bots so they don't retry
      setStatusMessage({ type: 'success', text: 'Your message has been sent to Jeho!' })
      return
    }

    // 2. Timing check (bots submit in < 1.5 seconds)
    const elapsedMs = formOpenedAt.current > 0 ? Date.now() - formOpenedAt.current : 2000
    if (elapsedMs < 1500) {
      setStatusMessage({ type: 'error', text: 'Submission too fast. Please try again.' })
      return
    }

    // 3. Math CAPTCHA check
    const userAnswer = parseInt(captchaInput.trim(), 10)
    if (isNaN(userAnswer) || userAnswer !== challenge.answer) {
      setCaptchaError(`Incorrect answer. Please solve: ${challenge.question} = ?`)
      refreshChallenge()
      return
    }

    // 4. Form field validation
    if (!name.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter your name.' })
      return
    }

    const err = validateEmail(email)
    if (err) {
      setEmailError(err)
      setStatusMessage({ type: 'error', text: err })
      return
    }
    setEmailError('')

    if (!message.trim() || message.trim().length < 5) {
      setStatusMessage({ type: 'error', text: 'Please enter a message with at least 5 characters.' })
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          message,
          _honeypot: honeypot,
          _formLoadedAt: formOpenedAt.current,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        refreshChallenge()
        throw new Error(data.error || 'Failed to send message.')
      }

      setStatusMessage({
        type: 'success',
        text: data.message || 'Your message has been sent successfully to Jeho!',
      })
      setName('')
      setEmail('')
      setMessage('')
      setCaptchaInput('')
      refreshChallenge()
      formOpenedAt.current = Date.now()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while sending your message. Please try again.'
      setStatusMessage({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      id="contact"
      className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 md:py-24"
    >
      <Reveal>
        <div className="glass-strong relative overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-12 md:py-16">
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-foreground">
            Contact Me
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-sm sm:text-base leading-relaxed text-muted-foreground">
            I&apos;m open to internships, opportunities, collaborations, and projects where I
            can continue growing as a developer and contribute to meaningful work.
          </p>

          {/* Quick contact details badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
            <a
              href={`mailto:${profile.email}`}
              className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3.5 py-1.5 transition-colors hover:text-foreground hover:border-foreground/30"
            >
              <Mail size={16} className="text-foreground/70" />
              <span>{profile.email}</span>
            </a>
            {profile.phone && (
              <a
                href={`tel:${profile.phone}`}
                className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3.5 py-1.5 transition-colors hover:text-foreground hover:border-foreground/30"
              >
                <Phone size={16} className="text-foreground/70" />
                <span>{profile.phone}</span>
              </a>
            )}
          </div>

          {/* Contact Form */}
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 max-w-xl text-left space-y-4"
          >
            {/* Bot Honeypot - visually hidden, only bots fill this */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
              <label htmlFor="contact-website">Website</label>
              <input
                id="contact-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {/* Status Alert Banner */}
            {statusMessage && (
              <div
                className={`flex items-start gap-3 rounded-2xl p-4 text-xs sm:text-sm leading-relaxed border transition-all animate-in fade-in zoom-in-95 duration-200 ${
                  statusMessage.type === 'success'
                    ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 size={18} className="shrink-0 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <AlertCircle size={18} className="shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Name Input */}
            <div>
              <label htmlFor="contact-name" className="block text-xs font-semibold text-foreground/90 uppercase tracking-wider mb-1.5">
                Name
              </label>
              <input
                id="contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                disabled={loading}
                required
                className="w-full rounded-xl border border-border bg-card/70 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-foreground focus:ring-1 focus:ring-foreground"
              />
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="contact-email" className="block text-xs font-semibold text-foreground/90 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError('')
                }}
                onBlur={() => {
                  if (email) setEmailError(validateEmail(email))
                }}
                placeholder="your.email@example.com"
                disabled={loading}
                required
                className={`w-full rounded-xl border bg-card/70 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:ring-1 ${
                  emailError
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-border focus:border-foreground focus:ring-foreground'
                }`}
              />
              {emailError && (
                <p className="mt-1 text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  <span>{emailError}</span>
                </p>
              )}
            </div>

            {/* Message Textarea */}
            <div>
              <label htmlFor="contact-message" className="block text-xs font-semibold text-foreground/90 uppercase tracking-wider mb-1.5">
                Message
              </label>
              <textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message, project idea, or inquiry here..."
                rows={4}
                disabled={loading}
                required
                className="w-full resize-y rounded-xl border border-border bg-card/70 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-foreground focus:ring-1 focus:ring-foreground"
              />
            </div>

            {/* Math CAPTCHA */}
            <div className="rounded-xl border border-border bg-card/50 p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={14} className="text-foreground/60" />
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Bot Protection</span>
              </div>
              <label htmlFor="contact-captcha" className="block text-sm text-muted-foreground">
                Solve to verify you&apos;re human:&nbsp;
                <span className="font-bold text-foreground font-mono">{challenge.question} = ?</span>
              </label>
              <input
                id="contact-captcha"
                type="number"
                value={captchaInput}
                onChange={(e) => {
                  setCaptchaInput(e.target.value)
                  if (captchaError) setCaptchaError('')
                }}
                placeholder="Your answer"
                disabled={loading}
                className={`w-32 rounded-lg border bg-card/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:ring-1 ${
                  captchaError
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-border focus:border-foreground focus:ring-foreground'
                }`}
              />
              {captchaError && (
                <p className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  <span>{captchaError}</span>
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="submit"
                disabled={loading}
                className="btn-bw-primary inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Send Message</span>
                  </>
                )}
              </button>

              {profile.resumeUrl && (
                <a
                  href={profile.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/60 px-5 py-3 text-sm font-medium text-foreground transition-all duration-200 hover:border-foreground/30 hover:bg-card"
                >
                  <FileText size={16} />
                  <span>View Resume</span>
                </a>
              )}
            </div>
          </form>
        </div>
      </Reveal>
    </section>
  )
}