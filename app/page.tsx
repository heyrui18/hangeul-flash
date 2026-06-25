'use client'

import { useState, useEffect, useRef } from 'react'
import { UtensilsCrossed, Globe, Film, X, Sparkles } from 'lucide-react'
import URLInput from '@/components/URLInput'
import LoadingState from '@/components/LoadingState'
import CardDeck from '@/components/CardDeck'
import { Flashcard } from '@/lib/flashcard-types'

type AppState = 'idle' | 'loading' | 'done' | 'error'

const SESSION_KEY = 'hf_last_session'
const SESSION_TTL = 24 * 60 * 60 * 1000

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_URL: "That doesn't look like a valid YouTube URL. Try: https://www.youtube.com/watch?v=...",
  NO_CAPTIONS: 'No captions found. Try a video with Korean auto-generated or manual subtitles.',
  PRIVATE_VIDEO: 'This video is private or age-restricted. Please try a public video.',
  NO_KOREAN: 'No Korean language detected in this video. Try a Korean-language vlog, drama, or cooking video.',
  RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
  GROQ_RATE_LIMIT: 'Groq AI is rate-limiting requests right now. Wait 30 seconds and try again.',
  NO_API_KEY: 'Server configuration error: GROQ_API_KEY is not set. Check your Render environment variables.',
  GENERATE_FAILED: 'AI generation failed unexpectedly. Check the Render logs for details.',
}

const USE_CASES = [
  {
    icon: <Film size={20} className="text-ink-blue" />,
    korean: '드라마',
    title: 'K-Dramas',
    desc: 'Natural dialogue, speech levels, and emotional vocabulary from your favourite shows.',
  },
  {
    icon: <UtensilsCrossed size={20} className="text-coral" />,
    korean: '요리',
    title: 'Cooking',
    desc: 'Ingredient names, cooking verbs, and taste vocabulary from Korean recipe channels.',
  },
  {
    icon: <Globe size={20} className="text-emerald-600" />,
    korean: '브이로그',
    title: 'Vlogs',
    desc: 'Colloquial expressions, filler words, and everyday speech from Korean creators.',
  },
]

