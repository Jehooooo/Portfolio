import { GoogleGenAI } from '@google/genai'
import { getSystemInstruction } from '@/lib/jehosue-knowledge'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'
import { getDatabase } from '@/lib/mongodb'
import {
  validateRequestHeaders,
  validateSessionId,
  validateString,
  escapeHtml,
  trimApiResponse,
  sanitizeVisitorPrompt,
  sanitizeAiOutput,
} from '@/lib/security'

/** Asynchronously logs chat conversation to MongoDB */
async function saveConversation(data: {
  sessionId: string
  visitorMessage: string
  aiResponse: string
  model: string
}) {
  try {
    const db = await getDatabase()
    if (!db) return

    await db.collection('conversations').insertOne({
      session_id: data.sessionId,
      visitor_message: data.visitorMessage,
      ai_response: data.aiResponse,
      timestamp: new Date().toISOString(),
      processed: false,
      processing_status: 'pending',
      metadata: {
        model: data.model,
        source: 'nextjs-serverless',
      },
    })
  } catch (err) {
    console.warn('[MongoDB] Background conversation logging failed:', err)
  }
}

export async function POST(request: Request) {
  try {
    // 16. Restrict File Uploads & Validate Content-Type / Size (Max 64 KB)
    const headerCheck = validateRequestHeaders(request, 64 * 1024)
    if (!headerCheck.valid) {
      return Response.json(
        trimApiResponse({ error: headerCheck.error }),
        { status: headerCheck.status || 400 },
      )
    }

    // Rate Limiter: Max 25 requests per minute per IP
    const clientIp = getClientIp(request)
    const rateLimit = checkRateLimit(`chat:${clientIp}`, 25, 60 * 1000)

    if (!rateLimit.allowed) {
      return Response.json(
        trimApiResponse({
          error: `Too many chat requests. Please slow down and try again in ${rateLimit.resetTime}s.`,
        }),
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetTime) } },
      )
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return Response.json(
        trimApiResponse({ error: 'Malformed JSON payload.' }),
        { status: 400 },
      )
    }

    // 14. Validate all inputs
    const rawSessionId = body.session_id
    const sessionId = validateSessionId(rawSessionId)

    const rawMessages = body.messages
    if (!rawMessages || !Array.isArray(rawMessages) || rawMessages.length === 0) {
      return Response.json(
        trimApiResponse({ error: 'A valid array of conversation messages is required.' }),
        { status: 400 },
      )
    }

    if (rawMessages.length > 50) {
      return Response.json(
        trimApiResponse({ error: 'Conversation history exceeds maximum permitted length (50 messages).' }),
        { status: 400 },
      )
    }

    // Sanitize and validate every message object in the history
    const validatedMessages: Array<{ role: 'user' | 'model'; content: string }> = []
    for (let i = 0; i < rawMessages.length; i++) {
      const item = rawMessages[i]
      if (!item || typeof item !== 'object') continue

      const roleValidation = validateString(item.role, {
        required: true,
        allowedValues: ['user', 'assistant', 'model'],
      })
      const contentValidation = validateString(item.content, {
        required: true,
        minLength: 1,
        maxLength: 4000,
      })

      if (!contentValidation.valid || !contentValidation.sanitized) {
        if (i === rawMessages.length - 1) {
          return Response.json(
            trimApiResponse({ error: 'The latest message cannot be empty or exceed 4,000 characters.' }),
            { status: 400 },
          )
        }
        continue
      }

      const role = roleValidation.sanitized === 'user' ? 'user' : 'model'
      validatedMessages.push({
        role,
        content: sanitizeVisitorPrompt(contentValidation.sanitized),
      })
    }

    if (validatedMessages.length === 0) {
      return Response.json(
        trimApiResponse({ error: 'At least one valid message is required.' }),
        { status: 400 },
      )
    }

    const lastMessage = validatedMessages[validatedMessages.length - 1].content

    // Easter Egg: If visitor mentions "Cha" or "charizh" (case-insensitive)
    if (/\b(cha|charizh)\b/i.test(lastMessage)) {
      const easterEggText = 'whoops,  what are you trying to breakin'
      saveConversation({
        sessionId,
        visitorMessage: lastMessage,
        aiResponse: easterEggText,
        model: 'easter-egg-rule',
      }).catch((err) => {
        console.warn('[MongoDB] Background easter egg log failed:', err)
      })

      return new Response(easterEggText, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    // 1. Try forwarding request to Python Flask backend
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:5000'
    try {
      const pyRes = await fetch(`${pythonBackendUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          messages: validatedMessages,
        }),
        signal: AbortSignal.timeout(15000),
      })

      if (pyRes.ok) {
        const pyData = await pyRes.json()
        if (pyData.response && typeof pyData.response === 'string') {
          // 17. Trim API response string & sanitize model leaks
          const cleanOutput = sanitizeAiOutput(pyData.response.trim())
          return new Response(cleanOutput, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        }
      }
    } catch {
      // Fallback silently to direct Gemini
    }

    // 2. Direct Gemini streaming fallback if Python backend is offline
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey || apiKey === 'your_api_key_here' || apiKey.trim() === '') {
      return Response.json(
        trimApiResponse({ error: 'AI chat service is temporarily unavailable.' }),
        { status: 503 },
      )
    }

    const genAI = new GoogleGenAI({ apiKey })

    const geminiHistory = validatedMessages.slice(0, -1).map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }))

    // Retrieve approved dynamic knowledge from MongoDB
    let dynamicKnowledge = ''
    try {
      const db = await getDatabase()
      if (db) {
        const approvedDocs = await db
          .collection('knowledge')
          .find({ status: 'approved' }, { projection: { category: 1, information: 1, _id: 0 } })
          .limit(60)
          .toArray()
        if (approvedDocs.length > 0) {
          dynamicKnowledge = approvedDocs
            .map((doc) => `- [${doc.category || 'general'}] ${doc.information}`)
            .join('\n')
        }
      }
    } catch (dbErr) {
      console.warn('[MongoDB] Dynamic knowledge fetch skipped:', dbErr)
    }

    const systemInstruction = getSystemInstruction(dynamicKnowledge)

    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-3.1-flash-lite-preview',
      'gemini-flash-lite-latest',
      'gemini-3-flash-preview',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
    ]

    let response = null
    let usedModel = 'gemini-3.5-flash-lite'
    let lastErr = null

    for (const model of candidateModels) {
      try {
        response = await genAI.models.generateContentStream({
          model,
          config: {
            systemInstruction,
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 2048,
          },
          contents: [...geminiHistory, { role: 'user', parts: [{ text: lastMessage }] }],
        })
        usedModel = model
        break
      } catch (err) {
        lastErr = err
      }
    }

    if (!response) {
      return Response.json(
        trimApiResponse({ error: 'AI service temporarily unavailable. Please try again in a few moments.' }),
        { status: 503 },
      )
    }

    const encoder = new TextEncoder()
    let fullResponseText = ''
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.text
            if (text) {
              fullResponseText += text
              controller.enqueue(encoder.encode(text))
            }
          }
          controller.close()

          // Log conversation to MongoDB with safety sanitization
          if (fullResponseText.trim()) {
            const cleanAiText = sanitizeAiOutput(fullResponseText.trim())
            saveConversation({
              sessionId,
              visitorMessage: lastMessage,
              aiResponse: cleanAiText,
              model: usedModel,
            }).catch((err) => {
              console.warn('[MongoDB] Save conversation background error:', err)
            })
          }
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch {
    return Response.json(
      trimApiResponse({ error: 'An unexpected error occurred while processing your request.' }),
      { status: 500 },
    )
  }
}