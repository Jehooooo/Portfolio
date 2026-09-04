import { getDatabase } from './mongodb'
import { ObjectId } from 'mongodb'

export interface VisitorMemory {
  _id?: string
  visitor_id: string
  memory_type:
    | 'identity'
    | 'relationship'
    | 'interest'
    | 'preference'
    | 'background'
    | 'conversation_context'
  key: string
  value: string
  confidence: number
  source_session_id?: string
  raw_statement?: string
  status: 'active' | 'archived' | 'rejected'
  created_at: string
  updated_at: string
}

export interface VisitorProfile {
  _id?: string
  visitor_id: string
  display_name?: string
  relationship?: string
  key_interests: string[]
  first_seen: string
  last_seen: string
  total_messages: number
  total_sessions: number
  summary_notes?: string
}

/**
 * Retrieves all active, high-confidence memories for a given visitor.
 */
export async function getVisitorMemories(visitorId: string): Promise<VisitorMemory[]> {
  if (!visitorId || visitorId === 'anonymous-visitor') return []

  try {
    const db = await getDatabase()
    if (!db) return []

    const docs = await db
      .collection('visitor_memories')
      .find({
        visitor_id: visitorId,
        status: 'active',
        confidence: { $gte: 0.75 },
      })
      .sort({ updated_at: -1 })
      .limit(20)
      .toArray()

    return docs.map((doc) => ({
      _id: doc._id.toString(),
      visitor_id: doc.visitor_id,
      memory_type: doc.memory_type,
      key: doc.key,
      value: doc.value,
      confidence: doc.confidence,
      source_session_id: doc.source_session_id,
      raw_statement: doc.raw_statement,
      status: doc.status || 'active',
      created_at: doc.created_at || new Date().toISOString(),
      updated_at: doc.updated_at || new Date().toISOString(),
    }))
  } catch (err) {
    console.warn('[VisitorMemory] Failed to retrieve memories for visitor:', err)
    return []
  }
}

/**
 * Retrieves aggregated profile for a visitor.
 */
export async function getVisitorProfile(visitorId: string): Promise<VisitorProfile | null> {
  if (!visitorId || visitorId === 'anonymous-visitor') return null

  try {
    const db = await getDatabase()
    if (!db) return null

    const doc = await db.collection('visitor_profiles').findOne({ visitor_id: visitorId })
    if (!doc) return null

    return {
      _id: doc._id.toString(),
      visitor_id: doc.visitor_id,
      display_name: doc.display_name,
      relationship: doc.relationship,
      key_interests: Array.isArray(doc.key_interests) ? doc.key_interests : [],
      first_seen: doc.first_seen || new Date().toISOString(),
      last_seen: doc.last_seen || new Date().toISOString(),
      total_messages: doc.total_messages || 0,
      total_sessions: doc.total_sessions || 1,
      summary_notes: doc.summary_notes,
    }
  } catch (err) {
    console.warn('[VisitorMemory] Failed to retrieve visitor profile:', err)
    return null
  }
}

/**
 * Upserts a single visitor memory item to prevent duplicate keys.
 */
export async function upsertVisitorMemory(item: {
  visitor_id: string
  memory_type: VisitorMemory['memory_type']
  key: string
  value: string
  confidence: number
  source_session_id?: string
  raw_statement?: string
}): Promise<void> {
  if (!item.visitor_id || item.visitor_id === 'anonymous-visitor') return

  try {
    const db = await getDatabase()
    if (!db) return

    const nowIso = new Date().toISOString()

    await db.collection('visitor_memories').updateOne(
      {
        visitor_id: item.visitor_id,
        key: item.key,
      },
      {
        $set: {
          value: item.value,
          memory_type: item.memory_type,
          confidence: item.confidence,
          source_session_id: item.source_session_id,
          raw_statement: item.raw_statement,
          status: 'active',
          updated_at: nowIso,
        },
        $setOnInsert: {
          created_at: nowIso,
        },
      },
      { upsert: true },
    )
  } catch (err) {
    console.warn('[VisitorMemory] Failed to upsert memory:', err)
  }
}

