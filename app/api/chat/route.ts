import { GoogleGenAI } from '@google/genai'
import { getSystemInstruction } from '@/lib/jehosue-knowledge'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { session_id, messages } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'Messages are required' }, { status: 400 })
    }

    // 1. Try forwarding request to Python Flask backend (which stores to MongoDB & processes knowledge)
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:5000'
    try {
      const pyRes = await fetch(`${pythonBackendUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session_id || 'anonymous-session',
          messages,
        }),
        signal: AbortSignal.timeout(15000),
      })

      if (pyRes.ok) {
        const pyData = await pyRes.json()
        if (pyData.response) {
          return new Response(pyData.response, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        }
      } else {
        const errorText = await pyRes.text()
        console.warn(`[Next.js Chat Route] Python backend returned ${pyRes.status}: ${errorText}`)
      }
    } catch (pyErr) {
      console.warn(`[Next.js Chat Route] Python backend unreachable (${pyErr}), falling back to direct Gemini.`)
    }

    // 2. Direct Gemini streaming fallback if Python backend is offline
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey || apiKey === 'your_api_key_here' || apiKey.trim() === '') {
      return Response.json(
        { error: 'Gemini API key not configured' },
        { status: 500 },
      )
    }

    const genAI = new GoogleGenAI({ apiKey })

    const geminiHistory = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }))

    const lastMessage = messages[messages.length - 1].content
    const systemInstruction = getSystemInstruction()

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
        break
      } catch (err) {
        lastErr = err
        console.warn(`Model ${model} unavailable in Next.js fallback, trying next...`)
      }
    }

    if (!response) {
      throw lastErr || new Error('No available Gemini model responded')
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.text
            if (text) {
              controller.enqueue(encoder.encode(text))
            }
          }
          controller.close()
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
  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json(
      { error: 'Failed to generate response' },
      { status: 500 },
    )
  }
}

