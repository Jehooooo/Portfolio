'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MessageSquare,
  Search,
  Bot,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  Filter,
} from 'lucide-react'

export interface ConversationItem {
  _id: string
  session_id: string
  visitor_message: string
  ai_response: string
  timestamp: string
  processed: boolean
  processing_status?: string
  processing_error?: string
  metadata?: {
    model?: string
    source?: string
  }
}

export function ConversationViewer() {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'processed' | 'pending' | 'failed'>('all')
  const [sessionIdFilter, setSessionIdFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        search,
        sessionId: sessionIdFilter,
        page: String(page),
        limit: '25',
      })
      const res = await fetch(`/api/admin/conversations?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setConversations(data.items || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
      }
    } catch (err) {
      console.error('Failed to load conversations:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search, sessionIdFilter, page])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts)
      if (isNaN(d.getTime())) return ts
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ts
    }
  }

  return (
    <div className="space-y-5">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter */}
        <div className="flex items-center gap-1 rounded-2xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all')
              setPage(1)
            }}
            className={`rounded-xl px-3 py-1.5 font-mono text-xs font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('processed')
              setPage(1)
            }}
            className={`rounded-xl px-3 py-1.5 font-mono text-xs font-medium transition-all ${
              statusFilter === 'processed'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Processed
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('pending')
              setPage(1)
            }}
            className={`rounded-xl px-3 py-1.5 font-mono text-xs font-medium transition-all ${
              statusFilter === 'pending'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('failed')
              setPage(1)
            }}
            className={`rounded-xl px-3 py-1.5 font-mono text-xs font-medium transition-all ${
              statusFilter === 'failed'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Failed
          </button>
        </div>

        {/* Search */}
        <div className="flex flex-1 items-center gap-2 sm:max-w-md">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search conversations..."
              className="w-full rounded-xl border border-border bg-card py-1.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
          </div>

          {sessionIdFilter && (
            <button
              type="button"
              onClick={() => {
                setSessionIdFilter('')
                setPage(1)
              }}
              className="rounded-xl border border-border bg-secondary/80 px-2.5 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              Clear Session
            </button>
          )}
        </div>
      </div>

      {/* Total Found */}
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span>Showing {conversations.length} of {total} conversations</span>
        {sessionIdFilter && (
          <span className="truncate max-w-[200px]">Filtered by session: {sessionIdFilter}</span>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
          <p className="font-mono text-xs text-muted-foreground">
            Loading conversations...
          </p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center">
          <MessageSquare size={28} className="text-muted-foreground/60" />
          <p className="font-mono text-sm font-semibold text-foreground">
            No conversations found
          </p>
          <p className="max-w-md text-xs text-muted-foreground">
            No visitor chat records match your current filter or search criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => {
            const isExpanded = expandedId === conv._id
            const isProcessed = conv.processed || conv.processing_status === 'completed'
            const isFailed = conv.processing_status === 'failed'

            return (
              <div
                key={conv._id}
                className="overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-foreground/20"
              >
                {/* Header Summary Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : conv._id)}
                  className="flex cursor-pointer items-center justify-between gap-3 p-4 transition-colors hover:bg-secondary/20 sm:px-5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/50 text-foreground">
                      <MessageSquare size={14} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground truncate max-w-[120px] sm:max-w-[160px]">
                          {conv.session_id}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {formatTime(conv.timestamp)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        <span className="font-semibold text-foreground/80">Visitor:</span>{' '}
                        {conv.visitor_message || '(No message text)'}
                      </p>
                    </div>
                  </div>

                  {/* Status badge & expand chevron */}
                  <div className="flex shrink-0 items-center gap-2.5">
                    {isProcessed ? (
                      <span className="flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-500">
                        <CheckCircle2 size={11} />
                        <span className="hidden sm:inline">Processed</span>
                      </span>
                    ) : isFailed ? (
                      <span className="flex items-center gap-1 rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-rose-500">
                        <AlertCircle size={11} />
                        <span className="hidden sm:inline">Failed</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-amber-500">
                        <Clock size={11} />
                        <span className="hidden sm:inline">Pending</span>
                      </span>
                    )}

                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Chat Messages */}
                {isExpanded && (
                  <div className="border-t border-border/70 bg-secondary/15 p-4 space-y-3.5 sm:p-5">
                    {/* Visitor Message Bubble */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
                        <User size={14} />
                      </div>
                      <div className="flex-1 rounded-2xl border border-border bg-card p-3 text-xs leading-relaxed text-foreground shadow-2xs">
                        <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Visitor
                        </div>
                        <p className="whitespace-pre-wrap">{conv.visitor_message}</p>
                      </div>
                    </div>

                    {/* AI Jehosue Bubble */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-foreground/30 bg-foreground text-background">
                        <Bot size={14} />
                      </div>
                      <div className="flex-1 rounded-2xl border border-border bg-card p-3 text-xs leading-relaxed text-foreground shadow-2xs">
                        <div className="mb-1 flex items-center justify-between font-mono text-[10px]">
                          <span className="font-bold uppercase tracking-wider text-foreground/80">
                            AI Jehosue
                          </span>
                          {conv.metadata?.model && (
                            <span className="text-muted-foreground">
                              {conv.metadata.model}
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap text-foreground/90">{conv.ai_response}</p>
                      </div>
                    </div>

                    {/* Error message if failed */}
                    {conv.processing_error && (
                      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 font-mono text-xs text-rose-500">
                        <span className="font-bold">Error:</span> {conv.processing_error}
                      </div>
                    )}

                    {/* Meta actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 font-mono text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleCopy(conv.session_id, `sess-${conv._id}`)}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          {copiedId === `sess-${conv._id}` ? (
                            <CheckCheck size={12} className="text-emerald-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                          <span>Copy Session</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSessionIdFilter(conv.session_id)
                            setPage(1)
                          }}
                          className="hover:text-foreground"
                        >
                          Filter by Session
                        </button>
                      </div>

                      <span>ID: {conv._id}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="rounded-xl border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-mono text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="rounded-xl border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
