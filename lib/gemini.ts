import { GoogleGenerativeAI } from '@google/generative-ai'
import { Flashcard } from './flashcard-types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const SYSTEM_PROMPT = `You are a Korean language teacher specialising in advanced learners who have reached native-level fluency.
You will receive a YouTube video transcript. Your job is to:

1. Identify the most nuanced, sophisticated, and interesting Korean words, phrases, and grammar patterns
2. For advanced learners: focus on idiomatic expressions, Sino-Korean (한자어) vs native Korean (고유어) vocabulary distinctions, subtle speech level differences (해요체 vs 합쇼체 vs 해체), advanced connective endings, and literary/formal forms
3. For food/cooking content: include ingredient names with their Sino-Korean and native Korean variants, cooking verbs, taste descriptors, and food culture terms
4. Include the romanisation (Revised Romanization of Korean) for every Korean string
5. Write grammar notes that explore nuance, etymology, register, and real-world usage — treat the learner as near-native
6. Tag each card accurately: use tags like idiom, 한자어, 고유어, honorific, colloquial, formal, literary, connective-ending, dialect, onomatopoeia, etc.
7. Return ONLY a valid JSON array — no markdown fences, no preamble, no trailing text

Difficulty calibration:
- beginner: high-frequency single words, basic greetings, common verbs
- intermediate: sentence patterns, standard politeness markers, particles with nuance
- advanced: idiomatic expressions, formal speech, complex grammar, register-specific vocabulary, nuanced particles

Return between 15 and 30 flashcards. Prioritise depth, nuance, and practical utility for an advanced learner.

Each flashcard MUST follow this exact JSON structure (no extra fields):
{
  "id": "unique_string_id",
  "type": "vocabulary",
  "korean": "Korean text here",
  "romanisation": "romanised pronunciation",
  "english": "English translation",
  "exampleSentence": {
    "korean": "Full example sentence in Korean",
    "romanisation": "Romanised example sentence",
    "english": "English translation of example"
  },
  "grammarNote": "Optional detailed grammar/usage note (omit field if not applicable)",
  "difficultyLevel": "advanced",
  "sourceTimestamp": "2:34",
  "tags": ["tag1", "tag2"]
}

type must be one of: "vocabulary", "phrase", "grammar"
difficultyLevel must be one of: "beginner", "intermediate", "advanced"`

export async function generateFlashcards(
  transcript: string,
  videoTitle: string
): Promise<Flashcard[]> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-lite',
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 8192,
    },
  })

  const userMessage = `${SYSTEM_PROMPT}

Transcript from YouTube video titled "${videoTitle}":

${transcript.slice(0, 12000)}

Generate Korean flashcards from this content. Return only the JSON array.`

  const result = await model.generateContent(userMessage)
  const raw = result.response.text()

  // Strip any accidental markdown fences
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // Try to extract JSON array from response
    const match = cleaned.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('Could not parse Gemini response as JSON')
    parsed = JSON.parse(match[0])
  }

  if (!Array.isArray(parsed)) throw new Error('Response is not a JSON array')

  // Validate and sanitise each card
  const flashcards: Flashcard[] = (parsed as any[])
    .filter((card) => card.korean && card.english && card.type)
    .map((card, i) => ({
      id: card.id || `card_${i}`,
      type: ['vocabulary', 'phrase', 'grammar'].includes(card.type)
        ? card.type
        : 'vocabulary',
      korean: card.korean,
      romanisation: card.romanisation || '',
      english: card.english,
      exampleSentence: {
        korean: card.exampleSentence?.korean || '',
        romanisation: card.exampleSentence?.romanisation || '',
        english: card.exampleSentence?.english || '',
      },
      grammarNote: card.grammarNote || undefined,
      difficultyLevel: ['beginner', 'intermediate', 'advanced'].includes(
        card.difficultyLevel
      )
        ? card.difficultyLevel
        : 'intermediate',
      sourceTimestamp: card.sourceTimestamp || undefined,
      tags: Array.isArray(card.tags) ? card.tags : [],
    }))

  return flashcards
}
