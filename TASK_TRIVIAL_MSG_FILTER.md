# 🚫 Task: Skip Storing Trivial / Greeting Messages in MongoDB

**Project:** Jehosue (Jeho) Biscarra — Portfolio & AI Platform  
**Status:** 📋 Pending  
**Created:** September 4, 2026  
**Priority:** P1 — Quality / Cost Optimization

---

## 📌 Context & Problem

Currently, **every** single chat message — including greetings like `"Hi"`, `"Hello"`, `"hey"`, `"sup"`, `"yo"`, etc. — gets saved to the `conversations` collection in MongoDB Atlas.

This creates several problems:

| Problem | Impact |
|---------|--------|
| 🗃️ **Database pollution** | Useless records bloat the `conversations` collection |
| 💰 **MongoDB Atlas storage cost** | Every trivial message wastes a document write operation |
| 🤖 **Knowledge processor noise** | The cron-job AI processor wastes Gemini API tokens analyzing empty greetings |
| 📊 **Skewed admin analytics** | Conversation count metrics inflate with non-informative records |

### Example Messages That Should **NOT** Be Stored:

```
hi
hello
hey
heyy
hey there
sup
what's up
yo
howdy
good morning
good afternoon
good evening
good night
hiii
hello there
hi there
hola
greetings
wassup
wazzup
okay
ok
thanks
thank you
ty
np
no problem
lol
lmao
haha
nice
cool
👋
😊
```

---

## 🎯 Objective

Add a **trivial message filter** inside `app/api/chat/route.ts` that:

1. Detects if the **last user message** is a trivial/greeting/filler message.
2. If trivial → **still generates and returns the AI response** (normal behavior) but **skips the `saveConversation()` call**.
3. If non-trivial → saves conversation to MongoDB as before.

> ⚠️ **Important:** The AI should **always respond** to the user. This filter only affects whether the exchange is persisted to the database — the user experience must remain unchanged.

---

## 🛠️ Implementation Plan

### Step 1 — Create `lib/trivial-message-filter.ts`

Create a new utility module that exports a single function: `isTrivialMessage(text: string): boolean`.

**Detection strategy (in order of precedence):**

1. **Length check** — If the cleaned message is ≤ 3 characters → trivial.
2. **Exact match list** — A curated set of lowercase greeting/filler words.
3. **Regex pattern** — Patterns for common variations (e.g., `heyyy`, `hiiii`, `heyyyy`).
4. **Emoji-only check** — If the message consists only of emojis/whitespace → trivial.
5. **Word count + known filler** — If ≤ 2 words AND both are in a filler word list → trivial.

```typescript
// lib/trivial-message-filter.ts

const TRIVIAL_EXACT = new Set([
  'hi', 'hey', 'hello', 'sup', 'yo', 'howdy', 'hola', 'greetings', 'wassup',
  'wazzup', 'heya', 'ello', 'hiya', 'g\'day', 'hi there', 'hey there',
  'hello there', 'good morning', 'good afternoon', 'good evening', 'good night',
  'gm', 'gn', 'ok', 'okay', 'k', 'kk', 'thanks', 'thank you', 'ty',
  'np', 'no problem', 'lol', 'lmao', 'haha', 'hehe', 'nice', 'cool',
  'awesome', 'great', 'wow', 'omg', 'yep', 'yup', 'nope', 'nah', 'yeah',
  'yes', 'no', 'sure', 'alright', 'alright then', 'gotcha', 'got it',
])

const TRIVIAL_PATTERN = /^(h[aeiou]+y+|h[aeiou]+[!?. ]*|hey+|hi+|hello+|sup+|yo+|lol+|haha+|hehe+|heyyy+)[!?. ]*$/i

const EMOJI_ONLY_PATTERN = /^[\p{Emoji}\p{Emoji_Presentation}\s]+$/u

export function isTrivialMessage(text: string): boolean {
  const clean = text.trim().toLowerCase()

  // 1. Too short
  if (clean.length <= 3) return true

  // 2. Exact match
  if (TRIVIAL_EXACT.has(clean)) return true

  // 3. Regex pattern (handles heyyyy, hiiiii, etc.)
  if (TRIVIAL_PATTERN.test(clean)) return true

  // 4. Emoji-only
  if (EMOJI_ONLY_PATTERN.test(text.trim())) return true

  // 5. Short (≤ 2 words) and both are filler
  const words = clean.split(/\s+/)
  if (words.length <= 2 && words.every(w => TRIVIAL_EXACT.has(w))) return true

  return false
}
```

