'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ShieldAlert,
  Play,
  Loader2,
  LogOut,
  ExternalLink,
  Activity,
  CheckCircle2,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

interface AdminHeaderProps {
  dbLatencyMs?: number
  onRunProcessor: () => Promise<void>
  onLogout: () => void
  isProcessing: boolean
}

export function AdminHeader({
  dbLatencyMs,
  onRunProcessor,
  onLogout,
  isProcessing,
}: AdminHeaderProps) {
  const [successToast, setSuccessToast] = useState<string | null>(null)

  const handleRun = async () => {
    try {
      await onRunProcessor()
      setSuccessToast('Pipeline executed successfully!')
      setTimeout(() => setSuccessToast(null), 3500)
    } catch {
      // handled by parent
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-xl transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card shadow-xs">
            <ShieldAlert size={18} className="text-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold tracking-tight text-foreground">
                JEHO // AI ADMIN
              </span>
              <span className="rounded-md border border-border bg-secondary/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                Live
              </span>
            </div>
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              Conversational Knowledge & Moderation Dashboard
            </p>
          </div>
        </div>

        {/* Right: Actions & Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Latency badge */}
          <div className="hidden items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground sm:flex">
            <Activity size={13} className="text-emerald-500 animate-pulse" />
            <span>Atlas:</span>
            <span className="font-semibold text-foreground">
              {dbLatencyMs !== undefined ? `${dbLatencyMs}ms` : 'online'}
            </span>
          </div>

          {/* Run Processor Now */}
          <button
            type="button"
            onClick={handleRun}
            disabled={isProcessing}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 font-mono text-xs font-medium text-foreground transition-all hover:border-foreground/30 hover:bg-secondary/60 disabled:opacity-50"
            title="Run knowledge extractor on unprocessed chats immediately"
          >
            {isProcessing ? (
              <Loader2 size={14} className="animate-spin text-foreground" />
            ) : (
              <Play size={14} className="fill-foreground text-foreground" />
            )}
            <span className="hidden sm:inline">Run Processor</span>
            <span className="sm:hidden">Run</span>
          </button>

          {/* View Live Portfolio */}
          <Link
            href="/"
            target="_blank"
            className="hidden items-center gap-1 rounded-xl border border-border bg-card px-2.5 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground md:flex"
          >
            <span>Portfolio</span>
            <ExternalLink size={12} />
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
            title="Log Out of Admin"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Floating Success Notification */}
      {successToast && (
        <div className="absolute right-6 top-16 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 font-mono text-xs text-emerald-500 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={16} />
          <span>{successToast}</span>
        </div>
      )}
    </header>
  )
}
