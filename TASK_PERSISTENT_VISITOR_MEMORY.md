# 🧠 Task Specification: Persistent Visitor Memory & Returning Visitor Recognition

**Project:** Jehosue (Jeho) Biscarra — Portfolio & AI Platform  
**Feature:** Persistent Visitor Memory, Trivial Message Filter & Returning Visitor Recognition  
**Status:** 📋 Ready for Implementation  
**Created:** September 4, 2026  
**Priority:** P0 — Core AI Experience & Persona Quality  

---

## 🎯 Executive Summary & Core Principle

> ### 💡 Core Principle
> **"Remember the visitor, not every word they say."**  
> The AI should feel like it genuinely recognizes people it has chatted with before, while remaining natural, respectful, privacy-conscious, and concise.

Currently, every chat starts completely from scratch. If a friend or recurring visitor introduces themselves ("I'm Mark, Jeho's friend from college"), that context disappears when their session ends or when they refresh their browser. Furthermore, every trivial greeting ("Hi", "Hello", "sup") is logged indiscriminately into MongoDB.

### The Objective:
1. **Filter Trivial Messages:** Do **not** store empty greetings, filler words, or small talk in MongoDB.
2. **Persistent Anonymous Visitor Identity:** Assign a persistent, privacy-preserving `visitor_id` (via `localStorage`) that survives browser restarts and sessions.
3. **Selective Long-Term Memory Extraction:** Extract only factual, voluntarily shared visitor information (identity, explicit relationships to Jeho, interests, background) with strict anti-hallucination thresholds.
4. **Returning Visitor Recognition:** When a recognized visitor returns, seamlessly retrieve their memories and adapt the conversation naturally—**without** being overly talkative ("madaldal") or robotic.

---

## 🏗️ End-to-End System Architecture

```
                                  [ VISITOR'S BROWSER ]
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               ▼                                                         ▼
       [ localStorage ]                                         [ sessionStorage ]
  Persistent `visitor_id`                                   Ephemeral `session_id`
   (e.g., vis-178850...abc)                                 (e.g., session-178850...)
               │                                                         │
               └────────────────────────────┬────────────────────────────┘
                                            │
                                            ▼
                           [ POST /api/chat ]
                        Payload: { visitor_id, session_id, messages }
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
          [ 1. Trivial Check ]                          [ 2. Memory Retrieval ]
         `isTrivialMessage()`                        Fetch `visitor_memories` from
    (e.g., "hi", "sup", "hello")                     MongoDB for this `visitor_id`
                     │                                             │
      ┌──────────────┴──────────────┐                              │
      ▼                             ▼                              │
[ IS TRIVIAL ]             [ NON-TRIVIAL ]                         │
Skip DB insert;            Log to MongoDB                          │
Process stream only        `conversations`                         │
                                    │                              │
                                    └──────────────┬───────────────┘
                                                   ▼
                                     [ 3. Prompt Construction ]
                                 `getSystemInstruction(dynamicKnowledge, visitorContext)`
                                 Inject: Name, relationship, verified interests
                                 Rules: Be concise, direct, never dump raw DB
                                                   │
                                                   ▼
                                         [ 4. Gemini Streaming ]
                                       Returns natural, warm answer
                                                   │
                                                   ▼
                                  [ 5. Post-Stream Memory Extraction ]
                                   (Background / Serverless Execution)
                               Analyzes visitor message for useful facts:
                               * "I'm Mark, Jeho's classmate"
                                 → { key: "name", value: "Mark" }
                                 → { key: "relationship_to_jeho", value: "classmate" }
                                                   │
                                                   ▼
                                     [ MongoDB: visitor_memories ]
```

---

## 🗄️ Database Schema & Storage Design

In accordance with architectural guidelines: **reuse existing collections and extend models cleanly** without redundant duplication.

### 1. Existing Collection: `conversations` (Extended)
Stored in MongoDB Atlas `portfolio.conversations`:
```typescript
interface ConversationDocument {
  _id?: ObjectId
  visitor_id: string          // Persistent visitor identifier (NEW)
  session_id: string          // Ephemeral session ID
  visitor_message: string     // Sanitized visitor input
  ai_response: string         // Cleaned AI response
  timestamp: string           // ISO-8601 UTC timestamp
  processed: boolean          // Whether processed by memory extractor
  processing_status: 'pending' | 'processing' | 'completed' | 'skipped_trivial' | 'failed'
  has_memories_extracted?: boolean // Flag if memory was added
  metadata: {
    model: string
    source: string
    ip_hash?: string
  }
}
```

