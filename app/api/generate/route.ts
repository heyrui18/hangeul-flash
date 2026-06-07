import { NextRequest, NextResponse } from 'next/server'
import { generateFlashcards } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const { transcript, videoTitle } = await req.json()

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 500 }
      )
    }

    const flashcards = await generateFlashcards(
      transcript,
      videoTitle ?? 'Korean Video'
    )

    if (flashcards.length === 0) {
      return NextResponse.json(
        { error: 'NO_KOREAN' },
        { status: 422 }
      )
    }

    return NextResponse.json({ flashcards })
  } catch (error: any) {
    console.error('Generate error:', error)
    const msg = error?.message?.toLowerCase() ?? ''
    if (msg.includes('quota') || msg.includes('rate') || msg.includes('429')) {
      return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 })
    }
    return NextResponse.json({ error: error.message ?? 'Generation failed' }, { status: 500 })
  }
}
