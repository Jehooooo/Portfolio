import { getDatabase } from './mongodb'
import { generateConversationTitle } from './conversation-title'

export interface RawMessage {
  message_id: string
  conversation_id: string
  role: 'user' | 'assistant'
  raw_content: string
  created_at: string
}

export interface ConversationRecord {
  _id?: any
  conversation_id: string
  session_id: string
  visitor_id: string
  title: string
  created_at: string
  updated_at: string
  messages: RawMessage[]
  // Backward compatibility fields with existing admin and extraction pipeline:
  visitor_message?: string
  ai_response?: string
  timestamp?: string
  processed?: boolean
  processing_status?: string
  metadata?: {
    model?: string
    source?: string
  }
}

/**
 * Generates a unique, collision-resistant message ID
 */
function generateMessageId(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).substring(2, 8)
  return `msg_${ts}_${rand}`
}

/**
 * Evaluates whether the current user message warrants retrieving past conversations.
 *
 * Enforces rule: "Do NOT query everything. Do NOT retrieve entire conversation history for every question."
 *
 * Examples that return FALSE:
 * - "What's your favorite color?"
 * - "How old are you?"
 * - "Tell me about your tech stack"
 * - "Hi", "Hello", "Kamusta", "haha"
 * - "How do I center a div?"
 *
 * Examples that return TRUE:
 * - "Hey, it's Jasmine again."
 * - "Do you remember what I told you about my college?"
 * - "Remember when we discussed my programming project?"
 * - "Naalala mo pa yung sinabi ko last time?"
 * - "What did I mention earlier about my exam?"
 */
export function isMemoryQueryRelevant(message: string): boolean {
  if (!message || typeof message !== 'string') return false
  const text = message.trim().toLowerCase()

  if (text.length < 3) return false

  // Explicit memory & recall queries
  const memoryPatterns = [
    /\b(do you remember|remember me|remember what|remember when|remember who)\b/i,
    /\b(did i (tell|mention|say|ask)|what did i (say|tell|mention))\b/i,
    /\b(we talked (about|before|last time|earlier)|last time we (talked|spoke|chatted))\b/i,
    /\b(it'?s (me|[\w]+) again|again it'?s me|back again)\b/i,
    /\b(ako (ulit|to|'to|din)|si [\w]+ (to|'to|ulit))\b/i,
    /\b(naalala mo|tanda mo|nalimutan mo|naalala mo pa|natandaan mo)\b/i,
    /\b(yung (sinabi|kwento|kinuwento|pinag-?usapan|project|college|school|course) ko)\b/i,
    /\b(what do you (know|remember) about (me|my))\b/i,
    /\b(my (college|school|project|exam|course|nursing|work|job|boss|friend))\b/i,
    /\b(earlier (conversation|discussion|chat)|previous (conversation|chat|topic))\b/i,
  ]

  for (const pattern of memoryPatterns) {
    if (pattern.test(text)) {
      return true
    }
  }

  return false
}

/**
 * Extracts topic search terms from a memory query to match past conversation titles or messages
 */
function extractQueryKeywords(text: string): string[] {
  const stopWords = new Set([
    'do', 'you', 'remember', 'what', 'i', 'told', 'about', 'my', 'the', 'when', 'we',
    'talked', 'last', 'time', 'did', 'say', 'mention', 'hey', 'its', 'it', 'is', 'again',
    'naalala', 'mo', 'ba', 'yung', 'sa', 'ko', 'nga', 'si', 'to', 'ulit', 'natin',
  ])

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))

  return words
}

/**
 * Retrieves relevant previous conversations for a given visitor.
 *
 * Queries MongoDB only when determined relevant to the current user message,
 * and strictly excludes the current active session.
 */
export async function getRelevantPreviousConversations(params: {
  visitorId: string
  currentSessionId: string
  currentMessage: string
  limit?: number
}): Promise<ConversationRecord[]> {
  const { visitorId, currentSessionId, currentMessage, limit = 2 } = params

  if (!visitorId || visitorId === 'anonymous-visitor') return []
  if (!isMemoryQueryRelevant(currentMessage)) return []

  try {
    const db = await getDatabase()
    if (!db) return []

    const convColl = db.collection('conversations')

    // Query past conversations for this visitor (excluding current session)
    const baseFilter: Record<string, unknown> = {
      visitor_id: visitorId,
      session_id: { $ne: currentSessionId },
    }

    const keywords = extractQueryKeywords(currentMessage)

    // If specific topic keywords exist (e.g. "college", "nursing", "project"), perform targeted search
    if (keywords.length > 0) {
      const keywordRegexes = keywords.map((kw) => ({
        $or: [
          { title: { $regex: kw, $options: 'i' } },
          { visitor_message: { $regex: kw, $options: 'i' } },
          { 'messages.raw_content': { $regex: kw, $options: 'i' } },
        ],
      }))

      const targetedDocs = await convColl
        .find({
          ...baseFilter,
          $or: keywordRegexes.flatMap((k) => k.$or),
        })
        .sort({ updated_at: -1, timestamp: -1 })
        .limit(limit)
        .toArray()

      if (targetedDocs.length > 0) {
        return targetedDocs.map(mapDocToConversationRecord)
      }
    }

    // General recall fallback: retrieve the most recent 1-2 past conversations
    const recentDocs = await convColl
      .find(baseFilter)
      .sort({ updated_at: -1, timestamp: -1 })
      .limit(limit)
      .toArray()

    return recentDocs.map(mapDocToConversationRecord)
  } catch (err) {
    console.warn('[RawConversationMemory] Failed to query relevant conversations:', err)
    return []
  }
}

