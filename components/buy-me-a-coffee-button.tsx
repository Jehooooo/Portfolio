'use client'

import { Coffee } from 'lucide-react'
import { supportConfig } from '@/lib/portfolio-data'
import { cn } from '@/lib/utils'

interface BuyMeACoffeeButtonProps {
  variant?: 'hero' | 'footer' | 'pill' | 'card'
  className?: string
  text?: string
}

export function BuyMeACoffeeButton({
  variant = 'hero',
  className,
  text = supportConfig.buttonText,
}: BuyMeACoffeeButtonProps) {
  const handleClick = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-coffee-modal'))
    }
  }

  if (variant === 'footer') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label="Open Buy Me a Coffee support modal"
        className={cn(
          'inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/5 px-3.5 py-2 text-xs font-medium text-foreground/90 backdrop-blur-xs transition-all duration-300 hover:border-purple-500/60 hover:bg-purple-500/15 hover:text-purple-600 dark:hover:text-purple-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:-translate-y-0.5 cursor-pointer',
          className
        )}
      >
        <Coffee size={14} className="text-purple-500" />
        <span>{text}</span>
      </button>
    )
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label="Open Buy Me a Coffee support modal"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground transition-all duration-300 hover:border-purple-500/60 hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.25)] hover:-translate-y-0.5 cursor-pointer',
          className
        )}
      >
        <Coffee size={13} className="text-purple-500" />
        <span>{text}</span>
      </button>
    )
  }

  if (variant === 'card') {
    return (
      <div
        className={cn(
          'relative rounded-2xl border border-purple-500/25 bg-card/60 p-5 backdrop-blur-md transition-all duration-300 hover:border-purple-500/40 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <Coffee size={20} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <span>Support My Work</span>
              <span className="text-[10px] font-mono rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 border border-purple-500/20">
                GCash
              </span>
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Found my projects helpful? Voluntary coffees are always warmly appreciated!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClick}
          className="btn-bw-secondary group inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap shrink-0 border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/15 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all cursor-pointer"
        >
          <Coffee size={14} className="text-purple-500 transition-transform duration-300 group-hover:-translate-y-0.5" />
          <span>{text}</span>
        </button>
      </div>
    )
  }

  // Default: 'hero' variant
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Open Buy Me a Coffee support modal"
      className={cn(
        'btn-bw-secondary group inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-2.5 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 text-[11px] sm:text-xs md:text-sm font-medium text-foreground whitespace-nowrap shrink-0 transition-all duration-300 border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] cursor-pointer',
        className
      )}
    >
      <Coffee
        size={14}
        className="shrink-0 text-purple-500 transition-transform duration-300 group-hover:-translate-y-0.5 sm:w-4 sm:h-4"
      />
      <span>{text}</span>
    </button>
  )
}
