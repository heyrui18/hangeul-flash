import { NextRequest, NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('v') ?? 'V8tEft-1C5s'
  const results: Record<string, string> = {}

  // Test 0: Supadata
  const supadataKey = process.env.SUPADATA_API_KEY
  if (!supadataKey) {
    results.supadata = '❌ SUPADATA_API_KEY not set in environment'
  } else {
    try {
      const res = await fetch(
        `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=true`,
        { headers: { 'x-api-key': supadataKey } }
      )
      const data = await res.json().catch(() => null)
      const text = typeof data?.content === 'string' ? data.content.trim() : ''
      if (text.length > 10) {
        results.supadata = `✅ ${text.length} chars`
      } else {
        results.supadata = `❌ status=${res.status} body=${JSON.stringify(data).slice(0, 120)}`
      }
    } catch (e: any) {
      results.supadata = `❌ ${e?.message?.slice(0, 120)}`
    }
  }

  // Test 1: npm package
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ko' })
    results.npm_package = items.length > 0 ? `✅ ${items.length} items` : '❌ empty'
  } catch (e: any) {
    results.npm_package = `❌ ${e?.message?.slice(0, 120)}`
  }

  // Test 2: timedtext API
  try {
    const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=ko&fmt=json3`
    const res = await fetch(url, { headers: HEADERS })
    const data = await res.json().catch(() => null)
    const events = data?.events ?? []
    const text = events.filter((e: any) => e.segs).map((e: any) => e.segs.map((s: any) => s.utf8 ?? '').join('')).join(' ').trim()
    results.timedtext_api = text.length > 10 ? `✅ ${text.length} chars` : `❌ status=${res.status} empty`
  } catch (e: any) {
    results.timedtext_api = `❌ ${e?.message?.slice(0, 120)}`
  }

  // Test 3: ytInitialPlayerResponse
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, { headers: HEADERS })
    const html = await pageRes.text()
    results.page_status = String(pageRes.status)
    const marker = 'var ytInitialPlayerResponse = '
    const start = html.indexOf(marker)
    if (start === -1) {
      results.player_response = '❌ marker not found'
      if (html.includes('consent.youtube.com')) results.page_note = 'consent page'
      else if (html.includes('accounts.google.com')) results.page_note = 'login redirect'
    } else {
      let depth = 0, i = start + marker.length
      const jsonStart = i
      for (; i < html.length; i++) {
        if (html[i] === '{') depth++
        else if (html[i] === '}') { depth--; if (depth === 0) break }
      }
      try {
        const pr = JSON.parse(html.slice(jsonStart, i + 1))
        const tracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []
        results.player_response = `✅ ${tracks.length} caption tracks`
        results.caption_tracks = tracks.map((t: any) => `${t.languageCode}(${t.name?.simpleText})`).join(', ')
      } catch (e: any) {
        results.player_response = `❌ JSON parse failed: ${e?.message?.slice(0, 80)}`
      }
    }
  } catch (e: any) {
    results.page_fetch = `❌ ${e?.message?.slice(0, 120)}`
  }

  return NextResponse.json({ videoId, results })
}