interface Session {
  flashcards: Flashcard[]
  videoTitle: string
  videoUrl: string
  savedAt: number
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [loadStep, setLoadStep] = useState<1 | 2 | 3>(1)
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [truncated, setTruncated] = useState(false)
  const [restoredSession, setRestoredSession] = useState(false)
  const [showResumeBanner, setShowResumeBanner] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (!raw) return
      const session: Session = JSON.parse(raw)
      if (Date.now() - session.savedAt < SESSION_TTL && session.flashcards?.length > 0) {
        setFlashcards(session.flashcards)
        setVideoTitle(session.videoTitle ?? '')
        setVideoUrl(session.videoUrl ?? '')
        setRestoredSession(true)
        setShowResumeBanner(true)
      }
    } catch { }
  }, [])

  const saveSession = (cards: Flashcard[], title: string, url: string) => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ flashcards: cards, videoTitle: title, videoUrl: url, savedAt: Date.now() }))
    } catch { }
  }

  const clearSession = () => { try { localStorage.removeItem(SESSION_KEY) } catch { } }

  const handleSubmit = async (url: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setAppState('loading')
    setLoadStep(1)
    setErrorMsg('')
    setTruncated(false)
    setShowResumeBanner(false)

    try {
      const transcriptRes = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      })
      const transcriptData = await transcriptRes.json()
      if (!transcriptRes.ok) {
        const code = transcriptData.error as string
        throw new Error(ERROR_MESSAGES[code] ?? transcriptData.error ?? 'Failed to fetch transcript.')
      }

      setLoadStep(2)
      const generateRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcriptData.transcript, videoTitle: transcriptData.videoTitle ?? 'Korean Video' }),
        signal: controller.signal,
      })
      const generateData = await generateRes.json()
      if (!generateRes.ok) {
        const code = generateData.error as string
        throw new Error(ERROR_MESSAGES[code] ?? generateData.error ?? 'Failed to generate flashcards.')
      }

      setLoadStep(3)
      await new Promise((r) => setTimeout(r, 600))

      const cards = generateData.flashcards
      const title = transcriptData.videoTitle ?? 'Korean Video'
      setFlashcards(cards)
      setVideoTitle(title)
      setVideoUrl(url)
      setTruncated(!!transcriptData.truncated)
      saveSession(cards, title, url)
      setAppState('done')
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      setErrorMsg(e.message ?? 'Something went wrong. Please try again.')
      setAppState('error')
    }
  }

  const handleReset = () => {
    abortRef.current?.abort()
    clearSession()
    setAppState('idle')
    setFlashcards([])
    setErrorMsg('')
    setVideoTitle('')
    setVideoUrl('')
    setTruncated(false)
    setRestoredSession(false)
    setShowResumeBanner(false)
  }

  const handleResumeSession = () => { setShowResumeBanner(false); setAppState('done') }
  const handleDismissResume = () => { setShowResumeBanner(false); clearSession(); setRestoredSession(false) }

  // ── Card view ──────────────────────────────────────────────────────────────
  if (appState === 'done' && flashcards.length > 0) {
    return (
      <main className="min-h-screen bg-pattern py-8 px-4">
        <header className="max-w-6xl mx-auto flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-ink-blue flex items-center justify-center shadow-sm">
              <span className="font-korean text-sm text-white">한</span>
            </div>
            <div>
              <h1 className="font-ui font-bold text-sm text-ink-blue leading-none">Hangeul on Demand</h1>
              <p className="text-[10px] text-gray-400 font-ui leading-none mt-0.5 tracking-widest uppercase">Korean Flashcards</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-ui text-gray-400">{flashcards.length} cards generated</span>
            {truncated && (
              <span className="text-xs text-amber-500 font-ui">⚠ Long video — first portion only</span>
            )}
          </div>
        </header>
        <CardDeck flashcards={flashcards} videoTitle={videoTitle} videoUrl={videoUrl} onReset={handleReset} />
      </main>
    )
  }

  // ── Landing view ───────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen hero-bg flex flex-col items-center justify-center px-4 py-16 gap-12 relative overflow-hidden">

      {/* Ghost Korean characters — decorative background */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
        <span className="deco-char text-[22rem] -top-16 -left-20 rotate-[-12deg]">한</span>
        <span className="deco-char text-[16rem] bottom-4 right-0 rotate-[8deg]">글</span>
        <span className="deco-char text-[10rem] top-1/3 right-1/4 rotate-[-5deg]">어</span>
        <span className="deco-char text-[8rem] bottom-1/4 left-1/5 rotate-[10deg]">말</span>
      </div>

      {/* Resume banner */}
      {showResumeBanner && restoredSession && (
        <div className="w-full max-w-xl bg-white/80 backdrop-blur border border-ink-blue/15 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 animate-fade-in shadow-sm relative z-10">
          <div>
            <p className="text-sm font-ui font-medium text-ink-blue">Resume last session?</p>
            <p className="text-xs text-gray-500 font-ui mt-0.5">
              {flashcards.length} cards{videoTitle ? ` from "${videoTitle}"` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleResumeSession} className="px-4 py-1.5 bg-ink-blue text-white text-xs font-ui font-medium rounded-xl hover:bg-ink-blue/90 transition-all">
              Resume
            </button>
            <button onClick={handleDismissResume} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="text-center flex flex-col items-center gap-5 animate-fade-in relative z-10">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-ink-blue flex items-center justify-center shadow-xl shadow-ink-blue/25">
            <span className="font-korean text-3xl text-white">한</span>
          </div>
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-coral flex items-center justify-center shadow-md">
            <Sparkles size={11} className="text-white" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="font-ui font-bold text-4xl md:text-5xl text-near-black tracking-tight leading-tight">
            Hangeul{' '}
            <span className="text-ink-blue relative">
              on Demand
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-coral rounded-full opacity-60" />
            </span>
          </h1>
          <p className="font-korean text-xl text-gray-400 tracking-widest mt-2">한국어 플래시카드</p>
        </div>

        <p className="font-ui text-gray-500 text-lg max-w-md leading-relaxed">
          Paste any Korean YouTube URL and get AI-generated vocabulary flashcards — instantly.
        </p>
      </div>

      {/* Input / loading / error */}
      <div className="w-full max-w-xl animate-fade-in relative z-10">
        {appState === 'idle' && <URLInput onSubmit={handleSubmit} isLoading={false} />}
        {appState === 'loading' && <LoadingState step={loadStep} />}
        {appState === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-6 py-4 text-sm font-ui text-center max-w-md">
              {errorMsg}
            </div>
            <button onClick={handleReset} className="px-6 py-2.5 bg-ink-blue text-white text-sm font-ui font-medium rounded-xl hover:bg-ink-blue/90 transition-all">
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Use case cards */}
      {appState === 'idle' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl animate-fade-in relative z-10">
          {USE_CASES.map((uc) => (
            <div key={uc.title} className="use-case-card group">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm border border-gray-100 group-hover:shadow-md transition-shadow">
                  {uc.icon}
                </div>
                <div>
                  <p className="font-ui font-semibold text-near-black text-sm leading-none">{uc.title}</p>
                  <p className="font-korean text-xs text-gray-400 leading-none mt-0.5">{uc.korean}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 font-ui leading-relaxed">{uc.desc}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-300 font-ui relative z-10 tracking-wide">
        Powered by Groq · Built with Next.js
      </p>
    </main>
  )
}