---

### Step 2 — Modify `app/api/chat/route.ts`

**Only 2 changes are needed:**

#### 2a. Import the filter at the top

```typescript
import { isTrivialMessage } from '@/lib/trivial-message-filter'
```

#### 2b. Add the trivial check before the `saveConversation()` calls

There are **two places** where `saveConversation()` is called:

**Location 1** — Easter egg handler (line ~141):
```typescript
// Before:
saveConversation({ ... })

// After: (Easter egg messages are always non-trivial, keep as-is)
// No change needed here — easter egg is intentional.
```

**Location 2** — Gemini stream end handler (line ~276):
```typescript
// Before:
if (fullResponseText.trim()) {
  const cleanAiText = sanitizeAiOutput(fullResponseText.trim())
  saveConversation({
    sessionId,
    visitorMessage: lastMessage,
    aiResponse: cleanAiText,
    model: usedModel,
  }).catch(...)
}

// After:
if (fullResponseText.trim() && !isTrivialMessage(lastMessage)) {
  const cleanAiText = sanitizeAiOutput(fullResponseText.trim())
  saveConversation({
    sessionId,
    visitorMessage: lastMessage,
    aiResponse: cleanAiText,
    model: usedModel,
  }).catch(...)
}
```

> **Note:** If the Python backend path (`pyRes.ok`) also saves conversations in the backend Flask server, consider passing a `should_save: boolean` flag in the request body — or handle it purely on the Next.js side by not saving on that path too.

---

## 📁 Files to Change

| File | Action | Description |
|------|--------|-------------|
| `lib/trivial-message-filter.ts` | **[NEW]** | Utility function with all trivial message detection logic |
| `app/api/chat/route.ts` | **[MODIFY]** | Import + add `isTrivialMessage()` guard before `saveConversation()` |

---

## ✅ Verification Checklist

After implementation, test these scenarios:

### Should NOT be saved to MongoDB:
- [ ] `"hi"` → responds, no DB write
- [ ] `"Hello"` → responds, no DB write
- [ ] `"hey there"` → responds, no DB write
- [ ] `"heyyyyy"` → responds, no DB write
- [ ] `"sup"` → responds, no DB write
- [ ] `"thanks"` → responds, no DB write
- [ ] `"ok"` → responds, no DB write
- [ ] `"😊"` (emoji only) → responds, no DB write
- [ ] `"lol"` → responds, no DB write
- [ ] `"good morning"` → responds, no DB write

### SHOULD be saved to MongoDB:
- [ ] `"Tell me about Jeho's projects"` → responds, DB write ✅
- [ ] `"What stack does Jeho use?"` → responds, DB write ✅
- [ ] `"Who is Jehosue Biscarra?"` → responds, DB write ✅
- [ ] `"How can I contact Jeho?"` → responds, DB write ✅
- [ ] `"What is his experience with AI?"` → responds, DB write ✅

### Edge Cases:
- [ ] `"hi, tell me about yourself"` — This has substance → **SHOULD be saved** ✅
- [ ] `"hello! what projects has Jeho built?"` — Has substance → **SHOULD be saved** ✅
- [ ] `"hey sup yo"` — All filler words, 3 words but each trivial → **NOT saved** ❌

---

## 🧪 Quick Manual Test (After Deploy)

1. Open chat on the live site.
2. Send `"hi"` → Verify no new document in MongoDB Atlas `conversations` collection.
3. Send `"Tell me about Jeho's experience"` → Verify new document IS saved.
4. Check MongoDB Atlas UI or run Admin dashboard to confirm counts.

---

## 📋 Execution Status

- [ ] Create `lib/trivial-message-filter.ts`
- [ ] Modify `app/api/chat/route.ts` — import + guard
- [ ] Local test: trivial messages skipped, meaningful messages saved
- [ ] Commit: `feat(chat): skip storing trivial greeting messages in MongoDB`
- [ ] Deploy to Vercel
- [ ] Verify live behavior on MongoDB Atlas
