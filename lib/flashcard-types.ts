export interface Flashcard {
  id: string
  type: 'vocabulary' | 'phrase' | 'grammar'
  korean: string
  romanisation: string
  english: string
  exampleSentence: {
    korean: string
    romanisation: string
    english: string
  }
  grammarNote?: string
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced'
  sourceTimestamp?: string
  sourceContext?: string
  topikLevel?: 'I' | 'II' | 'advanced' | 'unknown'
  formality?: 'formal' | 'informal' | 'neutral' | 'honorific'
  tags: string[]
}

export type FilterType =
  | 'all'
  | 'vocabulary' | 'phrase' | 'grammar'
  | 'beginner' | 'intermediate' | 'advanced'
  | 'topik-I' | 'topik-II' | 'topik-advanced'
  | 'formal' | 'informal'
