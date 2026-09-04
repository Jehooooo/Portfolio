'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Check,
  X,
  RotateCcw,
  Trash2,
  Search,
  Filter,
  Sparkles,
  ExternalLink,
  Loader2,
  Copy,
  CheckCheck,
} from 'lucide-react'

export interface KnowledgeItem {
  _id: string
  category: string
  information: string
  source: string
  session_id: string
  conversation_id?: string
  confidence?: number
  reason?: string
  status: 'pending_review' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

interface KnowledgeQueueProps {
  onStatusChange?: () => void
}

const CATEGORIES = [
  'all',
  'skills',
  'education',
  'projects',
  'personal',
  'experience',
  'career',
  'preferences',
  'interests',
  'other',
]

const CATEGORY_COLORS: Record<string, string> = {
  skills: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  education: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  projects: 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400',
  personal: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  experience: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  career: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  preferences: 'border-pink-500/30 bg-pink-500/10 text-pink-600 dark:text-pink-400',
  interests: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400',
  other: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
}

export function KnowledgeQueue({ onStatusChange }: KnowledgeQueueProps) {
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'pending_review' | 'approved' | 'rejected' | 'all'>('pending_review')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [counts, setCounts] = useState({
    pending_review: 0,
    approved: 0,
    rejected: 0,
    all: 0,
  })

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        category: categoryFilter,
        search,
        limit: '60',
      })
      const res = await fetch(`/api/admin/knowledge?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
        if (data.counts) {
          setCounts(data.counts)
        }
      }
    } catch (err) {
      console.error('Failed to fetch knowledge queue:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, categoryFilter, search])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleUpdateStatus = async (
    id: string,
    newStatus: 'approved' | 'rejected' | 'pending_review',
  ) => {
    setActionInProgress(id)
    // Optimistic UI update
    setItems((prev) =>
      statusFilter === 'all'
        ? prev.map((item) => (item._id === id ? { ...item, status: newStatus } : item))
        : prev.filter((item) => item._id !== id),
    )

    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })

      if (res.ok) {
        onStatusChange?.()
      } else {
        // Rollback on failure
        fetchItems()
      }
    } catch {
      fetchItems()
    } finally {
      setActionInProgress(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this knowledge fact?')) {
      return
    }

    setActionInProgress(id)
    setItems((prev) => prev.filter((item) => item._id !== id))

    try {
      await fetch(`/api/admin/knowledge?id=${id}`, {
        method: 'DELETE',
      })
      onStatusChange?.()
    } catch {
      fetchItems()
    } finally {
      setActionInProgress(null)
    }
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-5">
      {/* Top Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 rounded-2xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setStatusFilter('pending_review')}
            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 font-mono text-xs font-medium transition-all ${
              statusFilter === 'pending_review'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Pending</span>
            {counts.pending_review > 0 && (
              <span
                className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold ${
                  statusFilter === 'pending_review'
                    ? 'bg-background/20 text-background'
                    : 'bg-amber-500/20 text-amber-500'
                }`}
              >
                {counts.pending_review}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('approved')}
            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 font-mono text-xs font-medium transition-all ${
              statusFilter === 'approved'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Approved</span>
            <span
              className={`rounded-md px-1.5 py-0.2 text-[10px] ${
                statusFilter === 'approved'
                  ? 'bg-background/20 text-background'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {counts.approved}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('rejected')}
            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 font-mono text-xs font-medium transition-all ${
              statusFilter === 'rejected'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Rejected</span>
            <span
              className={`rounded-md px-1.5 py-0.2 text-[10px] ${
                statusFilter === 'rejected'
                  ? 'bg-background/20 text-background'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {counts.rejected}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`rounded-xl px-3 py-1.5 font-mono text-xs font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>All ({counts.all})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search extracted facts..."
            className="w-full rounded-xl border border-border bg-card py-1.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground mr-1">
          <Filter size={12} /> Category:
        </span>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`rounded-lg px-2.5 py-1 font-mono text-[11px] capitalize transition-colors ${
              categoryFilter === cat
                ? 'bg-secondary text-foreground font-semibold border border-border'
                : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items List */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
          <p className="font-mono text-xs text-muted-foreground">
            Loading knowledge items...
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center">
          <Sparkles size={28} className="text-muted-foreground/60" />
          <p className="font-mono text-sm font-semibold text-foreground">
            {statusFilter === 'pending_review'
              ? 'Moderation Queue is Empty! 🎉'
              : 'No knowledge items found'}
          </p>
          <p className="max-w-md text-xs text-muted-foreground">
            {statusFilter === 'pending_review'
              ? 'All Gemini-extracted facts from conversations have been reviewed. Run the processor or wait for new visitor chats.'
              : 'Try selecting a different filter or clearing your search.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {items.map((item) => {
            const isItemPending = item.status === 'pending_review'
            const isItemApproved = item.status === 'approved'
            const isItemRejected = item.status === 'rejected'
            const colorClass = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other
            const isProcessingThis = actionInProgress === item._id

            return (
              <div
                key={item._id}
                className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-foreground/20 hover:shadow-sm sm:p-5"
              >
                <div>
                  {/* Card Header: Category & Confidence */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${colorClass}`}
                      >
                        {item.category}
                      </span>
                      {item.confidence !== undefined && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {Math.round(item.confidence * 100)}% conf
                        </span>
                      )}
                    </div>

                    <span
                      className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-medium capitalize ${
                        isItemApproved
                          ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                          : isItemRejected
                            ? 'border border-rose-500/20 bg-rose-500/10 text-rose-500'
                            : 'border border-amber-500/20 bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Fact Statement */}
                  <h4 className="mt-3 text-sm font-medium leading-snug text-foreground">
                    &ldquo;{item.information}&rdquo;
                  </h4>

                  {/* Extraction Rationale / Context */}
                  {item.reason && (
                    <p className="mt-2.5 rounded-xl border border-border/60 bg-secondary/30 p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground/80">Gemini Reason:</span>{' '}
                      {item.reason}
                    </p>
                  )}
                </div>

                {/* Card Footer: Metadata & Actions */}
                <div className="mt-4 border-t border-border/60 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.session_id, item._id)}
                      className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground truncate max-w-[140px] sm:max-w-none"
                      title="Click to copy session ID"
                    >
                      {copiedId === item._id ? (
                        <CheckCheck size={11} className="text-emerald-500" />
                      ) : (
                        <Copy size={11} />
                      )}
                      <span className="truncate">session: {item.session_id}</span>
                    </button>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {isItemPending && (
                        <>
                          <button
                            type="button"
                            disabled={isProcessingThis}
                            onClick={() => handleUpdateStatus(item._id, 'approved')}
                            className="flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-500 hover:text-white dark:text-emerald-400 dark:hover:text-black"
                            title="Approve fact & inject into AI persona"
                          >
                            <Check size={13} />
                            <span>Approve</span>
                          </button>

                          <button
                            type="button"
                            disabled={isProcessingThis}
                            onClick={() => handleUpdateStatus(item._id, 'rejected')}
                            className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/5 px-2.5 py-1 font-mono text-xs font-semibold text-rose-500 transition-colors hover:bg-rose-500 hover:text-white"
                            title="Reject fact"
                          >
                            <X size={13} />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {isItemApproved && (
                        <button
                          type="button"
                          disabled={isProcessingThis}
                          onClick={() => handleUpdateStatus(item._id, 'rejected')}
                          className="flex items-center gap-1 rounded-xl border border-border bg-secondary/60 px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-rose-500/40 hover:text-rose-500"
                        >
                          <X size={13} />
                          <span>Revoke</span>
                        </button>
                      )}

                      {isItemRejected && (
                        <>
                          <button
                            type="button"
                            disabled={isProcessingThis}
                            onClick={() => handleUpdateStatus(item._id, 'approved')}
                            className="flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs text-emerald-500 transition-colors hover:bg-emerald-500 hover:text-white"
                          >
                            <Check size={13} />
                            <span>Approve</span>
                          </button>

                          <button
                            type="button"
                            disabled={isProcessingThis}
                            onClick={() => handleDelete(item._id)}
                            className="flex h-7 w-7 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-rose-500/40 hover:text-rose-500"
                            title="Delete permanently"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}

                      {statusFilter === 'all' && !isItemPending && (
                        <button
                          type="button"
                          disabled={isProcessingThis}
                          onClick={() => handleUpdateStatus(item._id, 'pending_review')}
                          className="flex h-7 w-7 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:text-foreground"
                          title="Reset to Pending"
                        >
                          <RotateCcw size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
