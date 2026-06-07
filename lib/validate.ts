/**
 * Internal runtime validators.
 * Used by API routes to catch bad data before it causes silent failures.
 * Nothing here is shown to the user — errors are caught and mapped to
 * clean error codes by each route handler.
 */
import { Flashcard } from './flashcard-types'

// ── YouTube URL ──────────────────────────────────────────────────────────────

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function assertValidUrl(url: unknown): string {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    throw new ValidationError('INVALID_URL', 'URL must be a non-empty string')
  }
  const videoId = extractVideoId(url.trim())
  if (!videoId) {
    throw new ValidationError('INVALID_URL', `Could not extract video ID from: ${url}`)
  }
  return videoId
}

// ── Transcript ───────────────────────────────────────────────────────────────

export function assertValidTranscript(transcript: unknown): string {
  if (!transcript || typeof transcript !== 'string') {
    throw new ValidationError('INVALID_TRANSCRIPT', 'Transcript must be a non-empty string')
  }
  const trimmed = transcript.trim()
  if (trimmed.length < 20) {
    throw new ValidationError('NO_CAPTIONS', 'Transcript is too short to be valid')
  }
  return trimmed
}

// ── Flashcard array ──────────────────────────────────────────────────────────

const VALID_TYPES = new Set(['vocabulary', 'phrase', 'grammar'])
const VALID_LEVELS = new Set(['beginner', 'intermediate', 'advanced'])

export function assertValidFlashcards(data: unknown): Flashcard[] {
  if (!Array.isArray(data)) {
    throw new ValidationError('INVALID_RESPONSE', 'Expected a JSON array of flashcards')
  }
  if (data.length === 0) {
    throw new ValidationError('NO_KOREAN', 'AI returned zero flashcards')
  }

  const valid: Flashcard[] = []
  for (const [i, card] of data.entries()) {
    // Hard requirements — skip malformed cards rather than crashing
    if (
      typeof card?.korean !== 'string' || card.korean.trim() === '' ||
      typeof card?.english !== 'string' || card.english.trim() === ''
    ) {
      console.warn(`[validate] Skipping card ${i}: missing korean or english`)
      continue
    }

    valid.push({
      id: typeof card.id === 'string' ? card.id : `card_${i}`,
      type: VALID_TYPES.has(card.type) ? card.type : 'vocabulary',
      korean: card.korean.trim(),
      romanisation: typeof card.romanisation === 'string' ? card.romanisation : '',
      english: card.english.trim(),
      exampleSentence: {
        korean: card.exampleSentence?.korean ?? '',
        romanisation: card.exampleSentence?.romanisation ?? '',
        english: card.exampleSentence?.english ?? '',
      },
      grammarNote: typeof card.grammarNote === 'string' ? card.grammarNote : undefined,
      difficultyLevel: VALID_LEVELS.has(card.difficultyLevel)
        ? card.difficultyLevel
        : 'intermediate',
      sourceTimestamp: typeof card.sourceTimestamp === 'string'
        ? card.sourceTimestamp
        : undefined,
      tags: Array.isArray(card.tags) ? card.tags.filter((t: unknown) => typeof t === 'string') : [],
    })
  }

  if (valid.length === 0) {
    throw new ValidationError('NO_KOREAN', 'No valid flashcards could be parsed from AI response')
  }

  return valid
}

// ── CSV rows ─────────────────────────────────────────────────────────────────

export function assertValidFlashcardsForExport(data: unknown): Flashcard[] {
  if (!Array.isArray(data) || data.length === 0) {
    throw new ValidationError('INVALID_EXPORT', 'No flashcards provided for export')
  }
  return data as Flashcard[]
}

// ── Error class ──────────────────────────────────────────────────────────────

export class ValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}
