import { GoogleGenAI } from '@google/genai'
import { getDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export interface ExtractedKnowledgeItem {
  _id?: string
  category:
    | 'skills'
    | 'personal'
    | 'education'
    | 'projects'
    | 'experience'
    | 'career'
    | 'preferences'
    | 'interests'
    | 'other'
  information: string
  source: string
  session_id: string
  conversation_id: string
  confidence: number
  reason: string
  status: 'pending_review' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

export interface ProcessingResult {
  processed_conversations_count: number
  extracted_items_count: number
  failed_conversation_count: number
  extracted_items: ExtractedKnowledgeItem[]
  message?: string
  error?: string
}

const EXTRACTION_SYSTEM_PROMPT = `You are a strict data analysis assistant for AI Jehosue.

Your task is to analyze visitor conversation logs and extract new, factual knowledge explicitly stated by Jehosue during the conversation.

STRICT RULES:
1. ONLY extract statements explicitly made by Jehosue (in the AI response) about his skills, learning goals, preferences, projects, or background.
2. NEVER treat visitor questions or visitor claims as facts about Jehosue.
3. NEVER invent or assume facts.
4. Do NOT extract generic greetings, small talk, or boilerplate portfolio descriptions that are already known.
5. If no new information is present, return an empty array [].

OUTPUT FORMAT:
Return ONLY a valid JSON array of objects with these exact keys:
[
  {
    "category": "skills" | "personal" | "education" | "projects" | "experience" | "career" | "preferences" | "interests" | "other",
    "information": "Specific fact about Jehosue stated in the conversation",
    "confidence": 0.0 to 1.0,
    "reason": "Brief explanation of why this was extracted"
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

const ALLOWED_CATEGORIES = new Set([
  'skills',
  'personal',
  'education',
  'projects',
  'experience',
  'career',
  'preferences',
  'interests',
  'other',
])

/**
 * Call Gemini with candidate model fallback
 */
async function callGeminiExtraction(
  apiKey: string,
  prompt: string,
): Promise<{ text: string; model: string }> {
  const genAI = new GoogleGenAI({ apiKey })
  let lastErr: unknown = null

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await genAI.models.generateContent({
        model,
        config: {
          systemInstruction: EXTRACTION_SYSTEM_PROMPT,
          temperature: 0.2,
          responseMimeType: 'application/json',
          maxOutputTokens: 2048,
        },
        contents: prompt,
      })

      const text = response.text?.trim() || '[]'
      return { text, model }
    } catch (err: unknown) {
      lastErr = err
      const errStr = String(err)

      // Skip immediately on 404 / NOT_FOUND
      if (errStr.includes('404') || errStr.includes('NOT_FOUND')) {
        continue
      }
      // If quota/rate limit error, wait briefly and try next model
      if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED')) {
        await new Promise((resolve) => setTimeout(resolve, 1500))
        continue
      }
    }
  }

  throw new Error(
    `All Gemini candidate models failed for extraction. Last error: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`,
  )
}

/**
 * Parses and sanitizes raw JSON output from Gemini
 */
function parseGeminiJson(rawText: string): Array<{
  category?: string
  information?: string
  confidence?: number
  reason?: string
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
    console.warn('[Knowledge Processor] Could not parse Gemini JSON output:', cleaned.slice(0, 150))
    return []
  }
}

/**
 * Main serverless processing function:
 * 1. Connects to MongoDB Atlas
 * 2. Fetches pending unprocessed conversations
 * 3. Extracts facts using Google Gemini with strict rules
 * 4. Saves candidate facts into `knowledge` collection with status 'pending_review'
 * 5. Marks conversations as processed
 * 6. Logs the batch run into `processing_logs`
 */
export async function processUnprocessedConversations(options?: {
  trigger?: 'cron' | 'manual' | 'api'
  limit?: number
  conversationId?: string
}): Promise<ProcessingResult> {
  const trigger = options?.trigger || 'manual'
  const limit = options?.limit || 30

  const db = await getDatabase()
  if (!db) {
    return {
      error: 'MongoDB database connection unavailable',
      processed_conversations_count: 0,
      extracted_items_count: 0,
      failed_conversation_count: 0,
      extracted_items: [],
    }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
    return {
      error: 'GEMINI_API_KEY is not configured',
      processed_conversations_count: 0,
      extracted_items_count: 0,
      failed_conversation_count: 0,
      extracted_items: [],
    }
  }

  const convColl = db.collection('conversations')
  const knowColl = db.collection('knowledge')
  const logColl = db.collection('processing_logs')

  // Auto-recover stale 'processing' conversations that were locked > 5 minutes ago or on server crash
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  try {
    await convColl.updateMany(
      {
        processing_status: 'processing',
        $or: [
          { locked_at: { $lt: fiveMinutesAgo } },
          { locked_at: { $exists: false } },
        ],
      },
      {
        $set: {
          processing_status: 'pending',
          processed: false,
        },
      },
    )
  } catch {
    // Non-critical recovery attempt
  }

  let unprocessed: Array<Record<string, unknown>> = []

  if (options?.conversationId) {
    try {
      const targetId = new ObjectId(options.conversationId)
      const single = await convColl.findOne({ _id: targetId })
      if (single) unprocessed = [single as Record<string, unknown>]
    } catch {
      // invalid ObjectId
    }
  } else {
    // Query for pending conversations
    const query = {
      $or: [
        { processing_status: 'pending' },
        { processing_status: { $exists: false }, processed: false },
        { processed: false, processing_status: { $nin: ['processing', 'completed'] } },
      ],
    }

    unprocessed = (await convColl.find(query).limit(limit).toArray()) as Array<Record<string, unknown>>
  }

  if (unprocessed.length === 0) {
    return {
      message: 'No pending conversations found to process.',
      processed_conversations_count: 0,
      extracted_items_count: 0,
      failed_conversation_count: 0,
      extracted_items: [],
    }
  }

  const startedAt = new Date().toISOString()
  const allExtracted: ExtractedKnowledgeItem[] = []
  let processedCount = 0
  let failedCount = 0

  for (const conv of unprocessed) {
    const convId = conv._id as ObjectId
    const visitorMsg = typeof conv.visitor_message === 'string' ? conv.visitor_message : ''
    const aiResp = typeof conv.ai_response === 'string' ? conv.ai_response : ''
    const sessionId = typeof conv.session_id === 'string' ? conv.session_id : 'unknown'

    // Skip blank conversations
    if (!visitorMsg && !aiResp) {
      await convColl.updateOne(
        { _id: convId },
        {
          $set: {
            processed: true,
            processing_status: 'skipped_empty',
            processed_at: new Date().toISOString(),
          },
        },
      )
      continue
    }

    // Lock conversation to prevent race conditions
    await convColl.updateOne(
      { _id: convId },
      { $set: { processing_status: 'processing', locked_at: new Date().toISOString() } },
    )

    try {
      const prompt = `Conversation to analyze:\n\nVisitor: ${visitorMsg}\nAI Jehosue: ${aiResp}\n`
      const { text } = await callGeminiExtraction(apiKey, prompt)
      const extractedList = parseGeminiJson(text)

      const nowIso = new Date().toISOString()
      for (const item of extractedList) {
        if (!item || !item.information || typeof item.information !== 'string') continue
        const info = item.information.trim()
        if (info.length < 3) continue

        const rawCat = (item.category || '').toLowerCase().trim()
        const category = ALLOWED_CATEGORIES.has(rawCat)
          ? (rawCat as ExtractedKnowledgeItem['category'])
          : 'other'

        const confidence =
          typeof item.confidence === 'number' && !isNaN(item.confidence)
            ? Math.min(Math.max(item.confidence, 0), 1)
            : 0.85

        const reason = typeof item.reason === 'string' ? item.reason.trim() : ''

        const knowledgeDoc: Omit<ExtractedKnowledgeItem, '_id'> = {
          category,
          information: info,
          source: 'processed_conversation',
          session_id: sessionId,
          conversation_id: convId.toString(),
          confidence,
          reason,
          status: 'pending_review',
          created_at: nowIso,
          updated_at: nowIso,
        }

        const insertRes = await knowColl.insertOne(knowledgeDoc)
        allExtracted.push({
          ...knowledgeDoc,
          _id: insertRes.insertedId.toString(),
        })
      }

      // Mark conversation completed
      await convColl.updateOne(
        { _id: convId },
        {
          $set: {
            processed: true,
            processing_status: 'completed',
            processed_at: new Date().toISOString(),
          },
        },
      )
      processedCount++
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`[Knowledge Processor] Error processing conversation ${convId}:`, errMsg)

      await convColl.updateOne(
        { _id: convId },
        {
          $set: {
            processed: false,
            processing_status: 'failed',
            processing_error: errMsg.slice(0, 500),
            failed_at: new Date().toISOString(),
          },
        },
      )
      failedCount++
    }
  }

  const completedAt = new Date().toISOString()

  // Save audit log to processing_logs collection
  try {
    await logColl.insertOne({
      started_at: startedAt,
      completed_at: completedAt,
      processed_conversations_count: processedCount,
      extracted_items_count: allExtracted.length,
      failed_conversation_count: failedCount,
      status: failedCount === 0 ? 'completed' : processedCount > 0 ? 'completed_with_errors' : 'failed',
      trigger,
    })
  } catch (logErr) {
    console.warn('[Knowledge Processor] Could not save processing log:', logErr)
  }

  return {
    processed_conversations_count: processedCount,
    extracted_items_count: allExtracted.length,
    failed_conversation_count: failedCount,
    extracted_items: allExtracted,
  }
}

/**
 * Retrieves summary statistics for admin / dashboard
 */
export async function getProcessingStats() {
  const db = await getDatabase()
  if (!db) {
    return {
      connected: false,
      unprocessedCount: 0,
      totalConversations: 0,
      pendingKnowledgeCount: 0,
      recentLogs: [],
    }
  }

  const [unprocessedCount, totalConversations, pendingKnowledgeCount, recentLogs] =
    await Promise.all([
      db.collection('conversations').countDocuments({
        $or: [
          { processing_status: 'pending' },
          { processing_status: { $exists: false }, processed: false },
        ],
      }),
      db.collection('conversations').countDocuments({}),
      db.collection('knowledge').countDocuments({ status: 'pending_review' }),
      db
        .collection('processing_logs')
        .find({})
        .sort({ completed_at: -1 })
        .limit(5)
        .toArray(),
    ])

  return {
    connected: true,
    unprocessedCount,
    totalConversations,
    pendingKnowledgeCount,
    recentLogs: recentLogs.map((log) => ({
      ...log,
      _id: log._id.toString(),
    })),
  }
}
