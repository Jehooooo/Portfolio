import { GoogleGenAI } from '@google/genai'

const TITLE_GENERATOR_SYSTEM_PROMPT = `You are a concise conversation title generator for a personal portfolio chat system.
Your job is to generate a SHORT, CLEAN, READABLE conversation title (2 to 5 words maximum, Title Case).

RULES:
1. Capture the primary topic or intent of the conversation.
2. The title MUST be short: 2 to 5 words.
3. Clean the title only — never return a full sentence or explanation.
4. Return ONLY the title text, nothing else. No quotes, no markdown, no punctuation at the end.
5. Do not include personal pleasantries or conversational filler in the title.

EXAMPLES:
- User: "brooo I'm finally done with my portfolio 😭"
  Title: Portfolio Completion
- User: "I'm having a hard time with my programming assignment."
  Title: Programming Assignment
- User: "Hey, what are your favorite hobbies outside of coding?"
  Title: Hobbies and Interests
- User: "I'm Jasmine. I'm studying Nursing."
  Title: Nursing Studies Introduction
- User: "Can you tell me about the disaster management system you built?"
  Title: Disaster Management Project
- User: "What tech stack do you use for backend development?"
  Title: Backend Tech Stack
`

const CANDIDATE_TITLE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-1.5-flash',
]

/**
 * Heuristic fallback title generator when Gemini is unreachable or offline.
 * Derives a clean 2-4 word Title Case topic without touching original message content.
 */
export function generateFallbackTitle(rawMessage: string): string {
  if (!rawMessage || typeof rawMessage !== 'string') {
    return 'General Conversation'
  }

  // Strip leading greetings, emojis, and filler words
  const cleaned = rawMessage
    .replace(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/gu, '')
    .replace(/^(hey|hi|hello|yo|bro+|uy|pre|tol|kuya|sup|good\s+(morning|afternoon|evening))\b[!,.\s]*/i, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const words = cleaned.split(' ').filter((w) => w.length > 2)

  if (words.length === 0) {
    return 'New Conversation'
  }

  const topicWords = words.slice(0, 4).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  return topicWords.join(' ')
}

/**
 * Generates a short, readable conversation title (2-5 words) from the initial conversation exchange.
 *
 * NOTE: The raw message itself is NEVER modified. Only the generated title is cleaned/formatted.
 */
export async function generateConversationTitle(
  rawVisitorMessage: string,
  rawAiResponse?: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here' || apiKey.trim() === '') {
    return generateFallbackTitle(rawVisitorMessage)
  }

  try {
    const genAI = new GoogleGenAI({ apiKey })
    const prompt = `Conversation Context:
Visitor: "${rawVisitorMessage}"
${rawAiResponse ? `AI: "${rawAiResponse.slice(0, 200)}"` : ''}

Generate a concise 2-5 word Title Case title:`

    for (const model of CANDIDATE_TITLE_MODELS) {
      try {
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Title generation timeout')), 3000),
        )

        const apiPromise = genAI.models.generateContent({
          model,
          config: {
            systemInstruction: TITLE_GENERATOR_SYSTEM_PROMPT,
            temperature: 0.2,
            maxOutputTokens: 32,
          },
          contents: prompt,
        })

        const response = (await Promise.race([apiPromise, timeoutPromise])) as any
        const titleText = response?.text?.trim()
        if (titleText && titleText.length >= 2 && titleText.length <= 60) {
          // Clean any inadvertent surrounding quotes or formatting
          const cleanTitle = titleText
            .replace(/^["'`\s]+|["'`\s]+$/g, '')
            .replace(/\n.*$/g, '')
            .trim()
          if (cleanTitle) {
            return cleanTitle
          }
        }
      } catch (err: unknown) {
        const errStr = String(err)
        if (errStr.includes('404') || errStr.includes('NOT_FOUND')) continue
        if (errStr.includes('timeout')) break
      }
    }
  } catch (err) {
    console.warn('[ConversationTitle] Failed to generate AI title:', err)
  }

  return generateFallbackTitle(rawVisitorMessage)
}
