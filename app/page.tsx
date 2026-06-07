'use client'

import { useState } from 'react'
import { Tv, UtensilsCrossed, Globe } from 'lucide-react'
import URLInput from '@/components/URLInput'
import LoadingState from '@/components/LoadingState'
import CardDeck from '@/components/CardDeck'
import { Flashcard } from '@/lib/flashcard-types'

type AppState = 'idle' | 'loading' | 'done' | 'error'

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_URL: "That doesn't look like a valid YouTube URL. Try: https://www.youtube.com/watch?v=...",
  NO_CAPTIONS: 'No captions found. Try a video with Korean auto-generated or manual subtitles.',
  PRIVATE_VIDEO: 'This video is private or age-restricted. Please try a public video.',
  NO_KOREAN: 'No Korean language detected. Try a Korean-language vlog, drama, or cooking video.',
  RATE_LIMIT: 'The AI is busy right now. Please wait a moment and try again.',
}

const USE_CASES = [
  {
    icon: <Tv size={22} className="text-ink-blue" />,
    title: 'K-Dramas',
    desc: 'Pick up natural dialogue, speech levels, and emotional vocabulary from your favourite shows.',
  },
  {
    icon: <UtensilsCrossed size={22} className="text-coral" />,
    title: 'Korean Cooking',
    desc: 'Learn ingredient names, cooking verbs, and taste vocabulary from recipe channels.',
  },
  {
    icon: <Globe size={22} className="text-emerald-600" />,
    title: 'Korean Vlogs',
    desc: 'Study colloquial expressions, filler words, and everyday speech from creators.',
  },
]

export default function Home() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [loadStep, setLoadStep] = useState<1 | 2 | 3>(1)
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (url: string) => {
    setAppState('loading')
    setLoadStep(1)
    setErrorMsg('')

    try {
      // Step 1: Fetch transcript
      const transcriptRes = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const transcriptData = await transcriptRes.json()

      if (!transcriptRes.ok) {
        const code = transcriptData.error as string
        throw new Error(ERROR_MESSAGES[code] ?? transcriptData.error ?? 'Failed to fetch transcript.')
      }

      // Step 2: Generate flashcards
      setLoadStep(2)
      const generateRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptData.transcript,
          videoTitle: transcriptData.videoTitle ?? 'Korean Video',
        }),
      })
      const generateData = await generateRes.json()

      if (!generateRes.ok) {
        const code = generateData.error as string
        throw new Error(ERROR_MESSAGES[code] ?? generateData.error ?? 'Failed to generate flashcards.')
      }

      // Step 3: Done
      setLoadStep(3)
      await new Promise((r) => setTimeout(r, 600))

      setFlashcards(generateData.flashcards)
      setAppState('done')
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Something went wrong. Please try again.')
      setAppState('error')
    }
  }

  const handleReset = () => {
    setAppState('idle')
    setFlashcards([])
    setErrorMsg('')
  }

  if (appState === 'done' && flashcards.length > 0) {
    return (
      <main className="min-h-screen bg-pattern py-10 px-4">
        <header className="text-center mb-10">
          <h1 className="font-korean text-2xl text-ink-blue">한글 Flash</h1>
          <p className="text-xs text-gray-400 font-ui mt-1">{flashcards.length} cards generated</p>
        </header>
        <CardDeck flashcards={flashcards} onReset={handleReset} />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-pattern flex flex-col items-center justify-center px-4 py-16 gap-10">
      <div className="text-center flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-ink-blue flex items-center justify-center shadow-md mb-2">
          <span className="font-korean text-2xl text-white">한</span>
        </div>
        <h1 className="font-korean text-5xl md:text-6xl text-ink-blue tracking-tight">
          한글 Flash
        </h1>
        <p className="font-ui text-gray-500 text-lg max-w-md leading-relaxed">
          Paste any Korean YouTube video URL and get AI-generated flashcards in seconds.
        </p>
      </div>

      <div className="w-full max-w-xl animate-fade-in">
        {appState === 'idle' && (
          <URLInput onSubmit={handleSubmit} isLoading={false} />
        )}
        {appState === 'loading' && <LoadingState step={loadStep} />}
        {appState === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-6 py-4 text-sm font-ui text-center max-w-md">
              {errorMsg}
            </div>
            <button
              onClick={handleReset}
              className="px-6 py-2.5 bg-ink-blue text-white text-sm font-ui font-medium rounded-xl hover:bg-ink-blue/90 transition-all"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {appState === 'idle' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl animate-fade-in">
          {USE_CASES.map((uc) => (
            <div
              key={uc.title}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                {uc.icon}
                <span className="font-ui font-semibold text-near-black text-sm">{uc.title}</span>
              </div>
              <p className="text-xs text-gray-500 font-ui leading-relaxed">{uc.desc}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-300 font-ui">
        Powered by Google Gemini · Built with Next.js
      </p>
    </main>
  )
}
