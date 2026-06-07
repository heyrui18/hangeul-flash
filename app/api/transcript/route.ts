import { NextRequest, NextResponse } from 'next/server'

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

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

// Approach 1: YouTube timedtext API (most reliable, no auth needed)
async function tryTimedTextAPI(videoId: string): Promise<string | null> {
  const langs = ['ko', 'en', '']
  for (const lang of langs) {
    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3&xorb=2&xobt=3&xovt=3`
      const res = await fetch(url, { headers: HEADERS })
      if (!res.ok) continue

      const data = await res.json()
      const events = data?.events ?? []
      const text = events
        .filter((e: any) => e.segs)
        .map((e: any) => e.segs.map((s: any) => s.utf8 ?? '').join(''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()

      if (text.length > 30) return text
    } catch {
      continue
    }
  }
  return null
}

// Approach 2: Innertube API (bypasses most regional blocks)
async function tryInnertubeAPI(videoId: string): Promise<string | null> {
  try {
    // First get the page to extract caption track info
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=ko`, {
      headers: HEADERS,
    })
    if (!pageRes.ok) return null
    const html = await pageRes.text()

    // Extract all timedtext URLs from the page source
    const urlMatches = [
      ...html.matchAll(/https:\\\/\\\/www\.youtube\.com\\\/api\\\/timedtext[^"]+/g),
    ]

    if (urlMatches.length === 0) {
      // Try unescaped version
      const raw = [...html.matchAll(/\/api\/timedtext\?[^"\\]+/g)]
      if (raw.length === 0) return null

      for (const match of raw) {
        const url = 'https://www.youtube.com' + match[0].replace(/\\u0026/g, '&')
        const transcript = await fetchXMLTranscript(url)
        if (transcript) return transcript
      }
      return null
    }

    // Prefer Korean, try all
    const sortedUrls = urlMatches
      .map((m) =>
        m[0]
          .replace(/\\\//g, '/')
          .replace(/\\u0026/g, '&')
          .replace(/\\/g, '')
      )
      .sort((a) => (a.includes('lang=ko') ? -1 : 1))

    for (const url of sortedUrls) {
      const transcript = await fetchXMLTranscript(url)
      if (transcript) return transcript
    }
  } catch {
    return null
  }
  return null
}

async function fetchXMLTranscript(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: HEADERS })
    if (!res.ok) return null
    const xml = await res.text()
    const matches = [...xml.matchAll(/<text[^>]*>([^<]*)<\/text>/g)]
    if (matches.length === 0) return null
    return matches
      .map((m) =>
        m[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\n/g, ' ')
      )
      .join(' ')
      .trim()
  } catch {
    return null
  }
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

    // Try approaches in order
    let transcript: string | null = null

    transcript = await tryTimedTextAPI(videoId)
    if (!transcript) {
      transcript = await tryInnertubeAPI(videoId)
    }

    if (!transcript || transcript.trim().length < 20) {
      return NextResponse.json({ error: 'NO_CAPTIONS' }, { status: 404 })
    }

    return NextResponse.json({ transcript, videoId })
  } catch (error: any) {
    console.error('Transcript error:', error)
    return NextResponse.json({ error: error.message ?? 'Unknown error' }, { status: 500 })
  }
}
