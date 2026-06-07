import { NextRequest, NextResponse } from 'next/server'
import { Flashcard } from '@/lib/flashcard-types'
import { assertValidFlashcardsForExport, ValidationError } from '@/lib/validate'

function escapeCSV(value: string): string {
  const str = value ?? ''
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Internal validation
    const flashcards = assertValidFlashcardsForExport(body?.flashcards)

    const headers = [
      'Korean', 'Romanisation', 'English',
      'Example (Korean)', 'Example (Romanisation)', 'Example (English)',
      'Grammar Note', 'Type', 'Difficulty', 'Tags',
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
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.code }, { status: 400 })
    }
    console.error('[export] Unhandled error:', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
