'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  MessageSquare,
  FileText,
  Loader2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { AdminStatsGrid } from '@/components/admin/admin-stats-grid'
import { KnowledgeQueue } from '@/components/admin/knowledge-queue'
import { ConversationViewer } from '@/components/admin/conversation-viewer'
import { ThemeToggle } from '@/components/theme-toggle'

interface AdminStatsData {
  database: {
    connected: boolean
    latencyMs: number
  }
  metrics: {
    totalConversations: number
    messagesToday: number
    unprocessedCount: number
    pendingFactsCount: number
    approvedFactsCount: number
    rejectedFactsCount: number
    totalFactsCount: number
  }
  recentLogs: Array<{
    _id: string
    started_at: string
    completed_at: string
    processed_conversations_count: number
    extracted_items_count: number
    failed_conversation_count: number
    status: string
    trigger?: string
  }>
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [secretInput, setSecretInput] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<'knowledge' | 'conversations' | 'logs'>('knowledge')
  const [stats, setStats] = useState<AdminStatsData | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // 1. Check existing session on load
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auth')
      if (res.ok) {
        const data = await res.json()
        setAuthenticated(Boolean(data.authenticated))
      } else {
        setAuthenticated(false)
      }
    } catch {
      setAuthenticated(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // 2. Load Stats when authenticated
  const fetchStats = useCallback(async () => {
    if (!authenticated) return
    setStatsLoading(true)
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch admin stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [authenticated])

  useEffect(() => {
    if (authenticated) {
      fetchStats()
    }
  }, [authenticated, fetchStats])

  // 3. Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    setLoginLoading(true)

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secretInput, password: secretInput }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setAuthenticated(true)
        setSecretInput('')
      } else {
        setLoginError(data.error || 'Authentication failed. Please check your admin password.')
      }
    } catch {
      setLoginError('Network error while connecting to authentication service.')
    } finally {
      setLoginLoading(false)
    }
  }

  // 4. Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' })
    } catch {
      // ignore
    }
    setAuthenticated(false)
    setStats(null)
  }

  const [conversationRefreshKey, setConversationRefreshKey] = useState(0)

  // 5. Trigger Pipeline
  const handleRunProcessor = async () => {
    setIsProcessing(true)
    try {
      const res = await fetch('/api/process-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Processing failed')
      }
      // Refresh stats & queue & conversations
      await fetchStats()
      setConversationRefreshKey((k) => k + 1)
    } finally {
      setIsProcessing(false)
    }
  }

  // Initial checking state
  if (authenticated === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-muted-foreground" />
          <p className="font-mono text-xs text-muted-foreground">
            Verifying admin access...
          </p>
        </div>
      </main>
    )
  }

  // Unauthenticated Login Card
  if (!authenticated) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
        {/* Top right theme toggle & back link */}
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/"
            className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={13} />
            <span>Portfolio</span>
          </Link>
        </div>

        <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-xl backdrop-blur-xl sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-secondary/80 text-foreground shadow-xs">
              <Lock size={22} />
            </div>
            <h1 className="mt-4 font-mono text-lg font-bold tracking-tight text-foreground">
              JEHO // AI ADMIN
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter your <span className="font-mono text-foreground font-semibold">Admin Password</span> to access moderation & metrics.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="admin-password"
                className="block font-mono text-[11px] uppercase tracking-wider text-muted-foreground"
              >
                Admin Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showSecret ? 'text' : 'password'}
                  value={secretInput}
                  onChange={(e) => setSecretInput(e.target.value)}
                  placeholder="Enter your admin password..."
                  required
                  autoFocus
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-10 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showSecret ? 'Hide password' : 'Show password'}
                >
                  {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-500">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading || !secretInput.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-2.5 font-mono text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loginLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Lock size={14} />
              )}
              <span>Unlock Dashboard</span>
            </button>
          </form>
        </div>
      </main>
    )
  }

  // Authenticated Admin Dashboard
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Bar */}
      <AdminHeader
        dbLatencyMs={stats?.database?.latencyMs}
        onRunProcessor={handleRunProcessor}
        onLogout={handleLogout}
        isProcessing={isProcessing}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Live Metrics Grid */}
        <AdminStatsGrid
          metrics={
            stats?.metrics || {
              totalConversations: 0,
              messagesToday: 0,
              unprocessedCount: 0,
              pendingFactsCount: 0,
              approvedFactsCount: 0,
              rejectedFactsCount: 0,
              totalFactsCount: 0,
            }
          }
          latencyMs={stats?.database?.latencyMs}
          onSelectTab={setActiveTab}
        />

        {/* Section Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-border/80 pb-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('knowledge')}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 font-mono text-xs font-semibold transition-all ${
                activeTab === 'knowledge'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles size={14} />
              <span>Knowledge Moderation</span>
              {stats?.metrics.pendingFactsCount ? (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.2 text-[10px] text-amber-500 font-bold">
                  {stats.metrics.pendingFactsCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('conversations')}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 font-mono text-xs font-semibold transition-all ${
                activeTab === 'conversations'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageSquare size={14} />
              <span>Conversation Inspector</span>
              {stats?.metrics.totalConversations ? (
                <span className="rounded-full bg-secondary px-2 py-0.2 text-[10px] text-muted-foreground">
                  {stats.metrics.totalConversations}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 font-mono text-xs font-semibold transition-all ${
                activeTab === 'logs'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText size={14} />
              <span>Pipeline & Audit Logs</span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchStats}
            disabled={statsLoading}
            className="flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
            title="Refresh dashboard metrics"
          >
            <RefreshCw size={12} className={statsLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'knowledge' && (
          <KnowledgeQueue onStatusChange={fetchStats} />
        )}

        {activeTab === 'conversations' && (
          <ConversationViewer key={conversationRefreshKey} />
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Recent Extraction Pipeline Runs
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Audit history of Gemini batch extractions triggered via Vercel Cron or manual admin trigger.
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-border/80 text-muted-foreground">
                      <th className="pb-2 font-semibold">Run Timestamp</th>
                      <th className="pb-2 font-semibold">Trigger</th>
                      <th className="pb-2 font-semibold">Chats Analyzed</th>
                      <th className="pb-2 font-semibold">Facts Extracted</th>
                      <th className="pb-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {stats?.recentLogs && stats.recentLogs.length > 0 ? (
                      stats.recentLogs.map((log) => (
                        <tr key={log._id} className="text-foreground/90">
                          <td className="py-2.5 text-muted-foreground">
                            {new Date(log.completed_at || log.started_at).toLocaleString()}
                          </td>
                          <td className="py-2.5 capitalize">{log.trigger || 'manual'}</td>
                          <td className="py-2.5">{log.processed_conversations_count}</td>
                          <td className="py-2.5 font-bold text-foreground">
                            {log.extracted_items_count}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${
                                log.status === 'completed'
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : 'bg-rose-500/10 text-rose-500'
                              }`}
                            >
                              <CheckCircle2 size={11} />
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground">
                          No pipeline execution logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
