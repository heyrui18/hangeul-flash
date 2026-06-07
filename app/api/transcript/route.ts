import { NextRequest, NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const videoId = extractVideoId(url.trim())
    if (!videoId) {
      return NextResponse.json({ error: 'INVALID_URL' }, { status: 400 })
    }

    let transcriptItems: Array<{ text: string; offset: number; duration: number }>

    // First try Korean captions, then fall back to any available
    try {
      transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ko' })
    } catch {
      try {
        transcriptItems = await YoutubeTranscript.fetchTranscript(videoId)
      } catch (err: any) {
        const msg = err?.message?.toLowerCase() ?? ''
        if (msg.includes('private') || msg.includes('age') || msg.includes('unavailable')) {
          return NextResponse.json({ error: 'PRIVATE_VIDEO' }, { status: 403 })
        }
        return NextResponse.json({ error: 'NO_CAPTIONS' }, { status: 404 })
      }
    }

    if (!transcriptItems || transcriptItems.length === 0) {
      return NextResponse.json({ error: 'NO_CAPTIONS' }, { status: 404 })
    }

    const transcript = transcriptItems.map((item) => item.text).join(' ')

    return NextResponse.json({ transcript, videoId })
  } catch (error: any) {
    console.error('Transcript error:', error)
    return NextResponse.json({ error: error.message ?? 'Unknown error' }, { status: 500 })
  }
}
