/**
 * Diagnostic endpoint — visit /api/test-gemini to test AI connection.
 * Remove this file once confirmed working.
 */
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const MODELS_TO_TRY = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
]

export async function GET() {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 })
  }

  const genAI = new GoogleGenerativeAI(key)
  const results: Record<string, string> = {}

  for (const modelName of MODELS_TO_TRY) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent('Say the word: ready')
      results[modelName] = '✅ ' + result.response.text().slice(0, 50)
    } catch (e: any) {
      results[modelName] = '❌ ' + (e?.message ?? 'failed').slice(0, 100)
    }
  }

  return NextResponse.json({ key_prefix: key.slice(0, 8) + '...', results })
}
