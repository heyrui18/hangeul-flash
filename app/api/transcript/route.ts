import { NextRequest, NextResponse } from 'next/server'
import { assertValidUrl, assertValidTranscript, ValidationError } from '@/lib/validate'

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

async function tryTimedTextAPI(videoId: string): Promise<string | null> {
  for (const lang of ['ko', 'en', '']) {
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

async function tryPageScrape(videoId: string): Promise<string | null> {
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=ko`, {
      headers: HEADERS,
    })
    if (!pageRes.ok) return null
    const html = await pageRes.text()

    const raw = [...html.matchAll(/\/api\/timedtext\?[^"\\]+/g)]
    for (const match of raw) {
      const url = 'https://www.youtube.com' + match[0].replace(/\\u0026/g, '&')
      const transcript = await fetchXMLTranscript(url)
      if (transcript) return transcript
    }

    const escaped = [...html.matchAll(/https:\\\/\\\/www\.youtube\.com\\\/api\\\/timedtext[^"]+/g)]
    const sorted = escaped
      .map((m) => m[0].replace(/\\\//g, '/').replace(/\\u0026/g, '&').replace(/\\/g, ''))
      .sort((a) => (a.includes('lang=ko') ? -1 : 1))

    for (const url of sorted) {
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
    const body = await req.json()

    // Internal validation — throws ValidationError with a code if invalid
    const videoId = assertValidUrl(body?.url)

    let transcript: string | null = await tryTimedTextAPI(videoId)
    if (!transcript) transcript = await tryPageScrape(videoId)

    // Validate transcript content
    const validated = assertValidTranscript(transcript)

    return NextResponse.json({ transcript: validated, videoId })
  } catch (err: any) {
    // Map validation errors to clean codes
    if (err instanceof ValidationError) {
      const statusMap: Record<string, number> = {
        INVALID_URL: 400,
        NO_CAPTIONS: 404,
        INVALID_TRANSCRIPT: 404,
        PRIVATE_VIDEO: 403,
      }
      return NextResponse.json(
        { error: err.code },
        { status: statusMap[err.code] ?? 400 }
      )
    }
    console.error('[transcript] Unhandled error:', err)
    return NextResponse.json({ error: 'NO_CAPTIONS' }, { status: 404 })
  }
}
