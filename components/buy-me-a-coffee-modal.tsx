'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  X,
  Coffee,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  QrCode,
  Smartphone,
} from 'lucide-react'
import { supportConfig, type SuggestedAmount } from '@/lib/portfolio-data'

interface BuyMeACoffeeModalProps {
  isOpen?: boolean
  onClose?: () => void
}

export function BuyMeACoffeeModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
}: BuyMeACoffeeModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const [selectedTier, setSelectedTier] = useState<SuggestedAmount | null>(
    supportConfig.suggestedAmounts[1] || null // Default to ₱50 regular coffee
  )

  const isControlled = typeof controlledIsOpen === 'boolean'
  const open = isControlled ? controlledIsOpen : internalIsOpen

  const handleClose = useCallback(() => {
    if (isControlled && controlledOnClose) {
      controlledOnClose()
    } else {
      setInternalIsOpen(false)
    }
    setIsZoomed(false)
  }, [isControlled, controlledOnClose])

  // Listen to global open-coffee-modal event
  useEffect(() => {
    const handleOpenEvent = () => {
      setInternalIsOpen(true)
    }

    window.addEventListener('open-coffee-modal', handleOpenEvent)
    return () => {
      window.removeEventListener('open-coffee-modal', handleOpenEvent)
    }
  }, [])

  // Keyboard navigation & body scroll locking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZoomed) {
          setIsZoomed(false)
        } else {
          handleClose()
        }
      }
    }

    if (open) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, isZoomed, handleClose])

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(supportConfig.gcashNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback copy
      const input = document.createElement('input')
      input.value = supportConfig.gcashNumber
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="coffee-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
      />

      {/* Main Modal Dialog */}
      <div className="relative z-10 my-auto flex flex-col w-full max-w-2xl max-h-[92vh] rounded-3xl bg-background/95 border border-purple-500/25 dark:border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.18)] dark:shadow-[0_0_60px_rgba(147,51,234,0.25)] overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/90 px-5 py-4 sm:px-6 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <Coffee size={18} />
            </div>
            <div>
              <h2
                id="coffee-modal-title"
                className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2"
              >
                <span>{supportConfig.heading}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <Sparkles size={10} />
                  GCash
                </span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6 space-y-6">
          {/* Supportive Intro Note */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {supportConfig.message}
          </p>

          {/* Grid Layout: QR Code on Left/Top + Details on Right */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left: GCash QR Code Card */}
            <div className="md:col-span-5 flex flex-col items-center">
              <div className="group relative w-full max-w-[240px] sm:max-w-[260px] rounded-2xl p-2.5 bg-white border border-border/80 shadow-lg shadow-purple-500/5 transition-all duration-300 hover:shadow-purple-500/20 hover:border-purple-500/40">
                <div
                  onClick={() => setIsZoomed(true)}
                  className="relative aspect-[519/1024] w-full cursor-zoom-in overflow-hidden rounded-xl bg-white"
                  title="Click to enlarge QR code for easy scanning"
                >
                  <Image
                    src={supportConfig.qrCodeUrl}
                    alt="Official GCash QR Code for Jehosue Biscarra"
                    fill
                    sizes="(max-width: 640px) 240px, 260px"
                    priority
                    className="object-contain"
                  />

                  {/* Hover Overlay Hint */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white font-medium text-xs backdrop-blur-xs">
                    <Maximize2 size={20} />
                    <span>Click to Enlarge</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for QR */}
              <div className="mt-3 flex items-center justify-center gap-2 w-full max-w-[260px]">
                <button
                  type="button"
                  onClick={() => setIsZoomed(true)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card/60 px-3 py-2 text-xs font-medium text-foreground transition-all duration-200 hover:bg-card hover:border-purple-500/40 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer"
                >
                  <Maximize2 size={13} />
                  <span>Enlarge</span>
                </button>

                <a
                  href={supportConfig.qrCodeUrl}
                  download="jehosue-gcash-qr.png"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card/60 px-3 py-2 text-xs font-medium text-foreground transition-all duration-200 hover:bg-card hover:border-purple-500/40 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer"
                  title="Download QR image to scan from your gallery"
                >
                  <Download size={13} />
                  <span>Save QR</span>
                </a>
              </div>
            </div>

            {/* Right: Payment Details, Amount Suggestions & Instructions */}
            <div className="md:col-span-7 flex flex-col gap-4">
              {/* GCash Number Box */}
              <div className="rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur-sm space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono uppercase tracking-wider">Direct GCash Number</span>
                  <span className="font-semibold text-foreground/80">{supportConfig.recipientName}</span>
                </div>

                <div className="flex items-center justify-between gap-3 bg-background/80 rounded-xl px-3.5 py-2.5 border border-border/60">
                  <div className="font-mono text-sm sm:text-base font-bold tracking-wider text-foreground">
                    {supportConfig.gcashNumber}
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyNumber}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 cursor-pointer"
                    title="Copy GCash number to clipboard"
                  >
                    {copied ? (
                      <>
                        <Check size={13} className="text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Optional Suggested Amounts */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                    <span>Suggested Coffee Tiers</span>
                    <span className="text-[10px] font-normal text-muted-foreground">(Optional)</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {supportConfig.suggestedAmounts.map((tier) => {
                    const isSelected = selectedTier?.label === tier.label
                    return (
                      <button
                        key={tier.label}
                        type="button"
                        onClick={() => setSelectedTier(tier)}
                        className={`group flex flex-col items-center justify-center rounded-xl p-2.5 border text-center transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-purple-500/15 border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.25)] text-foreground'
                            : 'bg-card/40 border-border hover:bg-card/70 hover:border-border/80 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span className="text-sm font-bold font-mono text-foreground">
                          {tier.label}
                        </span>
                        <span className="text-[10px] leading-tight text-muted-foreground mt-0.5 truncate max-w-full">
                          {tier.description}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {selectedTier && (
                  <p className="text-[11px] text-purple-600 dark:text-purple-400 bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20">
                    💡 Selected: <strong>{selectedTier.label}</strong> ({selectedTier.description}).
                    {selectedTier.amount
                      ? ` Enter ₱${selectedTier.amount} in your GCash app.`
                      : ' Enter any amount in your GCash app.'}
                  </p>
                )}
              </div>

              {/* Payment Instructions */}
              <div className="rounded-2xl border border-border/80 bg-card/40 p-3.5 space-y-2">
                <span className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                  <Smartphone size={13} className="text-purple-500" />
                  <span>How to Send Support via GCash</span>
                </span>

                <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground leading-relaxed">
                  {supportConfig.instructions.map((step, idx) => (
                    <li key={idx}>
                      <span className="text-foreground/90">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          {/* Disclaimer & Transparency Footer */}
          <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/40 p-3 text-[11px] text-muted-foreground">
            <ShieldCheck size={16} className="shrink-0 text-emerald-500 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-medium text-foreground/80">{supportConfig.disclaimer}</p>
              <p>
                Financial contributions are entirely voluntary gifts of appreciation. Payments are processed securely
                inside your official GCash mobile app.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox / Zoom Overlay */}
      {isZoomed && (
        <div
          role="dialog"
          aria-label="Enlarged QR Code"
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md transition-opacity duration-200 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col items-center max-w-sm w-full bg-white rounded-3xl p-4 shadow-2xl border border-white/20 animate-in zoom-in-95"
          >
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              aria-label="Close enlarged view"
              className="absolute -top-3 -right-3 rounded-full bg-black/80 p-2 text-white hover:bg-black transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="relative aspect-[519/1024] w-full overflow-hidden rounded-2xl">
              <Image
                src={supportConfig.qrCodeUrl}
                alt="Enlarged GCash QR Code"
                fill
                priority
                className="object-contain"
              />
            </div>

            <p className="mt-3 text-xs font-semibold text-neutral-800 text-center">
              Scan with your GCash app or camera
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
