import { NextRequest, NextResponse } from 'next/server'
import { generateFlashcards } from '@/lib/ai'

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('v') ?? 'V8tEft-1C5s'

  // Step 1: fetch transcript via Supadata
  const key = process.env.SUPADATA_API_KEY
  if (!key) return NextResponse.json({ error: 'SUPADATA_API_KEY not set' }, { status: 500 })

  let transcript: string
  try {
    const res = await fetch(
      `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=true`,
      { headers: { 'x-api-key': key } }
    )
    const data = await res.json()
    transcript = typeof data?.content === 'string' ? data.content.trim() : ''
    if (!transcript) return NextResponse.json({ error: 'No transcript from Supadata', raw: data }, { status: 500 })
  } catch (e: any) {
    return NextResponse.json({ step: 'transcript', error: e?.message }, { status: 500 })
  }

  // Step 2: generate flashcards
  try {
    const cards = await generateFlashcards(transcript, 'Pipeline Test')
    return NextResponse.json({ ok: true, transcript_chars: transcript.length, card_count: cards.length, first_card: cards[0] })
  } catch (e: any) {
    return NextResponse.json({ step: 'generate', error: e?.message, transcript_chars: transcript.length }, { status: 500 })
  }
}
