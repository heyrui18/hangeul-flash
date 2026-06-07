/**
 * Diagnostic endpoint — visit /api/test-gemini to test AI connection.
 */
import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const MODELS_TO_TRY = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
]

export async function GET() {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 })
  }

  const ai = new GoogleGenAI({ apiKey: key })
  const results: Record<string, string> = {}

  for (const modelName of MODELS_TO_TRY) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: 'Say the word: ready',
      })
      results[modelName] = '✅ ' + (response.text ?? '').slice(0, 50)
    } catch (e: any) {
      results[modelName] = '❌ ' + (e?.message ?? 'failed').slice(0, 120)
    }
  }

  return NextResponse.json({ key_prefix: key.slice(0, 10) + '...', results })
}
