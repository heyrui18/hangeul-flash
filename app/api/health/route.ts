/**
 * Silent health check endpoint — pinged by Render's monitor.
 * Checks infrastructure only, does not consume AI quota.
 */
import { NextResponse } from 'next/server'

export async function GET() {
  const checks = {
    api_key: false,
    youtube_reachable: false,
  }

  // Check 1: API key present and plausible format
  const key = process.env.GROQ_API_KEY ?? ''
  checks.api_key = key.length > 10

  // Check 2: YouTube reachable
  try {
    const res = await fetch('https://www.youtube.com', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    })
    checks.youtube_reachable = res.ok || res.status < 500
  } catch {
    checks.youtube_reachable = false
  }

  const allOk = Object.values(checks).every(Boolean)

  return NextResponse.json(
    { status: allOk ? 'ok' : 'degraded', timestamp: new Date().toISOString(), checks },
    { status: allOk ? 200 : 503 }
  )
}
