import { NextRequest, NextResponse } from 'next/server'
import { Flashcard } from '@/lib/flashcard-types'
import { assertValidFlashcardsForExport, ValidationError } from '@/lib/validate'

function escapeCSV(value: string): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function safeFilename(title: string): string {
  return title
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 50) || 'hangeul-flash'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const flashcards = assertValidFlashcardsForExport(body?.flashcards)
    const videoTitle: string = typeof body?.videoTitle === 'string' ? body.videoTitle : ''
    const videoUrl: string = typeof body?.videoUrl === 'string' ? body.videoUrl : ''
    const filterLabel: string = typeof body?.filterLabel === 'string' ? body.filterLabel : 'all'

    const headers = [
      'Korean', 'Romanisation', 'English',
      'Source Context',
      'TOPIK Level', 'Formality',
      'Example (Korean)', 'Example (Romanisation)', 'Example (English)',
      'Grammar Note', 'Type', 'Difficulty', 'Tags',
    ]

    const rows = flashcards.map((card: Flashcard) =>
      [
        card.korean,
        card.romanisation,
        card.english,
        card.sourceContext ?? '',
        card.topikLevel ?? 'unknown',
        card.formality ?? 'neutral',
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

    const metaLines = [
      `# Source: ${videoTitle || 'Unknown'}`,
      `# URL: ${videoUrl || 'Unknown'}`,
      `# Exported: ${new Date().toISOString()}`,
      `# Cards: ${flashcards.length}${filterLabel !== 'all' ? ` (filter: ${filterLabel})` : ''}`,
      '',
    ]

    const csv = [...metaLines, headers.join(','), ...rows].join('\n')

    const filename = videoTitle
      ? `${safeFilename(videoTitle)}-flashcards.csv`
      : 'hangeul-flash-export.csv'

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
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
