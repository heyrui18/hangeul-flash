import { NextRequest, NextResponse } from 'next/server'
import { generateFlashcards } from '@/lib/gemini'
import { assertValidTranscript, assertValidFlashcards, ValidationError } from '@/lib/validate'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Internal validation
    const transcript = assertValidTranscript(body?.transcript)
    const videoTitle = typeof body?.videoTitle === 'string' ? body.videoTitle : 'Korean Video'

    if (!process.env.GEMINI_API_KEY) {
      console.error('[generate] GEMINI_API_KEY is not set')
      return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 503 })
    }

    const raw = await generateFlashcards(transcript, videoTitle)

    // Validate and sanitise every card from the AI response
    const flashcards = assertValidFlashcards(raw)

    return NextResponse.json({ flashcards })
  } catch (err: any) {
    if (err instanceof ValidationError) {
      const statusMap: Record<string, number> = {
        INVALID_TRANSCRIPT: 400,
        NO_CAPTIONS: 400,
        NO_KOREAN: 422,
        INVALID_RESPONSE: 422,
      }
      return NextResponse.json(
        { error: err.code },
        { status: statusMap[err.code] ?? 400 }
      )
    }

    const msg = err?.message?.toLowerCase() ?? ''
    if (msg.includes('quota') || msg.includes('rate') || msg.includes('429')) {
      return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 })
    }

    console.error('[generate] Unhandled error:', err)
    return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 500 })
  }
}