function mapDocToConversationRecord(doc: any): ConversationRecord {
  const messages: RawMessage[] = Array.isArray(doc.messages) && doc.messages.length > 0
    ? doc.messages
    : [
        // Backward compatibility for legacy docs that only stored top-level visitor_message & ai_response
        ...(doc.visitor_message
          ? [
              {
                message_id: `legacy_user_${doc._id}`,
                conversation_id: doc.session_id || doc.conversation_id || 'unknown',
                role: 'user' as const,
                raw_content: doc.visitor_message,
                created_at: doc.timestamp || new Date().toISOString(),
              },
            ]
          : []),
        ...(doc.ai_response
          ? [
              {
                message_id: `legacy_ai_${doc._id}`,
                conversation_id: doc.session_id || doc.conversation_id || 'unknown',
                role: 'assistant' as const,
                raw_content: doc.ai_response,
                created_at: doc.timestamp || new Date().toISOString(),
              },
            ]
          : []),
      ]

  return {
    _id: doc._id?.toString(),
    conversation_id: doc.conversation_id || doc.session_id || 'unknown',
    session_id: doc.session_id || doc.conversation_id || 'unknown',
    visitor_id: doc.visitor_id,
    title: doc.title || 'Previous Conversation',
    created_at: doc.created_at || doc.timestamp || new Date().toISOString(),
    updated_at: doc.updated_at || doc.timestamp || new Date().toISOString(),
    messages,
    visitor_message: doc.visitor_message,
    ai_response: doc.ai_response,
    timestamp: doc.timestamp,
    processed: doc.processed,
    processing_status: doc.processing_status,
  }
}

/**
 * Formats retrieved relevant raw conversations into a clean prompt context block.
 *
 * Guarantees that the AI sees the EXACT raw words, emotions, jokes, and expressions,
 * while instructing it to incorporate the context naturally without sounding robotic.
 */
export function formatRelevantConversationsForPrompt(conversations: ConversationRecord[]): string {
  if (!conversations || conversations.length === 0) return ''

  const blocks: string[] = []

  for (const conv of conversations) {
    const title = conv.title || 'Past Conversation'
    const dateStr = conv.created_at
      ? new Date(conv.created_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Previous session'

    const exchangeLines: string[] = []
    // Take the most meaningful messages from the conversation (up to 4 messages)
    const sampleMessages = conv.messages.slice(-4)
    for (const msg of sampleMessages) {
      const speaker = msg.role === 'user' ? 'Visitor' : 'Jeho (You)'
      // Output raw content exactly as spoken
      exchangeLines.push(`  ${speaker}: "${msg.raw_content}"`)
    }

    if (exchangeLines.length > 0) {
      blocks.push(
        `• Topic: "${title}" (${dateStr})\n${exchangeLines.join('\n')}`,
      )
    }
  }

  if (blocks.length === 0) return ''

  return `RELEVANT PREVIOUS CONVERSATIONS WITH THIS VISITOR (RAW HISTORICAL CONTEXT):
${blocks.join('\n\n')}

STRICT GUIDELINES FOR USING PREVIOUS CONVERSATIONS:
1. RAW CONTEXT: The exchanges above are the EXACT, untouched words from previous chats. Use them to understand the visitor's personality, jokes, and background.
2. NATURAL INTEGRATION: Naturally incorporate this context when relevant.
   - ✅ PREFERRED: "Uy Jasmine! Good to see you again 😭 Kamusta yung nursing studies mo?"
   - ❌ FORBIDDEN: "According to our conversation from record #123..." or "My database indicates you previously stated..."
3. NEVER cite system metadata, conversation titles as database tags, or internal timestamps.`
}

/**
 * Helper to execute MongoDB operations with automatic retry on transient connection failures
 */
async function withMongoRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 300): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt)))
      }
    }
  }
  throw lastError
}