### 2. New Collection: `visitor_memories`
Stored in MongoDB Atlas `portfolio.visitor_memories`:
```typescript
interface VisitorMemoryDocument {
  _id?: ObjectId
  visitor_id: string          // Indexed, references the visitor
  memory_type: 
    | 'identity'              // e.g. name, nickname
    | 'relationship'          // e.g. friend, classmate, colleague, client
    | 'interest'              // e.g. gaming, video editing, badminton
    | 'preference'            // e.g. prefers Tagalog, likes tech discussions
    | 'background'            // e.g. BSCS student, fellow developer
    | 'conversation_context'  // e.g. asked about disaster report project
  key: string                 // e.g. "visitor_name", "relationship_to_jeho", "favorite_game"
  value: string               // e.g. "Mark", "friend", "Valorant"
  confidence: number          // 0.0 to 1.0 (threshold >= 0.80)
  source_session_id: string   // Session where this was shared
  raw_statement: string       // Original snippet (for audit & grounding)
  status: 'active' | 'archived' | 'rejected'
  created_at: string          // ISO timestamp
  updated_at: string          // ISO timestamp
}
```

### 3. New Collection: `visitor_profiles` (Fast Lookups)
Aggregated profile per visitor to avoid heavy queries on every chat message:
```typescript
interface VisitorProfileDocument {
  _id?: ObjectId
  visitor_id: string          // Unique index
  display_name?: string       // Extracted name (e.g. "Mark")
  relationship?: string       // e.g. "Friend", "Classmate"
  key_interests: string[]     // e.g. ["Gaming", "Valorant"]
  first_seen: string          // ISO timestamp
  last_seen: string           // ISO timestamp
  total_messages: number
  total_sessions: number
  summary_notes?: string      // 1-2 sentence AI summary of visitor profile
}
```

---

## 🚫 Part 1: Trivial Message Filter (Zero DB Waste)

Messages that carry **no conversational context or long-term value** must be answered by the AI but **skipped from MongoDB storage**.

### Filter Rules & Implementation (`lib/trivial-message-filter.ts`)
```typescript
// Curated list of exact trivial phrases
const TRIVIAL_EXACT = new Set([
  'hi', 'hey', 'hello', 'sup', 'yo', 'howdy', 'hola', 'greetings', 'wassup',
  'wazzup', 'heya', 'ello', 'hiya', 'g\'day', 'hi there', 'hey there',
  'hello there', 'good morning', 'good afternoon', 'good evening', 'good night',
  'gm', 'gn', 'ok', 'okay', 'k', 'kk', 'thanks', 'thank you', 'ty',
  'np', 'no problem', 'lol', 'lmao', 'haha', 'hehe', 'nice', 'cool',
  'awesome', 'great', 'wow', 'omg', 'yep', 'yup', 'nope', 'nah', 'yeah',
  'yes', 'no', 'sure', 'alright', 'alright then', 'gotcha', 'got it',
  'test', 'testing', 'ping', 'pong'
])

// Pattern for repeated characters (e.g. heyyyy, hiiiii, haha, lol)
const TRIVIAL_PATTERN = /^(h[aeiou]+y+|h[aeiou]+[!?. ]*|hey+|hi+|hello+|sup+|yo+|lol+|haha+|hehe+|heyyy+)[!?. ]*$/i

// Emoji-only messages
const EMOJI_ONLY_PATTERN = /^[\p{Emoji}\p{Emoji_Presentation}\s]+$/u

export function isTrivialMessage(text: string): boolean {
  if (!text) return true
  const clean = text.trim().toLowerCase()

  // 1. Very short string (<= 3 characters)
  if (clean.length <= 3) return true

  // 2. Exact match from trivial dictionary
  if (TRIVIAL_EXACT.has(clean)) return true

  // 3. Repeated character greeting / laughter regex
  if (TRIVIAL_PATTERN.test(clean)) return true

  // 4. Pure emoji string (e.g. "👋", "😊", "🔥")
  if (EMOJI_ONLY_PATTERN.test(clean)) return true

  // 5. Short combinations (<= 2 words where all words are trivial, e.g. "hey sup", "ok thanks")
  const words = clean.split(/\s+/)
  if (words.length <= 2 && words.every((w) => TRIVIAL_EXACT.has(w))) {
    return true
  }

  return false
}
```

### Critical Guard in `app/api/chat/route.ts`:
```typescript
if (fullResponseText.trim() && !isTrivialMessage(lastMessage)) {
  saveConversation({
    visitorId,
    sessionId,
    visitorMessage: lastMessage,
    aiResponse: cleanAiText,
    model: usedModel,
  }).catch((err) => console.warn('[MongoDB] Save conversation error:', err))
}
```

---

## 🆔 Part 2: Persistent Visitor Identity Architecture

