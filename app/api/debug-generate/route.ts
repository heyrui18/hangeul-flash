import { NextResponse } from 'next/server'
import { generateFlashcards } from '@/lib/ai'

const SAMPLE = `오늘은 된장찌개를 만들어볼 거예요. 먼저 두부를 깍둑썰기 해주세요.
애호박도 반달 모양으로 썰어주시고요. 냄비에 물을 붓고 다시마를 넣어서 육수를
우려낼 거예요. 된장을 풀어서 간을 맞춰주세요. 청양고추를 넣으면 칼칼한 맛이 나요.
마지막에 파를 송송 썰어서 올려주면 완성이에요. 밥이랑 같이 먹으면 정말 맛있어요.`

export async function GET() {
  const key = process.env.GROQ_API_KEY
  if (!key) return NextResponse.json({ error: 'GROQ_API_KEY not set' }, { status: 500 })

  try {
    const cards = await generateFlashcards(SAMPLE, 'Debug Test')
    return NextResponse.json({ ok: true, card_count: cards.length, first_card: cards[0] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 })
  }
}
