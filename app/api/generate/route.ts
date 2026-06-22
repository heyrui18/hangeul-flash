import { NextRequest, NextResponse } from 'next/server'
import { generateFlashcards } from '@/lib/ai'
import { assertValidTranscript, assertValidFlashcards, ValidationError } from '@/lib/validate'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  // Rate limiting: 20 generations per 10 minutes per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'
  if (!checkRateLimit(`generate:${ip}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'RATE_LIMIT', detail: 'Too many requests. Please wait a few minutes before generating again.' },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()

    const transcript = assertValidTranscript(body?.transcript)
    const videoTitle = typeof body?.videoTitle === 'string' ? body.videoTitle : 'Korean Video'

    if (!process.env.GROQ_API_KEY) {
      console.error('[generate] GROQ_API_KEY is not set')
      return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 503 })
    }

    const raw = await generateFlashcards(transcript, videoTitle)
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
    console.error('[generate] Error:', err?.message ?? err)

    if (msg.includes('quota') || msg.includes('rate') || msg.includes('429')) {
      return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 })
    }

    return NextResponse.json({ error: 'RATE_LIMIT', detail: err?.message?.slice(0, 200) }, { status: 500 })
  }
}
