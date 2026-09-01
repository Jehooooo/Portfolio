'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Send, Sparkles, RotateCcw } from 'lucide-react'

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
    "Hey! I'm Jehosue 😄. Ask me anything about my projects, skills, experience, or what I'm currently learning!",
}

export function AiChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
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
    setHasError(false)

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
      setHasError(true)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
              ...m,
              content:
                "Hmm, something went wrong on my end. Try again in a bit? If this keeps happening, the API key might need to be set up.",
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
    setHasError(false)
  }

  const showStarters = messages.length <= 1

  return (
    <>
      {/* Floating Action Button */}
      <button
        id="ai-chat-fab"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`chat-fab fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 ${isOpen
          ? 'rotate-90 bg-white/10 backdrop-blur-md border border-white/20'
          : 'chat-fab-glow'
          }`}
        aria-label={isOpen ? 'Close chat' : 'Chat with Jeho'}
      >
        {isOpen ? (
          <X size={22} className="text-white" />
        ) : (
          <MessageSquare size={22} className="text-white" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          ref={chatPanelRef}
          className="chat-panel fixed bottom-24 right-6 z-50 flex w-[360px] flex-col rounded-2xl shadow-2xl sm:w-[400px] max-h-[min(600px,calc(100dvh-120px))]"
        >
          {/* Header */}
          <div className="chat-header flex items-center gap-3 rounded-t-2xl px-5 py-4">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-foreground">
                <Sparkles size={20} />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0c0618] bg-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Jeho</h3>
              <p className="text-xs text-muted-foreground">
                Ask me anything about me!
              </p>
            </div>
            <button
              type="button"
              onClick={resetChat}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Reset conversation"
              title="Reset conversation"
            >
              <RotateCcw size={15} />
            </button>
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
                  {message.content || (
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

          {/* Error indicator */}
          {hasError && (
            <div className="px-4 pb-2">
              <p className="text-[10px] text-red-400/70 text-center">
                Connection issue — check your API key in .env.local
              </p>
            </div>
          )}
        </div>
      )}
    </>
  )
}
