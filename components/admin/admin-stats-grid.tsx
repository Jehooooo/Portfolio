'use client'

import {
  MessageSquare,
  Sparkles,
  Clock,
  Database,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react'

interface AdminStatsGridProps {
  metrics: {
    totalConversations: number
    messagesToday: number
    unprocessedCount: number
    pendingFactsCount: number
    approvedFactsCount: number
    rejectedFactsCount: number
    totalFactsCount: number
  }
  latencyMs?: number
  onSelectTab?: (tab: 'knowledge' | 'conversations' | 'logs') => void
}

export function AdminStatsGrid({
  metrics,
  latencyMs,
  onSelectTab,
}: AdminStatsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {/* 1. Total Visitor Chats */}
      <div
        onClick={() => onSelectTab?.('conversations')}
        className="group cursor-pointer rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-foreground/30 hover:shadow-sm sm:p-5"
      >
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider">
            Visitor Chats
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary/50 text-foreground transition-transform group-hover:scale-110">
            <MessageSquare size={16} />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {metrics.totalConversations}
          </span>
          {metrics.messagesToday > 0 && (
            <span className="flex items-center gap-0.5 font-mono text-[11px] font-medium text-emerald-500">
              <TrendingUp size={11} />+{metrics.messagesToday} today
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {metrics.unprocessedCount > 0
            ? `${metrics.unprocessedCount} unanalyzed chats`
            : 'All chats processed'}
        </p>
      </div>

      {/* 2. Pending Knowledge Moderation */}
      <div
        onClick={() => onSelectTab?.('knowledge')}
        className="group cursor-pointer rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-foreground/30 hover:shadow-sm sm:p-5"
      >
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider">
            Pending Facts
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-500 transition-transform group-hover:scale-110">
            <Clock size={16} />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tracking-tight text-amber-500 sm:text-3xl">
            {metrics.pendingFactsCount}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">queue</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Awaiting approval by Jeho
        </p>
      </div>

      {/* 3. Approved Knowledge Facts */}
      <div
        onClick={() => onSelectTab?.('knowledge')}
        className="group cursor-pointer rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-foreground/30 hover:shadow-sm sm:p-5"
      >
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider">
            Active Persona Facts
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 transition-transform group-hover:scale-110">
            <CheckCircle2 size={16} />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tracking-tight text-emerald-500 sm:text-3xl">
            {metrics.approvedFactsCount}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">approved</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Grounded facts in AI memory
        </p>
      </div>

      {/* 4. Database Latency & Health */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider">
            Atlas Health
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary/50 text-foreground">
            <Database size={16} />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {latencyMs !== undefined ? `${latencyMs}ms` : '0ms'}
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-500 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Healthy
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground truncate">
          MongoDB Atlas Cloud Cluster
        </p>
      </div>
    </div>
  )
}
