'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Send, RotateCcw } from 'lucide-react'
import { profile } from '@/lib/portfolio-data'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const STARTER_PROMPTS = [
  'Tell me about yourself',
  'What are your skills?',
  'Show me your projects',
  'Why should I hire you?',
]

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hey! I'm Jehosue 👋. Ask me anything about my projects, skills, experience, or what I'm currently learning!",
}

/** Parses inline markdown (**bold**, *italic*) */
function formatInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    return part
  })
}

/** Parses markdown blocks (paragraphs, bullet lists, numbered lists, headings) */
function FormattedMessage({ content }: { content: string }) {
  if (!content) return null

  const blocks = content.split(/\n\n+/)

  return (
    <div className="space-y-2">
      {blocks.map((block, idx) => {
        const lines = block.trim().split('\n')

        // Bullet lists
        if (lines.length > 0 && lines.every((line) => /^[*-]\s+/.test(line.trim()))) {
          return (
            <ul key={idx} className="list-disc pl-4 space-y-1 my-1">
              {lines.map((line, lIdx) => {
                const cleanLine = line.trim().replace(/^[*-]\s+/, '')
                return <li key={lIdx}>{formatInline(cleanLine)}</li>
              })}
            </ul>
          )
        }

        // Numbered lists
        if (lines.length > 0 && lines.every((line) => /^\d+\.\s+/.test(line.trim()))) {
          return (
            <ol key={idx} className="list-decimal pl-4 space-y-1 my-1">
              {lines.map((line, lIdx) => {
                const cleanLine = line.trim().replace(/^\d+\.\s+/, '')
                return <li key={lIdx}>{formatInline(cleanLine)}</li>
              })}
            </ol>
          )
        }

        // Headings
        if (/^###\s+/.test(block.trim())) {
          return (
            <h4 key={idx} className="font-semibold text-sm mt-1 text-foreground">
              {formatInline(block.trim().replace(/^###\s+/, ''))}
            </h4>
          )
        }

        // Standard paragraph
        return (
          <p key={idx} className="leading-relaxed">
            {lines.map((line, lIdx) => (
              <span key={lIdx}>
                {lIdx > 0 && <br />}
                {formatInline(line)}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

export function AiChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let sid = typeof window !== 'undefined' ? sessionStorage.getItem('ai_jehosue_session_id') : null
    if (!sid) {
      sid = `session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('ai_jehosue_session_id', sid)
      }
    }
    setSessionId(sid)
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    // Create a placeholder assistant message for streaming
    const assistantId = (Date.now() + 1).toString()
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '' },
    ])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          messages: updatedMessages
            .filter((m) => m.id !== 'welcome')
            .map((m) => ({
              role: m.role,
              content: m.content,
            })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No reader available')

      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk

        // Update the assistant message with accumulated text
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: accumulated } : m,
          ),
        )
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
              ...m,
              content:
                "I'm taking a quick breather at the moment! Feel free to explore my featured projects or message me directly using the contact form below.",
            }
            : m,
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const resetChat = () => {
    setMessages([WELCOME_MESSAGE])
  }

  const showStarters = messages.length <= 1

  return (
    <>
      {/* Floating Action Button */}
      <button
        id="ai-chat-fab"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`chat-fab chat-fab-glow fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#1c1815] text-[#f9f0e0] dark:bg-white dark:text-[#0a0a0a] shadow-2xl border border-black/10 dark:border-white/30 transition-all duration-300 hover:scale-110 active:scale-95 ${
          isOpen ? 'rotate-90' : ''
        }`}
        aria-label={isOpen ? 'Close AI chat' : 'Open AI chat'}
      >
        {isOpen ? (
          <X size={22} className="text-[#f9f0e0] dark:text-[#0a0a0a]" />
        ) : (
          <div className="relative flex items-center justify-center">
            <MessageSquare size={22} className="text-[#f9f0e0] dark:text-[#0a0a0a]" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-[#1c1815] dark:ring-white" />
            </span>
          </div>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          ref={chatPanelRef}
          role="dialog"
          aria-label="Chat with Jehosue"
          className="chat-panel fixed bottom-24 right-4 sm:right-6 z-50 flex flex-col rounded-3xl shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200"
          style={{
            width: 'min(400px, calc(100vw - 2rem))',
            height: 'min(580px, calc(100vh - 8rem))',
          }}
        >
          {/* Header */}
          <div className="chat-header flex items-center justify-between px-5 py-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 shrink-0">
                <div className="h-9 w-9 rounded-full overflow-hidden ring-1 ring-border shadow-sm bg-muted">
                  <img
                    src={profile.avatarUrl || '/images/profile.png'}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tracking-tight text-foreground">
                    Jehosue
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Ask me anything about my work
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetChat}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Reset conversation"
                title="Reset conversation"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Close chat"
                title="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`chat-bubble max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${message.role === 'user'
                    ? 'chat-bubble-user'
                    : 'chat-bubble-assistant'
                    }`}
                >
                  {message.content ? (
                    message.role === 'assistant' ? (
                      <FormattedMessage content={message.content} />
                    ) : (
                      message.content
                    )
                  ) : (
                    <span className="typing-indicator">
                      <span />
                      <span />
                      <span />
                    </span>
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.content !== '' && (
              <div className="flex justify-start">
                <div className="chat-bubble chat-bubble-assistant max-w-[85%] rounded-2xl px-4 py-2.5">
                  <span className="typing-indicator">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Starter Prompts */}
          {showStarters && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  disabled={isLoading}
                  className="chat-starter-btn rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200 disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="chat-input-area flex items-end gap-2 rounded-b-2xl px-4 py-3"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              rows={1}
              disabled={isLoading}
              className="chat-textarea flex-1 resize-none rounded-xl px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="chat-send-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 disabled:opacity-30"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </form>

          {/* Privacy Notice */}
          <div className="px-4 pb-2 text-center">
            <p className="text-[10px] text-muted-foreground/80">
              Conversations may be stored to help me improve :)
            </p>
          </div>
        </div>
      )}
    </>
  )
}