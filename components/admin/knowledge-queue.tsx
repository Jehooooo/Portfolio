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
  Zap,
  SlidersHorizontal,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle2,
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
  const [statusFilter, setStatusFilter] = useState<
    'pending_review' | 'approved' | 'rejected' | 'all'
  >('pending_review')
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

  // Bulk selection & automation states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [automationModalOpen, setAutomationModalOpen] = useState(false)
  const [customThreshold, setCustomThreshold] = useState(85)
  const [customRejectBelow, setCustomRejectBelow] = useState(60)
  const [enableRejectBelow, setEnableRejectBelow] = useState(true)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        category: categoryFilter,
        search,
        limit: '80',
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
    setSelectedIds(new Set())
  }, [fetchItems])

  // Single Item Status Update
  const handleUpdateStatus = async (
    id: string,
    newStatus: 'approved' | 'rejected' | 'pending_review',
  ) => {
    setActionInProgress(id)
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
        fetchItems()
      }
    } catch {
      fetchItems()
    } finally {
      setActionInProgress(null)
    }
  }

  // Delete Single Item
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

  // Automated Batch Threshold Action
  const handleAutomatedThreshold = async (
    minConf: number,
    rejectBelow?: number,
  ) => {
    setBulkLoading(true)
    try {
      const res = await fetch('/api/admin/knowledge/auto-moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto_threshold',
          minConfidence: minConf / 100,
          rejectBelow: rejectBelow !== undefined ? rejectBelow / 100 : undefined,
          category: categoryFilter,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        showToast(data.message || 'Auto-moderation completed successfully!')
        setSelectedIds(new Set())
        await fetchItems()
        onStatusChange?.()
        setAutomationModalOpen(false)
      } else {
        showToast(data.error || 'Auto-moderation failed.')
      }
    } catch {
      showToast('Error connecting to auto-moderation service.')
    } finally {
      setBulkLoading(false)
    }
  }

  // Bulk Status Update on Checked Items
  const handleBulkUpdate = async (status: 'approved' | 'rejected' | 'pending_review') => {
    if (selectedIds.size === 0) return
    setBulkLoading(true)

    const idsArray = Array.from(selectedIds)
    try {
      const res = await fetch('/api/admin/knowledge/auto-moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch_status',
          ids: idsArray,
          status,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        showToast(data.message || `Updated ${idsArray.length} items to "${status}".`)
        setSelectedIds(new Set())
        await fetchItems()
        onStatusChange?.()
      } else {
        showToast(data.error || 'Bulk update failed.')
      }
    } catch {
      showToast('Error connecting to bulk update service.')
    } finally {
      setBulkLoading(false)
    }
  }

  // Selection Toggles
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAllVisible = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((i) => i._id)))
    }
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-card px-4 py-3 font-mono text-xs text-foreground shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

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

      {/* Category Pills & Automation Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-y border-border/60 py-3">
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

        {/* Automation Quick Actions */}
        {statusFilter === 'pending_review' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={bulkLoading || counts.pending_review === 0}
              onClick={() => handleAutomatedThreshold(85, 60)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs font-semibold text-emerald-600 transition-all hover:bg-emerald-500 hover:text-white disabled:opacity-50 dark:text-emerald-400 dark:hover:text-black"
              title="Automatically approve facts with >= 85% confidence and reject facts with < 60% confidence"
            >
              {bulkLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Zap size={13} className="fill-current" />
              )}
              <span>Auto-Approve (≥85%)</span>
            </button>

            <button
              type="button"
              disabled={bulkLoading || counts.pending_review === 0}
              onClick={() => setAutomationModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 font-mono text-xs font-medium text-foreground transition-all hover:border-foreground/30 hover:bg-secondary/60 disabled:opacity-50"
              title="Configure custom threshold or bulk rules"
            >
              <SlidersHorizontal size={13} />
              <span>Custom Rules...</span>
            </button>
          </div>
        )}
      </div>

      {/* Select All Toggle Bar */}
      {items.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button
            type="button"
            onClick={handleSelectAllVisible}
            className="flex items-center gap-2 font-mono hover:text-foreground"
          >
            {selectedIds.size === items.length ? (
              <CheckSquare size={16} className="text-foreground" />
            ) : (
              <Square size={16} />
            )}
            <span>
              {selectedIds.size === items.length ? 'Deselect All' : 'Select All Visible'} ({items.length})
            </span>
          </button>

          {selectedIds.size > 0 && (
            <span className="font-mono text-foreground font-semibold">
              {selectedIds.size} of {items.length} selected
            </span>
          )}
        </div>
      )}

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
            const isSelected = selectedIds.has(item._id)

            return (
              <div
                key={item._id}
                className={`group flex flex-col justify-between rounded-2xl border bg-card p-4 transition-all duration-200 sm:p-5 ${
                  isSelected
                    ? 'border-foreground shadow-sm bg-secondary/20'
                    : 'border-border hover:border-foreground/20 hover:shadow-2xs'
                }`}
              >
                <div>
                  {/* Card Header: Checkbox, Category, Confidence */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(item._id)}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {isSelected ? (
                          <CheckSquare size={16} className="text-foreground" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>

                      <span
                        className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${colorClass}`}
                      >
                        {item.category}
                      </span>
                      {item.confidence !== undefined && (
                        <span className="font-mono text-[10px] text-muted-foreground font-semibold">
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

                  {/* Extraction Rationale */}
                  {item.reason && (
                    <p className="mt-2.5 rounded-xl border border-border/60 bg-secondary/30 p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground/80">Reason:</span>{' '}
                      {item.reason}
                    </p>
                  )}
                </div>

                {/* Card Footer */}
                <div className="mt-4 border-t border-border/60 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.session_id, item._id)}
                      className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground truncate max-w-[130px] sm:max-w-none"
                      title="Click to copy session ID"
                    >
                      {copiedId === item._id ? (
                        <CheckCheck size={11} className="text-emerald-500" />
                      ) : (
                        <Copy size={11} />
                      )}
                      <span className="truncate">session: {item.session_id}</span>
                    </button>

                    {/* Single Action Buttons */}
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

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/95 px-5 py-3 shadow-2xl backdrop-blur-xl">
            <span className="font-mono text-xs font-bold text-foreground">
              {selectedIds.size} fact{selectedIds.size > 1 ? 's' : ''} selected
            </span>

            <div className="h-4 w-px bg-border" />

            <button
              type="button"
              disabled={bulkLoading}
              onClick={() => handleBulkUpdate('approved')}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-500 hover:text-white dark:text-emerald-400 dark:hover:text-black"
            >
              {bulkLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
              <span>Approve Selected</span>
            </button>

            <button
              type="button"
              disabled={bulkLoading}
              onClick={() => handleBulkUpdate('rejected')}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 font-mono text-xs font-semibold text-rose-500 transition-colors hover:bg-rose-500 hover:text-white"
            >
              {bulkLoading ? <Loader2 size={13} className="animate-spin" /> : <X size={14} />}
              <span>Reject Selected</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="font-mono text-xs text-muted-foreground hover:text-foreground px-1"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Custom Automation Modal */}
      {automationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-foreground">
                  <Zap size={16} />
                </div>
                <h3 className="font-mono text-sm font-bold text-foreground">
                  Automate Fact Moderation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAutomationModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Execute automated rules across all currently pending facts in MongoDB Atlas without reviewing each one manually.
            </p>

            <div className="mt-6 space-y-4 font-mono text-xs">
              {/* Approval Threshold Slider */}
              <div className="space-y-2 rounded-2xl border border-border bg-secondary/30 p-4">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-emerald-500">Auto-Approve Threshold:</span>
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-500">
                    ≥ {customThreshold}% Confident
                  </span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="100"
                  step="5"
                  value={customThreshold}
                  onChange={(e) => setCustomThreshold(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <p className="text-[11px] text-muted-foreground">
                  Facts with confidence score at or above this value will be approved into memory.
                </p>
              </div>

              {/* Rejection Threshold */}
              <div className="space-y-2 rounded-2xl border border-border bg-secondary/30 p-4">
                <div className="flex items-center justify-between font-semibold">
                  <label className="flex items-center gap-2 cursor-pointer text-rose-500">
                    <input
                      type="checkbox"
                      checked={enableRejectBelow}
                      onChange={(e) => setEnableRejectBelow(e.target.checked)}
                      className="accent-rose-500"
                    />
                    <span>Auto-Reject Low Confidence:</span>
                  </label>
                  {enableRejectBelow && (
                    <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-rose-500">
                      &lt; {customRejectBelow}%
                    </span>
                  )}
                </div>
                {enableRejectBelow && (
                  <>
                    <input
                      type="range"
                      min="30"
                      max="80"
                      step="5"
                      value={customRejectBelow}
                      onChange={(e) => setCustomRejectBelow(parseInt(e.target.value, 10))}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Facts with confidence lower than this value will be automatically rejected.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAutomationModalOpen(false)}
                className="rounded-xl border border-border bg-card px-4 py-2 font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkLoading}
                onClick={() =>
                  handleAutomatedThreshold(
                    customThreshold,
                    enableRejectBelow ? customRejectBelow : undefined,
                  )
                }
                className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 font-mono text-xs font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                <span>Execute Automation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
