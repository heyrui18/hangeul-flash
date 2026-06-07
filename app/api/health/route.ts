/**
 * Silent health check endpoint.
 * Called by Render's health monitor and can be pinged externally.
 * Returns 200 if all systems are operational, 503 if not.
 * Never exposes internal errors to the user.
 */
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface HealthStatus {
  status: 'ok' | 'degraded'
  timestamp: string
  checks: {
    api_key: boolean
    gemini: boolean
    youtube_reachable: boolean
  }
}

export async function GET() {
  const checks: HealthStatus['checks'] = {
    api_key: false,
    gemini: false,
    youtube_reachable: false,
  }

  // Check 1: API key present
  checks.api_key = Boolean(process.env.GEMINI_API_KEY)

  // Check 2: Gemini responds
  if (checks.api_key) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
      await model.generateContent('ping')
      checks.gemini = true
    } catch {
      checks.gemini = false
    }
  }

  // Check 3: YouTube reachable
  try {
    const res = await fetch('https://www.youtube.com', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    })
    checks.youtube_reachable = res.ok
  } catch {
    checks.youtube_reachable = false
  }

  const allOk = Object.values(checks).every(Boolean)
  const status: HealthStatus = {
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  }

  return NextResponse.json(status, { status: allOk ? 200 : 503 })
}
