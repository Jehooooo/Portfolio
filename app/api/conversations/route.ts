import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'
import { validateSessionId, trimApiResponse } from '@/lib/security'
import { getConversationBySessionId } from '@/lib/raw-conversation-memory'

export const dynamic = 'force-dynamic'

/**
 * GET /api/conversations?session_id=<sessionId>
 * Loads stored conversation history for the current session from MongoDB.
 * Ensures conversation continuity across page reloads and browser sessions.
 */
export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request)
    const rateLimit = checkRateLimit(`get-conversations:${clientIp}`, 60, 60 * 1000)
    if (!rateLimit.allowed) {
      return Response.json(
        trimApiResponse({ error: 'Too many requests. Please slow down.' }),
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetTime) } },
      )
    }

    const url = new URL(request.url)
    const rawSessionId = url.searchParams.get('session_id') || url.searchParams.get('sessionId')

    if (!rawSessionId) {
      return Response.json(
        trimApiResponse({ error: 'session_id query parameter is required.' }),
        { status: 400 },
      )
    }

    const sessionId = validateSessionId(rawSessionId)
    const conversation = await getConversationBySessionId(sessionId)

    if (!conversation) {
      return Response.json(
        trimApiResponse({
          found: false,
          session_id: sessionId,
          messages: [],
        }),
        { status: 200 },
      )
    }

    // Map RawMessage objects to frontend-friendly chat messages
    const formattedMessages = (conversation.messages || []).map((msg) => ({
      id: msg.message_id,
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.raw_content,
      createdAt: msg.created_at,
    }))

    return Response.json(
      trimApiResponse({
        found: true,
        conversation_id: conversation.conversation_id,
        session_id: conversation.session_id,
        visitor_id: conversation.visitor_id,
        title: conversation.title,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        messages: formattedMessages,
      }),
      { status: 200 },
    )
  } catch (error) {
    console.error('[API /api/conversations] Error:', error)
    return Response.json(
      trimApiResponse({ error: 'Failed to retrieve conversation history.' }),
      { status: 500 },
    )
  }
}