### Browser-Side Implementation (`components/ai-chat.tsx`)
1. **Persistent `visitor_id` (Lifetime):** Stored in `localStorage` under `ai_jehosue_visitor_id`.
   - Generated once via cryptographically random UUID / timestamp: `vis-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`.
   - Never expires unless user explicitly clears browser data.
2. **Session `session_id` (Tab Lifecycle):** Stored in `sessionStorage` under `ai_jehosue_session_id`.
   - Regenerates whenever the tab or browser window is closed.
3. **Payload Transmitted to API:**
```typescript
body: JSON.stringify({
  visitor_id: visitorId,
  session_id: sessionId,
  messages: validatedMessages,
})
```

---

## 🔍 Part 3: Selective Visitor Memory Extraction Engine

### What to Store vs. What to Reject:

| Category | Visitor Statement | Extracted? | Memory Stored |
|---|---|---|---|
| **Identity** | *"I'm Jeho's friend, Mark."* | ✅ YES | `name: "Mark"`, `relationship: "Friend"` |
| **Relationship** | *"We were classmates in college at DMMMSU."* | ✅ YES | `relationship: "Classmate"`, `background: "DMMMSU"` |
| **Interest** | *"I usually talk to Jeho about gaming and Valorant."* | ✅ YES | `interest: "Gaming"`, `interest: "Valorant"` |
| **Career** | *"I work as a React developer in Manila."* | ✅ YES | `background: "React developer"` |
| **Casual state** | *"I'm tired today."* | ❌ NO | None (temporary feeling) |
| **Weather** | *"It's raining here."* | ❌ NO | None (fleeting observation) |
| **Food** | *"I'm eating dinner."* | ❌ NO | None (momentary activity) |
| **Laughter** | *"LOL 😂"* | ❌ NO | None (reaction) |
| **Vague link** | *"I know Jeho."* | ⚠️ CAUTION | Does **NOT** become "Friend". Only store as acquaintance if relevant. |

### Strict Relationship Rules:
Do **not** automatically assume friendship:
- *"I know Jeho"* &rarr; Do **not** classify as "Friend".
- Only classify as `Friend`, `Classmate`, `Colleague`, `Client`, or `Teammate` if explicitly stated by the visitor.

### Gemini Memory Extraction Prompt:
```typescript
const VISITOR_EXTRACTION_SYSTEM_PROMPT = `You are a precise, privacy-conscious visitor memory extractor for Jehosue's portfolio AI.

Your task is to analyze the visitor's messages and extract USEFUL, LONG-TERM personal facts voluntarily shared by the visitor.

CORE PRINCIPLES:
1. ONLY extract explicitly stated facts. NEVER assume, guess, or infer unmentioned details.
2. "I know Jeho" does NOT mean "Friend". Only record relationships explicitly claimed (e.g., "I'm his classmate", "I'm Jeho's friend Mark").
3. DO NOT store temporary states ("I'm tired", "I'm eating", "having a good day").
4. DO NOT store passwords, credentials, API keys, or financial data.
5. If no lasting personal information was shared, return an empty array [].

ALLOWED CATEGORIES:
- "identity" (name, nickname)
- "relationship" (friend, classmate, colleague, teammate, client, family)
- "interest" (hobbies, specific games, technologies they like)
- "preference" (communication preference, language)
- "background" (their profession, school, work field)

OUTPUT FORMAT:
Return ONLY a valid JSON array:
[
  {
    "memory_type": "identity" | "relationship" | "interest" | "preference" | "background",
    "key": "name" | "relationship_to_jeho" | "interest" | "occupation" | "school",
    "value": "Extracted fact value",
    "confidence": 0.8 to 1.0,
    "raw_statement": "Exact quote from the visitor"
  }
]
`
```

---

## 🗣️ Part 4: Natural & Concise Returning Visitor Recognition

### The "Don't Be Madaldal" Rules (Tone & Persona Balance)

When a returning visitor is recognized:
1. **Never dump the database:**  
   ❌ *Bad:* "Hello Mark! According to my database, you are a friend of Jeho, you attend DMMMSU, you play Valorant, and we talked 3 days ago."  
   ✅ *Good:* "Hey Mark! Good to see you again 😭 What's up?"
2. **Use memories contextually, not proactively:**  
   If the visitor asks: *"Do you remember me?"*  
   ✅ *Good:* "Yeah, you're Mark, right? We talked about gaming and you mentioned you're one of Jeho's friends."
3. **No robotic memory disclaimers:** Never say "Based on my memory logs" or "My records show".
4. **Concise answers:** Answer the question directly without padding or asking unnecessary follow-up questions.

