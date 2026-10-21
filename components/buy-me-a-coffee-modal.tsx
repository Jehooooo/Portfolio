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
  Sparkles,
} from 'lucide-react'
import { supportConfig } from '@/lib/portfolio-data'

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
      <div className="relative z-10 my-auto flex flex-col w-full max-w-sm sm:max-w-md rounded-3xl bg-background/95 border border-purple-500/25 dark:border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.18)] dark:shadow-[0_0_60px_rgba(147,51,234,0.25)] overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/90 px-4 py-3.5 sm:px-5 sm:py-4 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <Coffee size={17} />
            </div>
            <div>
              <h2
                id="coffee-modal-title"
                className="text-sm sm:text-base font-bold tracking-tight text-foreground flex items-center gap-2"
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
            className="rounded-full p-1.5 sm:p-2 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <X size={17} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-4">
          {/* Supportive Intro Note */}
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed text-center">
            {supportConfig.message}
          </p>

          {/* GCash QR Code Card */}
          <div className="flex flex-col items-center">
            <div className="group relative rounded-2xl p-2 bg-white border border-border/80 shadow-lg shadow-purple-500/5 transition-all duration-300 hover:shadow-purple-500/20 hover:border-purple-500/40">
              <div
                onClick={() => setIsZoomed(true)}
                className="relative aspect-[519/1024] h-[260px] sm:h-[300px] w-auto cursor-zoom-in overflow-hidden rounded-xl bg-white"
                title="Click to enlarge QR code for easy scanning"
              >
                <Image
                  src={supportConfig.qrCodeUrl}
                  alt="Official GCash QR Code for Jehosue Biscarra"
                  fill
                  sizes="200px"
                  priority
                  className="object-contain"
                />

                {/* Hover Overlay Hint */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white font-medium text-xs backdrop-blur-xs">
                  <Maximize2 size={18} />
                  <span>Click to Enlarge</span>
                </div>
              </div>
            </div>

            {/* Action Buttons for QR */}
            <div className="mt-2.5 flex items-center justify-center gap-2 w-full max-w-[220px]">
              <button
                type="button"
                onClick={() => setIsZoomed(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground transition-all duration-200 hover:bg-card hover:border-purple-500/40 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer"
              >
                <Maximize2 size={12} />
                <span>Enlarge</span>
              </button>

              <a
                href={supportConfig.qrCodeUrl}
                download="jehosue-gcash-qr.png"
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground transition-all duration-200 hover:bg-card hover:border-purple-500/40 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer"
                title="Download QR image to scan from your gallery"
              >
                <Download size={12} />
                <span>Save QR</span>
              </a>
            </div>
          </div>

          {/* GCash Number Box */}
          <div className="rounded-2xl border border-border/80 bg-card/60 p-3 sm:p-3.5 backdrop-blur-sm space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-mono uppercase tracking-wider text-[10px] sm:text-[11px]">
                Direct GCash Number
              </span>
              <span className="font-semibold text-foreground/90 text-xs">
                {supportConfig.recipientName}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 bg-background/80 rounded-xl px-3 py-2 border border-border/60">
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
