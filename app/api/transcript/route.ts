import { NextRequest, NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'
import { assertValidUrl, ValidationError } from '@/lib/validate'
import { checkRateLimit } from '@/lib/rate-limit'

const FETCH_TIMEOUT = 20_000

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

// ── Approach 1 (primary on production): Supadata YouTube Transcript API ───────
async function trySupadata(videoId: string): Promise<string | null> {
  const key = process.env.SUPADATA_API_KEY
  if (!key) return null

  try {
    const res = await fetch(
      `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=true`,
      { headers: { 'x-api-key': key }, signal: AbortSignal.timeout(FETCH_TIMEOUT) }
    )
    if (!res.ok) {
      console.error(`[transcript] Supadata returned ${res.status}`)
      return null
    }
    const data = await res.json()
    const text = typeof data?.content === 'string' ? data.content.trim() : ''
    if (text.length > 30) {
      console.log('[transcript] Got transcript via Supadata')
      return text
    }
  } catch (e) {
    console.error('[transcript] Supadata error:', e)
  }
  return null
}

// ── Approach 2: youtube-transcript npm package (works on non-blocked IPs) ─────
async function tryYoutubeTranscriptPackage(videoId: string): Promise<string | null> {
  for (const lang of ['ko', undefined]) {
    try {
      const fetchPromise = lang
        ? YoutubeTranscript.fetchTranscript(videoId, { lang })
        : YoutubeTranscript.fetchTranscript(videoId)

      const items = await Promise.race([
        fetchPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), FETCH_TIMEOUT)
        ),
      ])

      if (items && items.length > 0) {
        console.log('[transcript] Got transcript via npm package')
        return items.map((i: any) => i.text).join(' ').replace(/\s+/g, ' ').trim()
      }
    } catch {
      continue
    }
  }
  return null
}

// ── Approach 3: Direct timedtext JSON API ─────────────────────────────────────
async function tryTimedTextAPI(videoId: string): Promise<string | null> {
  for (const lang of ['ko', 'en', '']) {
    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`
      const res = await fetch(url, {
        headers: BROWSER_HEADERS,
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      })
      if (!res.ok) continue
      const data = await res.json()
      const events = data?.events ?? []
      const text = events
        .filter((e: any) => e.segs)
        .map((e: any) => e.segs.map((s: any) => s.utf8 ?? '').join(''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (text.length > 30) {
        console.log('[transcript] Got transcript via timedtext API')
        return text
      }
    } catch {
      continue
    }
  }
  return null
}

// ── Approach 4: Parse ytInitialPlayerResponse from the YouTube watch page ─────
function extractPlayerResponse(html: string): any | null {
  const marker = 'var ytInitialPlayerResponse = '
  const start = html.indexOf(marker)
  if (start === -1) return null
  let depth = 0, i = start + marker.length
  const jsonStart = i
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++
    else if (html[i] === '}') { depth--; if (depth === 0) break }
  }
  try { return JSON.parse(html.slice(jsonStart, i + 1)) } catch { return null }
}

async function tryPlayerResponse(videoId: string): Promise<{ transcript: string; title: string } | null> {
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    })
    if (!pageRes.ok) {
      console.error(`[transcript] YouTube page returned ${pageRes.status}`)
      return null
    }
    const html = await pageRes.text()
    const playerResponse = extractPlayerResponse(html)
    if (!playerResponse) {
      console.error('[transcript] ytInitialPlayerResponse not found in page')
      return null
    }
    const title: string = playerResponse?.videoDetails?.title ?? ''
    const tracks: any[] =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []
    if (tracks.length === 0) return null

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
    console.error('[transcript] tryPlayerResponse error:', e)
  }
  return null
}

async function fetchXMLTranscript(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    })
    if (!res.ok) return null
    const xml = await res.text()
    const matches = [...xml.matchAll(/<text[^>]*>([^<]*)<\/text>/g)]
    if (matches.length === 0) return null
    return matches
      .map((m) =>
        m[1]
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n/g, ' ')
      )
      .join(' ')
      .trim()
  } catch { return null }
}

// ── Main route ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Rate limiting: 10 transcript fetches per hour per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(`transcript:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'RATE_LIMIT', detail: 'Too many requests. Please wait before trying again.' },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    const videoId = assertValidUrl(body?.url)

    let transcript: string | null = null
    let videoTitle = 'Korean Video'

    transcript = await trySupadata(videoId)
    if (!transcript) transcript = await tryYoutubeTranscriptPackage(videoId)
    if (!transcript) transcript = await tryTimedTextAPI(videoId)
    if (!transcript) {
      const result = await tryPlayerResponse(videoId)
      if (result) { transcript = result.transcript; if (result.title) videoTitle = result.title }
    }

    if (!transcript || transcript.trim().length < 20) {
      console.error(`[transcript] All approaches failed for videoId: ${videoId}`)
      return NextResponse.json({ error: 'NO_CAPTIONS' }, { status: 404 })
    }

    const truncated = transcript.trim().length > 12000

    return NextResponse.json({
      transcript: transcript.trim(),
      videoId,
      videoTitle,
      truncated,
    })
  } catch (err: any) {
    if (err instanceof ValidationError) {
      const code = err.code === 'INVALID_TRANSCRIPT' ? 'NO_CAPTIONS' : err.code
      const statusMap: Record<string, number> = { INVALID_URL: 400, NO_CAPTIONS: 404, PRIVATE_VIDEO: 403 }
      return NextResponse.json({ error: code }, { status: statusMap[code] ?? 400 })
    }
    console.error('[transcript] Unhandled error:', err)
    return NextResponse.json({ error: 'NO_CAPTIONS' }, { status: 404 })
  }
}