### System Prompt Injection (`lib/jehosue-knowledge.ts`):
```typescript
export function getSystemInstruction(
  dynamicKnowledge?: string,
  visitorContext?: string
): string {
  const visitorSection = visitorContext && visitorContext.trim().length > 0
    ? `\n\n═══════════════════════════════════════════════════════════════════\nRETURNING VISITOR CONTEXT (USE NATURALLY — DO NOT RECITE)\n═══════════════════════════════════════════════════════════════════\n${visitorContext.trim()}\n`
    : ''

  // ... (Full persona guidelines with anti-madaldal guardrails)
}
```

### Formatted Visitor Context Injection:
```markdown
RETURNING VISITOR CONTEXT:
- Visitor Name: Mark
- Relationship to Jeho: Friend / College Classmate
- Known Interests: Gaming (Valorant)
- Total Previous Visits: 2

CRITICAL BEHAVIOR:
- Greet them warmly and naturally if appropriate.
- Do NOT list all their details unprompted.
- Only reference their background if it naturally fits the conversation.
- Keep your reply concise and authentic to Jeho's voice.
```

---

## 🛡️ Part 5: Privacy, Security & Sanitization

1. **Zero Secret Storage:** Passwords, API keys, tokens, and financial data are filtered out prior to storage.
2. **Confidence Threshold:** Any extracted memory item with `confidence < 0.80` is automatically discarded.
3. **Visitor Deduplication:** Memories for the same `visitor_id` with matching `key` are updated (upserted) rather than creating duplicate redundant records.
4. **Visitor Data Isolation:** Memory queries strictly filter by `visitor_id`. Visitors never see or access another visitor's memories.

---

## 📁 Files to Create / Modify

| Component | File Path | Action | Description |
|---|---|---|---|
| **Trivial Filter** | `lib/trivial-message-filter.ts` | **[NEW]** | Filters greetings, filler, emojis from DB writes |
| **Visitor Memory Model** | `lib/visitor-memory.ts` | **[NEW]** | MongoDB helpers to get/save memories and visitor profiles |
| **Visitor Extractor** | `lib/visitor-extractor.ts` | **[NEW]** | Gemini analysis to extract useful visitor facts |
| **Knowledge Base** | `lib/jehosue-knowledge.ts` | **[MODIFY]** | Support `visitorContext` injection with anti-madaldal rules |
| **Chat API** | `app/api/chat/route.ts` | **[MODIFY]** | Fetch memories, inject to prompt, skip trivial msgs, run extractor |
| **Frontend Chat** | `components/ai-chat.tsx` | **[MODIFY]** | Add persistent `visitor_id` in `localStorage` & pass to API |
| **Admin Dashboard** | `app/admin/page.tsx` | **[MODIFY]** | Add Visitor Memory count & inspector in Admin Console |

---

## ✅ MVP Verification Checklist & Acceptance Criteria

- [ ] **1. Trivial Message Exclusion:**
  - [ ] Sending `"hi"`, `"hello"`, `"sup"`, `"thanks"`, `"ok"`, `"👋"` returns AI response without inserting into `conversations` collection.
- [ ] **2. Persistent Visitor ID:**
  - [ ] `visitor_id` is created in `localStorage` and persists across browser tab closures and reloads.
- [ ] **3. Selective Extraction:**
  - [ ] `"I'm Jeho's friend, Mark."` &rarr; Extracts `{ key: "name", value: "Mark" }` and `{ key: "relationship_to_jeho", value: "friend" }`.
  - [ ] `"I'm Mark, we were classmates in college."` &rarr; Extracts `{ key: "name", value: "Mark" }` and `{ key: "relationship_to_jeho", value: "classmate" }`.
  - [ ] `"I usually talk to Jeho about gaming."` &rarr; Extracts `{ key: "interest", value: "gaming" }`.
  - [ ] `"I'm tired today"` &rarr; Does **NOT** extract or store permanent memory.
- [ ] **4. Explicit Relationships Only:**
  - [ ] `"I know Jeho"` does **not** become `"friend"`.
- [ ] **5. Returning Visitor Recognition:**
  - [ ] When the same visitor opens a new session and chats, the AI naturally acknowledges them (e.g., `"Hey Mark! Good to see you again"`).
- [ ] **6. Tone & Verbosity ("Not Madaldal"):**
  - [ ] AI does not dump the database or sound robotic.
  - [ ] Answers remain concise, direct, and conversational.
- [ ] **7. Privacy & Safety:**
  - [ ] No sensitive credentials, keys, or private data stored.
- [ ] **8. Existing Stability:**
  - [ ] Rate limiter, security sanitization, and easter egg rules remain 100% operational.

---

## 🚀 Execution Command
When ready to execute this implementation, proceed directly with:
> **"now do it"**
