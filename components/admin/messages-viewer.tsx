'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Mail,
  CheckCircle2,
  Clock,
  Trash2,
  ExternalLink,
  RefreshCw,
  Loader2,
  AlertCircle,
  Inbox,
  Send,
  ShieldAlert,
} from 'lucide-react'

interface ContactMessage {
  _id: string
  name: string
  email: string
  message: string
  created_at: string
  status: 'read' | 'unread'
  delivery_status: 'sent' | 'awaiting_activation' | 'saved_locally'
  delivery_method: string
  delivery_error: string | null
}

export function MessagesViewer() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const url = `/api/admin/messages${filter !== 'all' ? `?status=${filter}` : ''}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (err) {
      console.error('Failed to fetch contact messages:', err)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const toggleReadStatus = async (id: string, currentStatus: 'read' | 'unread') => {
    setActionLoading(id)
    const newStatus = currentStatus === 'read' ? 'unread' : 'read'
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m._id === id ? { ...m, status: newStatus } : m)),
        )
        setUnreadCount((prev) => (newStatus === 'read' ? Math.max(0, prev - 1) : prev + 1))
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const deleteMessage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/messages?id=${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m._id !== id))
      }
    } catch (err) {
      console.error('Failed to delete message:', err)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border bg-card p-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              Contact Form Inquiries
            </h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-rose-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-500">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            All messages submitted through your portfolio contact form are safely stored in MongoDB.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="flex rounded-xl border border-border bg-background p-1 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-medium transition-colors ${
                filter === 'read'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Read
            </button>
          </div>

          <button
            onClick={fetchMessages}
            disabled={loading}
            className="flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
            title="Refresh messages"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Notice about FormSubmit Activation if any are pending */}
      {messages.some((m) => m.delivery_status === 'awaiting_activation') && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-foreground">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-500" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-500">
              FormSubmit Email Activation Required
            </p>
            <p className="text-muted-foreground leading-relaxed">
              FormSubmit sent a confirmation email to <span className="font-mono text-foreground font-semibold">jehosuebiscarra@gmail.com</span> with an &quot;Activate Form&quot; button. Please check your Gmail (including Spam or Promotions) and click the activation link. Once clicked, future submissions will immediately forward to your email!
            </p>
          </div>
        </div>
      )}

      {/* Messages List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 size={24} className="animate-spin" />
          <p className="mt-3 font-mono text-xs">Loading contact messages...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card/50 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Inbox size={22} />
          </div>
          <h4 className="mt-4 font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
            No Messages Found
          </h4>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {filter === 'unread'
              ? 'No unread messages. All caught up!'
              : 'Messages submitted through your portfolio contact form will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((item) => (
            <div
              key={item._id}
              className={`rounded-2xl border transition-all p-4 sm:p-5 ${
                item.status === 'unread'
                  ? 'border-foreground/30 bg-card shadow-sm'
                  : 'border-border/60 bg-card/60 opacity-90'
              }`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">
                      {item.name}
                    </span>
                    <a
                      href={`mailto:${item.email}?subject=Re:%20Portfolio%20Inquiry`}
                      className="font-mono text-xs text-indigo-500 hover:underline flex items-center gap-1"
                    >
                      <span>{item.email}</span>
                      <ExternalLink size={10} />
                    </a>

                    {item.status === 'unread' ? (
                      <span className="rounded-full bg-rose-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-500">
                        Unread
                      </span>
                    ) : (
                      <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        Read
                      </span>
                    )}

                    {item.delivery_status === 'sent' && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 size={10} />
                        <span>Email Sent ({item.delivery_method})</span>
                      </span>
                    )}

                    {item.delivery_status === 'awaiting_activation' && (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] text-amber-500 flex items-center gap-1">
                        <Clock size={10} />
                        <span>Activation Pending</span>
                      </span>
                    )}
                  </div>

                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  <a
                    href={`mailto:${item.email}?subject=Re:%20Portfolio%20Inquiry`}
                    className="flex items-center gap-1 rounded-xl bg-foreground px-3 py-1.5 font-mono text-[11px] font-semibold text-background hover:opacity-90 transition-opacity"
                  >
                    <Mail size={12} />
                    <span>Reply</span>
                  </a>

                  <button
                    onClick={() => toggleReadStatus(item._id, item.status)}
                    disabled={actionLoading === item._id}
                    className="flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.status === 'unread' ? 'Mark Read' : 'Mark Unread'}
                  </button>

                  <button
                    onClick={() => deleteMessage(item._id)}
                    disabled={actionLoading === item._id}
                    className="flex items-center justify-center rounded-xl border border-border bg-background p-2 text-muted-foreground hover:text-rose-500 hover:border-rose-500/40 transition-colors"
                    title="Delete message"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Message Body */}
              <div className="mt-3.5 rounded-xl border border-border/80 bg-background/80 p-3.5 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                {item.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