/**
 * Updates or records visitor profile stats on each active session.
 */
export async function recordVisitorInteraction(
  visitorId: string,
  sessionId: string,
  updates?: {
    display_name?: string
    relationship?: string
    new_interest?: string
  },
): Promise<void> {
  if (!visitorId || visitorId === 'anonymous-visitor') return

  try {
    const db = await getDatabase()
    if (!db) return

    const nowIso = new Date().toISOString()
    const setFields: Record<string, unknown> = {
      last_seen: nowIso,
    }

    if (updates?.display_name) {
      setFields.display_name = updates.display_name
    }
    if (updates?.relationship) {
      setFields.relationship = updates.relationship
    }

    const updateQuery: Record<string, unknown> = {
      $set: setFields,
      $inc: { total_messages: 1 },
      $addToSet: {
        sessions_seen: sessionId,
      },
      $setOnInsert: {
        visitor_id: visitorId,
        first_seen: nowIso,
        key_interests: [],
      },
    }

    if (updates?.new_interest) {
      updateQuery.$addToSet = {
        ...(updateQuery.$addToSet as Record<string, unknown>),
        key_interests: updates.new_interest,
      }
    }

    await db.collection('visitor_profiles').updateOne(
      { visitor_id: visitorId },
      updateQuery,
      { upsert: true },
    )
  } catch (err) {
    console.warn('[VisitorMemory] Failed to record visitor interaction:', err)
  }
}

/**
 * Formats retrieved memories and profile into a concise context block
 * for direct injection into getSystemInstruction().
 *
 * Enforces strict anti-madaldal and natural interaction rules.
 */
export function formatVisitorContextForPrompt(
  memories: VisitorMemory[],
  profile: VisitorProfile | null,
): string {
  if ((!memories || memories.length === 0) && !profile?.display_name && !profile?.relationship) {
    return ''
  }

  const lines: string[] = []

  // Identity
  const name = profile?.display_name || memories.find((m) => m.key === 'name')?.value
  if (name) {
    lines.push(`- Recognized Visitor Name: ${name}`)
  }

  // Relationship
  const relationship =
    profile?.relationship ||
    memories.find((m) => m.key === 'relationship_to_jeho')?.value
  if (relationship) {
    lines.push(`- Explicit Relationship to Jeho: ${relationship}`)
  }

  // Interests
  const interests = new Set<string>(profile?.key_interests || [])
  for (const m of memories) {
    if (m.memory_type === 'interest') {
      interests.add(m.value)
    }
  }
  if (interests.size > 0) {
    lines.push(`- Known Interests: ${Array.from(interests).slice(0, 5).join(', ')}`)
  }

  // Background / Occupation / School
  const bgMem = memories.find((m) => m.memory_type === 'background')
  if (bgMem) {
    lines.push(`- Background: ${bgMem.value}`)
  }

  if (lines.length === 0) {
    return ''
  }

  return `RETURNING VISITOR CONTEXT (YOU REMEMBER THIS PERSON):
${lines.join('\n')}

STRICT GUIDELINES FOR USING VISITOR MEMORY (NATURAL & NOT "MADALDAL"):
1. GREETING & RECOGNITION:
   - If they introduce themselves (e.g. "Hey, I'm Mark") or say hello, acknowledge them warmly and naturally (e.g. "Hey Mark! Good to see you again 😭").
   - If they ask "Do you remember me?", answer directly and casually (e.g. "Yeah, you're Mark, right? You mentioned before that you're one of Jeho's friends.").
2. DO NOT DUMP OR RECITE MEMORY:
   - NEVER list all remembered details unprompted (BAD: "According to my records, you are Mark, Jeho's friend, who likes Valorant and studies IT.").
   - NEVER mention "my database", "my records", "my memory logs", or "stored information".
3. CONCISE & CASUAL:
   - Answer their questions directly. Remembering context does NOT mean talking more or writing longer paragraphs.
   - Let the conversation flow naturally. Do not interrogate them or ask unnecessary follow-up questions.`
}
