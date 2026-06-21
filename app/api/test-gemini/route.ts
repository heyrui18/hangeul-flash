/**
 * Diagnostic endpoint — visit /api/test-gemini to test AI connection.
 */
import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export async function GET() {
  const key = process.env.GROQ_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'GROQ_API_KEY not set' }, { status: 500 })
  }

  try {
    const groq = new Groq({ apiKey: key })
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say the word: ready' }],
    })
    const text = response.choices[0]?.message?.content ?? ''
    return NextResponse.json({ key_prefix: key.slice(0, 10) + '...', result: '✅ ' + text })
  } catch (e: any) {
    return NextResponse.json({ error: '❌ ' + (e?.message ?? 'failed').slice(0, 200) }, { status: 500 })
  }
}
