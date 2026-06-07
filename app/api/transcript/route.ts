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

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
}

async function fetchTranscriptDirect(videoId: string): Promise<string> {
  // Step 1: Fetch the YouTube watch page
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: BROWSER_HEADERS,
  })

  if (!pageRes.ok) {
    throw new Error(`YouTube page fetch failed: ${pageRes.status}`)
  }

  const html = await pageRes.text()

  // Check for private/unavailable
  if (html.includes('"status":"ERROR"') || html.includes('"status":"LOGIN_REQUIRED"')) {
    throw new Error('PRIVATE_VIDEO')
  }

  // Step 2: Extract the caption tracks URL from the page
  // YouTube embeds caption info in the page as JSON
  const splittableMatch = html.match(/"captions":\s*(\{[^;]+\})/)
  if (!splittableMatch) {
    // Try alternative approach: look for timedtext URL directly
    const timedTextMatch = html.match(/https:\/\/www\.youtube\.com\/api\/timedtext[^"\\]+/)
    if (!timedTextMatch) {
      throw new Error('NO_CAPTIONS')
    }
    const timedUrl = timedTextMatch[0].replace(/\\u0026/g, '&').replace(/\\/g, '')
    return await fetchTimedText(timedUrl)
  }

  // Parse caption data
  const captionsJson = splittableMatch[1]

  // Extract all caption track URLs
  const trackMatches = [...captionsJson.matchAll(/"baseUrl":"([^"]+)"/g)]
  if (trackMatches.length === 0) throw new Error('NO_CAPTIONS')

  // Prefer Korean tracks, fall back to first available
  const urls = trackMatches.map((m) => m[1].replace(/\\u0026/g, '&').replace(/\\/g, ''))

  // Try to find Korean track
  const langMatches = [...captionsJson.matchAll(/"languageCode":"([^"]+)"/g)]
  const langs = langMatches.map((m) => m[1])

  let targetUrl = urls[0]
  const koIdx = langs.findIndex((l) => l === 'ko')
  if (koIdx !== -1 && urls[koIdx]) {
    targetUrl = urls[koIdx]
  }

  return await fetchTimedText(targetUrl)
}

async function fetchTimedText(url: string): Promise<string> {
  const res = await fetch(url, { headers: BROWSER_HEADERS })
  if (!res.ok) throw new Error('NO_CAPTIONS')

  const xml = await res.text()

  // Parse XML transcript
  const textMatches = [...xml.matchAll(/<text[^>]*>([^<]*)<\/text>/g)]
  if (textMatches.length === 0) throw new Error('NO_CAPTIONS')

  const transcript = textMatches
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

  return transcript
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

    let transcript: string
    try {
      transcript = await fetchTranscriptDirect(videoId)
    } catch (err: any) {
      const msg = err?.message ?? ''
      if (msg === 'PRIVATE_VIDEO') {
        return NextResponse.json({ error: 'PRIVATE_VIDEO' }, { status: 403 })
      }
      return NextResponse.json({ error: 'NO_CAPTIONS' }, { status: 404 })
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
