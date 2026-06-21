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

// Approach 2: Direct timedtext JSON API (older videos / some auto-captions)
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

// Extract the ytInitialPlayerResponse JSON blob from the YouTube page HTML.
// YouTube embeds this as: var ytInitialPlayerResponse = {...};
function extractPlayerResponse(html: string): any | null {
  const marker = 'var ytInitialPlayerResponse = '
  const start = html.indexOf(marker)
  if (start === -1) return null

  let depth = 0
  let i = start + marker.length
  const jsonStart = i

  for (; i < html.length; i++) {
    if (html[i] === '{') depth++
    else if (html[i] === '}') {
      depth--
      if (depth === 0) break
    }
  }

  try {
    return JSON.parse(html.slice(jsonStart, i + 1))
  } catch {
    return null
  }
}

// Approach 3: Parse ytInitialPlayerResponse from the YouTube page
async function tryPlayerResponse(videoId: string): Promise<{ transcript: string; title: string } | null> {
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: HEADERS,
    })
    if (!pageRes.ok) {
      console.error(`[transcript] Page fetch failed: ${pageRes.status}`)
      return null
    }
    const html = await pageRes.text()

    const playerResponse = extractPlayerResponse(html)
    if (!playerResponse) {
      console.error('[transcript] Could not extract ytInitialPlayerResponse')
      return null
    }

    const title: string = playerResponse?.videoDetails?.title ?? ''
    const tracks: any[] =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []

    if (tracks.length === 0) {
      console.error('[transcript] No caption tracks found in playerResponse')
      return null
    }

    // Sort Korean tracks first
    const sorted = [...tracks].sort((a) => (a.languageCode === 'ko' ? -1 : 1))

    for (const track of sorted) {
      const baseUrl: string | undefined = track.baseUrl
      if (!baseUrl) continue
      const transcript = await fetchXMLTranscript(baseUrl)
      if (transcript) {
        console.log(`[transcript] Got transcript via playerResponse (lang: ${track.languageCode})`)
        return { transcript, title }
      }
    }
  } catch (e) {
    console.error('[transcript] tryPlayerResponse threw:', e)
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

    let transcript: string | null = null
    let videoTitle = 'Korean Video'

    // Approach 1
    transcript = await tryYoutubeTranscriptPackage(videoId)
    if (transcript) console.log('[transcript] Got transcript via npm package')

    // Approach 2
    if (!transcript) {
      transcript = await tryTimedTextAPI(videoId)
      if (transcript) console.log('[transcript] Got transcript via timedtext API')
    }

    // Approach 3 — parses ytInitialPlayerResponse, also gets the video title
    if (!transcript) {
      const result = await tryPlayerResponse(videoId)
      if (result) {
        transcript = result.transcript
        if (result.title) videoTitle = result.title
      }
    }

    if (!transcript || transcript.trim().length < 20) {
      console.error(`[transcript] All approaches failed for videoId: ${videoId}`)
      return NextResponse.json({ error: 'NO_CAPTIONS' }, { status: 404 })
    }

    return NextResponse.json({ transcript: transcript.trim(), videoId, videoTitle })
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
