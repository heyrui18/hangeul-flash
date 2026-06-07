import { NextRequest, NextResponse } from 'next/server'
import { Flashcard } from '@/lib/flashcard-types'

function escapeCSV(value: string): string {
  const str = value ?? ''
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function POST(req: NextRequest) {
  try {
    const { flashcards } = await req.json()

    if (!Array.isArray(flashcards) || flashcards.length === 0) {
      return NextResponse.json({ error: 'No flashcards to export' }, { status: 400 })
    }

    const headers = [
      'Korean',
      'Romanisation',
      'English',
      'Example (Korean)',
      'Example (Romanisation)',
      'Example (English)',
      'Grammar Note',
      'Type',
      'Difficulty',
      'Tags',
    ]

    const rows = flashcards.map((card: Flashcard) =>
      [
        card.korean,
        card.romanisation,
        card.english,
        card.exampleSentence?.korean ?? '',
        card.exampleSentence?.romanisation ?? '',
        card.exampleSentence?.english ?? '',
        card.grammarNote ?? '',
        card.type,
        card.difficultyLevel,
        (card.tags ?? []).join('; '),
      ]
        .map(escapeCSV)
        .join(',')
    )

    const csv = [headers.join(','), ...rows].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="hangeul-flash-export.csv"',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
