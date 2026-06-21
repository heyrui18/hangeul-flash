import { Romanize, Format } from 'hangul-romanize'
import { Flashcard } from './flashcard-types'

function romanise(text: string): string {
  if (!text) return ''
  try {
    return Romanize.from(text, { format: Format.LOWERCASE })
  } catch {
    return ''
  }
}

export function applyRomanisation(cards: Flashcard[]): Flashcard[] {
  return cards.map((card) => ({
    ...card,
    romanisation: romanise(card.korean) || card.romanisation,
    exampleSentence: {
      ...card.exampleSentence,
      romanisation:
        romanise(card.exampleSentence.korean) || card.exampleSentence.romanisation,
    },
  }))
}