export interface RecordUserMessageParams {
  visitorId: string
  conversationId: string
  rawVisitorMessage: string
  messageId?: string
  clientTimestamp?: string
}

export interface RecordUserMessageResult {
  success: boolean
  conversationId: string
  userMessageId: string
  isDuplicate?: boolean
  error?: string
}

/**
 * Persists a user message immediately upon backend receipt.
 * Creates the conversation record if it doesn't exist yet, or appends to messages.
 * Prevents duplicate saves from retries or rapid duplicate submissions.
 */
export async function recordUserMessage(
  params: RecordUserMessageParams,
): Promise<RecordUserMessageResult> {
  const { visitorId, conversationId, rawVisitorMessage, messageId, clientTimestamp } = params

  const msgId = messageId && messageId.trim() ? messageId.trim() : generateMessageId()
  const nowIso = clientTimestamp || new Date().toISOString()

  try {
    return await withMongoRetry(async () => {
      const db = await getDatabase()
      if (!db) {
        console.error('[RawConversationMemory] Database connection unavailable during recordUserMessage')
        return {
          success: false,
          conversationId,
          userMessageId: msgId,
          error: 'Database unavailable',
        }
      }

      const convColl = db.collection('conversations')

      const userMessage: RawMessage = {
        message_id: msgId,
        conversation_id: conversationId,
        role: 'user',
        raw_content: rawVisitorMessage, // 100% UNTOUCHED
        created_at: nowIso,
      }

      // Check for existing conversation record
      const existing = await convColl.findOne({
        $or: [{ conversation_id: conversationId }, { session_id: conversationId }],
      })

      if (!existing) {
        // Derive clean initial title from user message
        const title = await generateConversationTitle(rawVisitorMessage)

        await convColl.insertOne({
          conversation_id: conversationId,
          session_id: conversationId,
          visitor_id: visitorId,
          title: title || 'New Conversation',
          created_at: nowIso,
          updated_at: nowIso,
          messages: [userMessage],
          // Compatibility fields:
          visitor_message: rawVisitorMessage,
          ai_response: '',
          timestamp: nowIso,
          processed: false,
          processing_status: 'pending',
          metadata: {
            source: 'nextjs-serverless',
          },
        })

        return {
          success: true,
          conversationId,
          userMessageId: msgId,
        }
      }

      // Duplicate check: Verify message ID or immediate duplicate submission within 5 seconds
      if (Array.isArray(existing.messages) && existing.messages.length > 0) {
        const idExists = existing.messages.some((m: RawMessage) => m.message_id === msgId)
        if (idExists) {
          return {
            success: true,
            conversationId,
            userMessageId: msgId,
            isDuplicate: true,
          }
        }

        const lastMsg = existing.messages[existing.messages.length - 1]
        if (
          lastMsg &&
          lastMsg.role === 'user' &&
          lastMsg.raw_content === rawVisitorMessage
        ) {
          const timeDiff = Math.abs(new Date(nowIso).getTime() - new Date(lastMsg.created_at).getTime())
          if (timeDiff < 5000) {
            return {
              success: true,
              conversationId,
              userMessageId: lastMsg.message_id,
              isDuplicate: true,
            }
          }
        }
      }

      // Append user message to existing conversation
      const updateDoc: Record<string, unknown> = {
        $push: {
          messages: userMessage,
        },
        $set: {
          updated_at: nowIso,
          visitor_message: rawVisitorMessage,
          timestamp: nowIso,
          processed: false,
          processing_status: 'pending',
        },
      }

      // Set title if existing has generic title
      if (!existing.title || existing.title === 'New Conversation' || existing.title === 'General Conversation') {
        const title = await generateConversationTitle(rawVisitorMessage)
        if (title && title !== 'New Conversation') {
          ;(updateDoc.$set as Record<string, unknown>).title = title
        }
      }

      await convColl.updateOne({ _id: existing._id }, updateDoc)

      return {
        success: true,
        conversationId,
        userMessageId: msgId,
      }
    })
  } catch (err) {
    console.error('[RawConversationMemory] Failed to record user message:', err)
    return {
      success: false,
      conversationId,
      userMessageId: msgId,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export interface RecordAiResponseParams {
  conversationId: string
  rawAiResponse: string
  model?: string
  messageId?: string
  status?: 'completed' | 'failed' | 'error'
  errorMessage?: string
}

export interface RecordAiResponseResult {
  success: boolean
  conversationId: string
  assistantMessageId: string
  error?: string
}

/**
 * Persists the AI response (or failure status) associated with the conversation.
 */
export async function recordAiResponse(
  params: RecordAiResponseParams,
): Promise<RecordAiResponseResult> {
  const { conversationId, rawAiResponse, model, messageId, status = 'completed', errorMessage } = params

  const msgId = messageId && messageId.trim() ? messageId.trim() : generateMessageId()
  const nowIso = new Date().toISOString()
  const isFailure = status === 'failed' || status === 'error'

  const contentToStore = isFailure && (!rawAiResponse || !rawAiResponse.trim())
    ? '[AI response generation failed]'
    : rawAiResponse

  try {
    return await withMongoRetry(async () => {
      const db = await getDatabase()
      if (!db) {
        console.error('[RawConversationMemory] Database connection unavailable during recordAiResponse')
        return {
          success: false,
          conversationId,
          assistantMessageId: msgId,
          error: 'Database unavailable',
        }
      }

      const convColl = db.collection('conversations')

      const assistantMessage: RawMessage = {
        message_id: msgId,
        conversation_id: conversationId,
        role: 'assistant',
        raw_content: contentToStore, // 100% UNTOUCHED
        created_at: nowIso,
      }

      const existing = await convColl.findOne({
        $or: [{ conversation_id: conversationId }, { session_id: conversationId }],
      })

      if (!existing) {
        // Fallback: If conversation document was missing, create it
        await convColl.insertOne({
          conversation_id: conversationId,
          session_id: conversationId,
          visitor_id: 'unknown-visitor',
          title: 'AI Conversation',
          created_at: nowIso,
          updated_at: nowIso,
          messages: [assistantMessage],
          visitor_message: '',
          ai_response: contentToStore,
          timestamp: nowIso,
          processed: false,
          processing_status: isFailure ? 'failed' : 'pending',
          ...(isFailure ? { processing_error: errorMessage || 'AI failed to generate response' } : {}),
          metadata: {
            model: model || 'unknown',
            source: 'nextjs-serverless',
          },
        })

        return {
          success: true,
          conversationId,
          assistantMessageId: msgId,
        }
      }

      // Check if message ID was already appended
      if (Array.isArray(existing.messages) && existing.messages.some((m: RawMessage) => m.message_id === msgId)) {
        return {
          success: true,
          conversationId,
          assistantMessageId: msgId,
        }
      }

      const updateDoc: Record<string, unknown> = {
        $push: {
          messages: assistantMessage,
        },
        $set: {
          updated_at: nowIso,
          ai_response: contentToStore,
          timestamp: nowIso,
          processed: false,
          processing_status: isFailure ? 'failed' : 'pending',
          ...(isFailure ? { processing_error: errorMessage || 'AI failed to generate response' } : {}),
          ...(model ? { 'metadata.model': model } : {}),
        },
      }

      // If conversation title is missing or generic, attempt title improvement with response
      if (
        (!existing.title || existing.title === 'New Conversation' || existing.title === 'General Conversation') &&
        existing.visitor_message &&
        !isFailure
      ) {
        const newTitle = await generateConversationTitle(existing.visitor_message, contentToStore)
        if (newTitle && newTitle !== 'New Conversation') {
          ;(updateDoc.$set as Record<string, unknown>).title = newTitle
        }
      }

      await convColl.updateOne({ _id: existing._id }, updateDoc)

      return {
        success: true,
        conversationId,
        assistantMessageId: msgId,
      }
    })
  } catch (err) {
    console.error('[RawConversationMemory] Failed to record AI response:', err)
    return {
      success: false,
      conversationId,
      assistantMessageId: msgId,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Retrieves the complete stored conversation record for a given session.
 * Used for maintaining continuity when a user refreshes or reopens a conversation.
 */
export async function getConversationBySessionId(sessionId: string): Promise<ConversationRecord | null> {
  if (!sessionId || typeof sessionId !== 'string') return null

  try {
    const db = await getDatabase()
    if (!db) return null

    const convColl = db.collection('conversations')
    const doc = await convColl.findOne({
      $or: [{ conversation_id: sessionId }, { session_id: sessionId }],
    })

    if (!doc) return null
    return mapDocToConversationRecord(doc)
  } catch (err) {
    console.error('[RawConversationMemory] Failed to retrieve conversation by session ID:', err)
    return null
  }
}

/**
 * Backward compatibility wrapper that records both user message and AI response together.
 */
export async function saveRawConversationMessage(params: {
  visitorId: string
  conversationId: string
  rawVisitorMessage: string
  rawAiResponse: string
  model: string
}): Promise<void> {
  const { visitorId, conversationId, rawVisitorMessage, rawAiResponse, model } = params

  await recordUserMessage({
    visitorId,
    conversationId,
    rawVisitorMessage,
  })

  await recordAiResponse({
    conversationId,
    rawAiResponse,
    model,
    status: 'completed',
  })
}
