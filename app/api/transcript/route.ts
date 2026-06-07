import { NextRequest, NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'
import { assertValidUrl, ValidationError } from '@/lib/validate'

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

// Approach 1: youtube-transcript npm package
async function tryYoutubeTranscriptPackage(videoId: string): Promise<string | null> {
  // Try Korean first, then auto-detect
  for (const lang of ['ko', undefined]) {
    try {
      const items = lang
        ? await YoutubeTranscript.fetchTranscript(videoId, { lang })
        : await YoutubeTranscript.fetchTranscript(videoId)
      if (items && items.length > 0) {
        return items.map((i: any) => i.text).join(' ').replace(/\s+/g, ' ').trim()
      }
    } catch {
      continue
    }
  }
  return null
}

// Approach 2: Direct timedtext JSON API
async function tryTimedTextAPI(videoId: string): Promise<string | null> {
  for (const lang of ['ko', 'en', '']) {
    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`
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

// Approach 3: Scrape page for timedtext URLs
async function tryPageScrape(videoId: string): Promise<string | null> {
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=ko`, {
      headers: HEADERS,
    })
    if (!pageRes.ok) return null
    const html = await pageRes.text()

    const raw = [...html.matchAll(/\/api\/timedtext\?[^"\\]+/g)]
    const sorted = raw
      .map((m) => 'https://www.youtube.com' + m[0].replace(/\\u0026/g, '&'))
      .sort((a) => (a.includes('lang=ko') ? -1 : 1))

    for (const url of sorted) {
      const t = await fetchXMLTranscript(url)
      if (t) return t
    }

    const escaped = [...html.matchAll(/https:\\\/\\\/www\.youtube\.com\\\/api\\\/timedtext[^"]+/g)]
    for (const m of escaped) {
      const url = m[0].replace(/\\\//g, '/').replace(/\\u0026/g, '&').replace(/\\/g, '')
      const t = await fetchXMLTranscript(url)
      if (t) return t
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
    const body = await req.json()
    const videoId = assertValidUrl(body?.url)

    // Try all three approaches in sequence
    let transcript: string | null = null

    transcript = await tryYoutubeTranscriptPackage(videoId)
    if (!transcript) transcript = await tryTimedTextAPI(videoId)
    if (!transcript) transcript = await tryPageScrape(videoId)

    if (!transcript || transcript.trim().length < 20) {
      return NextResponse.json({ error: 'NO_CAPTIONS' }, { status: 404 })
    }

    return NextResponse.json({ transcript: transcript.trim(), videoId })
  } catch (err: any) {
    if (err instanceof ValidationError) {
      const code = err.code === 'INVALID_TRANSCRIPT' ? 'NO_CAPTIONS' : err.code
      const statusMap: Record<string, number> = {
        INVALID_URL: 400,
        NO_CAPTIONS: 404,
        PRIVATE_VIDEO: 403,
      }
      return NextResponse.json({ error: code }, { status: statusMap[code] ?? 400 })
    }
    console.error('[transcript] Unhandled error:', err)
    return NextResponse.json({ error: 'NO_CAPTIONS' }, { status: 404 })
  }
}
