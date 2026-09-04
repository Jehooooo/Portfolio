import { GoogleGenAI } from '@google/genai'
import {
  upsertVisitorMemory,
  recordVisitorInteraction,
  VisitorMemory,
} from './visitor-memory'

const VISITOR_EXTRACTION_SYSTEM_PROMPT = `You are a precise, privacy-conscious visitor memory extractor for Jehosue (Jeho) Biscarra's portfolio AI.

Your task is to analyze the visitor's message and extract ONLY long-term, factual personal information voluntarily shared by the visitor about themselves or their relationship to Jeho.

CRITICAL RULES:
1. ONLY extract information that is EXPLICITLY stated by the visitor. NEVER assume, guess, or infer unmentioned details.
2. RELATIONSHIP RULE: "I know Jeho" does NOT equal "Friend". Only record relationships if explicitly claimed (e.g. "I'm his friend", "we were college classmates", "I'm his teammate", "I'm a client").
3. DO NOT EXTRACT temporary states or activities ("I'm tired", "It's raining here", "I'm eating dinner", "feeling great today").
4. DO NOT EXTRACT reactions, greetings, or filler words ("lol", "haha", "hi", "thanks", "ok").
5. DO NOT EXTRACT questions asked by the visitor ("What is Jeho's age?", "Do you play games?").
6. NEVER extract passwords, API keys, credentials, financial details, or sensitive personal data.
7. If the visitor did not share any useful personal information, return an empty array [].

ALLOWED CATEGORIES & KEYS:
- "identity": key "name" or "nickname"
- "relationship": key "relationship_to_jeho" (values: "friend", "classmate", "schoolmate", "colleague", "teammate", "client", "family", "acquaintance")
- "interest": key "interest" or "hobby" (e.g. "gaming", "Valorant", "video editing", "badminton")
- "preference": key "preference" (e.g. "prefers Tagalog", "interested in backend")
- "background": key "occupation" or "school" (e.g. "CS student", "React developer", "DMMMSU student")

OUTPUT FORMAT:
Return ONLY a valid JSON array of objects:
[
  {
    "memory_type": "identity" | "relationship" | "interest" | "preference" | "background",
    "key": "name" | "relationship_to_jeho" | "interest" | "occupation" | "school",
    "value": "Clean extracted value",
    "confidence": 0.80 to 1.0,
    "raw_statement": "Exact quote or phrase from the visitor"
  }
]
`

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash',
]

const ALLOWED_TYPES = new Set([
  'identity',
  'relationship',
  'interest',
  'preference',
  'background',
])

function parseGeminiJson(rawText: string): Array<{
  memory_type?: string
  key?: string
  value?: string
  confidence?: number
  raw_statement?: string
}> {
  let cleaned = rawText.trim()
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }
  cleaned = cleaned.trim()

  try {
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Extracts useful visitor memories asynchronously after a non-trivial message.
 * Does not block the chat streaming response.
 */
export async function extractAndStoreVisitorMemories(params: {
  visitorId: string
  sessionId: string
  visitorMessage: string
  aiResponse: string
}): Promise<void> {
  const { visitorId, sessionId, visitorMessage } = params

  if (!visitorId || visitorId === 'anonymous-visitor') return
  if (!visitorMessage || visitorMessage.trim().length < 5) return

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here' || apiKey.trim() === '') return

  try {
    const genAI = new GoogleGenAI({ apiKey })
    const prompt = `Analyze this message sent by the visitor:\n\nVisitor Message: "${visitorMessage}"`

    let responseText = '[]'

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await genAI.models.generateContent({
          model,
          config: {
            systemInstruction: VISITOR_EXTRACTION_SYSTEM_PROMPT,
            temperature: 0.1,
            responseMimeType: 'application/json',
            maxOutputTokens: 1024,
          },
          contents: prompt,
        })
        responseText = response.text?.trim() || '[]'
        break
      } catch (err: unknown) {
        const errStr = String(err)
        if (errStr.includes('404') || errStr.includes('NOT_FOUND')) continue
        if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED')) {
          await new Promise((res) => setTimeout(res, 1200))
          continue
        }
      }
    }

    const items = parseGeminiJson(responseText)
    if (items.length === 0) {
      // Even if no new memory extracted, update visitor last seen
      await recordVisitorInteraction(visitorId, sessionId)
      return
    }

    for (const item of items) {
      if (!item.key || !item.value || typeof item.value !== 'string') continue
      const val = item.value.trim()
      if (val.length < 2) continue

      const memType = (item.memory_type || '').toLowerCase().trim()
      if (!ALLOWED_TYPES.has(memType)) continue

      const confidence =
        typeof item.confidence === 'number' && !isNaN(item.confidence)
          ? Math.min(Math.max(item.confidence, 0), 1)
          : 0.85

      // Only store items with high confidence (>= 0.80)
      if (confidence < 0.8) continue

      await upsertVisitorMemory({
        visitor_id: visitorId,
        memory_type: memType as VisitorMemory['memory_type'],
        key: item.key.toLowerCase().trim(),
        value: val,
        confidence,
        source_session_id: sessionId,
        raw_statement: item.raw_statement || visitorMessage.slice(0, 200),
      })

      // Update visitor profile summary
      if (item.key === 'name' || item.key === 'nickname') {
        await recordVisitorInteraction(visitorId, sessionId, { display_name: val })
      } else if (item.key === 'relationship_to_jeho') {
        await recordVisitorInteraction(visitorId, sessionId, { relationship: val })
      } else if (memType === 'interest') {
        await recordVisitorInteraction(visitorId, sessionId, { new_interest: val })
      } else {
        await recordVisitorInteraction(visitorId, sessionId)
      }
    }
  } catch (err) {
    console.warn('[VisitorExtractor] Background memory extraction error:', err)
  }
}
