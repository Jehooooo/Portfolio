/**
 * Trivial Message & Small Talk Filter
 *
 * Prevents saving low-value / greeting messages (e.g., "Hi", "hello", "sup", "thanks", emojis)
 * to MongoDB, saving database storage, eliminating processing noise, and preventing clutter.
 *
 * NOTE: The AI still generates and streams responses to trivial messages — only database
 * persistence is skipped.
 */

// Curated exact matches (lowercased)
const TRIVIAL_EXACT = new Set([
  // Basic greetings
  'hi',
  'hey',
  'hello',
  'sup',
  'yo',
  'howdy',
  'hola',
  'greetings',
  'wassup',
  'wazzup',
  'zup',
  'heya',
  'ello',
  'hiya',
  "g'day",
  'hi there',
  'hey there',
  'hello there',
  'good morning',
  'good afternoon',
  'good evening',
  'good night',
  'gm',
  'gn',
  'kumusta',
  'kamusta',
  'musta',

  // Acknowledgment & fillers
  'ok',
  'okay',
  'k',
  'kk',
  'alright',
  'alright then',
  'gotcha',
  'got it',
  'sure',
  'yep',
  'yup',
  'nope',
  'nah',
  'yeah',
  'yes',
  'no',
  'cge',
  'sige',
  'geh',

  // Gratitude & courtesy
  'thanks',
  'thank you',
  'ty',
  'tysm',
  'thx',
  'salamat',
  'np',
  'no problem',
  'welcome',
  "you're welcome",

  // Reactions & laughter
  'lol',
  'lmao',
  'rofl',
  'haha',
  'hahaha',
  'hehe',
  'hehehe',
  'huhu',
  'huhuhu',
  'nice',
  'cool',
  'awesome',
  'great',
  'wow',
  'omg',
  'ganda',
  'astig',

  // Testing & connectivity pings
  'test',
  'testing',
  'ping',
  'pong',
])

// Regex pattern for repeated letters in greetings and laughter (e.g. heyyyy, hiiiii, hahahaha)
const TRIVIAL_PATTERN =
  /^(h+[aeiou]+y+|h+[aeiou]+[!?. ]*|h+e+y+|h+i+|h+e+l+o+|s+u+p+|y+o+|l+o+l+|h+a+h+a+[ha]*|h+e+h+e+[he]*|h+u+h+u+[hu]*)[!?. ]*$/i

// Pure emoji strings (with optional punctuation or whitespace)
const EMOJI_ONLY_PATTERN = /^[\p{Emoji}\p{Emoji_Presentation}\p{Punctuation}\s]+$/u

/**
 * Determines whether a visitor message is trivial (greeting, filler, small talk, emoji).
 * Returns true if the message should be SKIPPED from permanent storage.
 * Returns false if the message has substance and should be STORED.
 */
export function isTrivialMessage(text: string | null | undefined): boolean {
  if (!text) return true

  // Strip non-letter punctuation for baseline evaluation
  const rawClean = text.trim()
  if (rawClean.length === 0) return true

  const lower = rawClean.toLowerCase()

  // Clean of trailing punctuation (e.g. "hi!" -> "hi", "hello???" -> "hello")
  const stripped = lower.replace(/^[!?,. ]+|[!?,. ]+$/g, '').trim()

  // 1. Ultra-short strings (<= 3 chars) unless it's a specific question or command
  if (stripped.length <= 3) {
    // Check if it's an exact allowed keyword or filler
    return true
  }

  // 2. Exact match check
  if (TRIVIAL_EXACT.has(stripped)) {
    return true
  }

  // 3. Repeated character / laugh pattern match (e.g. "heyyyy", "hahahaha")
  if (TRIVIAL_PATTERN.test(stripped)) {
    return true
  }

  // 4. Pure emoji messages (e.g. "👋", "😊", "🔥👍")
  if (EMOJI_ONLY_PATTERN.test(rawClean)) {
    // Verify it doesn't contain alphanumeric characters
    if (!/[a-zA-Z0-9]/.test(rawClean)) {
      return true
    }
  }

  // 5. Short combinations (<= 3 words where ALL words are trivial fillers)
  // e.g. "hey sup yo", "ok thanks po", "hi there hello"
  const words = stripped.split(/\s+/)
  if (words.length <= 3) {
    const allTrivial = words.every((word) => {
      const w = word.replace(/^[!?,. ]+|[!?,. ]+$/g, '')
      return TRIVIAL_EXACT.has(w) || TRIVIAL_PATTERN.test(w) || w.length <= 2
    })
    if (allTrivial) {
      return true
    }
  }

  // If none of the trivial conditions match, it has substance!
  return false
}
