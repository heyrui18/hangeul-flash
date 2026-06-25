'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Flashcard } from '@/lib/flashcard-types'

interface FlashCardProps {
  card: Flashcard
  onNext: () => void
  onPrev: () => void
  cardIndex: number
  total: number
}

const difficultyColour: Record<string, string> = {
  beginner: 'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced: 'bg-rose-100 text-rose-700',
}

const topikColour: Record<string, string> = {
  I: 'bg-sky-100 text-sky-700',
  II: 'bg-violet-100 text-violet-700',
  advanced: 'bg-rose-100 text-rose-700',
}

const typeLabel: Record<string, string> = {
  vocabulary: '단어',
  phrase: '표현',
  grammar: '문법',
}

const ROMAN_KEY = 'hf_show_roman'

export default function FlashCard({ card, onNext, onPrev, cardIndex, total }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false)
  const [showRoman, setShowRoman] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try { return localStorage.getItem(ROMAN_KEY) === 'true' } catch { return false }
  })

  // Reset flip when card changes
  useEffect(() => {
    setFlipped(false)
  }, [card.id])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped((f) => !f)
      }
      if (e.key === 'ArrowRight') onNext()
      if (e.key === 'ArrowLeft') onPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onNext, onPrev])

  const toggleRoman = () => {
    const next = !showRoman
    setShowRoman(next)
    try { localStorage.setItem(ROMAN_KEY, String(next)) } catch { }
  }

  return (
    <div className="w-full flex flex-col items-center gap-6 animate-fade-in">
      {/* Progress bar */}
      <div className="w-full max-w-lg">
        <div className="flex justify-between items-center mb-2 text-xs font-ui text-gray-500">
          <span>Card {cardIndex + 1} of {total}</span>
          <div className="flex items-center gap-3">
            {/* Romanisation toggle */}
            <button
              onClick={toggleRoman}
              className="flex items-center gap-1 text-gray-400 hover:text-ink-blue transition-colors"
              aria-label={showRoman ? 'Hide romanisation' : 'Show romanisation'}
              title={showRoman ? 'Hide romanisation' : 'Show romanisation'}
            >
              {showRoman ? <EyeOff size={13} /> : <Eye size={13} />}
              <span className="font-ui text-xs">Roman</span>
            </button>
            <span className="font-medium text-ink-blue">{Math.round(((cardIndex + 1) / total) * 100)}%</span>
          </div>
        </div>
        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-ink-blue rounded-full transition-all duration-300"
            style={{ width: `${((cardIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Card — responsive height instead of fixed 420px */}
      <div
        className="flip-card w-full max-w-lg cursor-pointer select-none"
        onClick={() => setFlipped((f) => !f)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setFlipped((f) => !f)}
        aria-label={flipped ? 'Show Korean (press Space to flip)' : 'Show English translation (press Space to flip)'}
      >
        <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
          {/* FRONT — Korean */}
          <div className="flip-card-front bg-white rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center justify-center p-8 gap-4 relative overflow-hidden">
            {/* Accent stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl" style={{ background: 'linear-gradient(90deg, #1B2B5E, #3B5CB8, #E8735A)' }} aria-hidden="true" />
            {/* Type badge */}
            <span className="text-xs font-ui font-medium px-3 py-1 rounded-full bg-ink-blue/10 text-ink-blue">
              {typeLabel[card.type] ?? card.type}
            </span>

            {/* Korean */}
            <p className="font-korean text-5xl text-center text-near-black leading-tight">
              {card.korean}
            </p>

            {/* Romanisation — hidden by default, toggled via button */}
            {showRoman && (
              <p className="font-mono text-base text-gray-400 tracking-wide">
                {card.romanisation}
              </p>
            )}

            {card.sourceTimestamp && (
              <p className="text-xs text-gray-300 font-ui mt-auto" aria-hidden="true">
                ⏱ {card.sourceTimestamp}
              </p>
            )}

            {/* Flip hint */}
            <p className="text-xs text-gray-300 font-ui mt-2">
              Click or press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-400">Space</kbd> to flip
            </p>
          </div>

          {/* BACK — definition + details */}
          <div className="flip-card-back bg-white rounded-3xl shadow-lg border border-gray-100 p-8 flex flex-col gap-5">
            {/* Definition */}
            <div>
              <p className="text-xs font-ui font-medium text-gray-400 uppercase tracking-wide mb-2">Definition</p>
              <p className="text-base font-ui text-near-black leading-relaxed">
                {card.english}
              </p>
            </div>

            {/* Example sentence */}
            {card.exampleSentence?.korean && (
              <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-1.5">
                <p className="font-korean text-lg text-near-black leading-snug">
                  {card.exampleSentence.korean}
                </p>
                {showRoman && (
                  <p className="font-mono text-xs text-gray-400">
                    {card.exampleSentence.romanisation}
                  </p>
                )}
                <p className="font-ui text-sm text-gray-600">
                  {card.exampleSentence.english}
                </p>
              </div>
            )}

            {/* Source context — original transcript sentence */}
            {card.sourceContext && (
              <div className="border-l-2 border-gray-200 pl-4">
                <p className="text-xs font-ui font-medium text-gray-400 uppercase tracking-wide mb-1">
                  From the video
                </p>
                <p className="text-sm font-korean text-gray-500 leading-relaxed italic">
                  {card.sourceContext}
                </p>
              </div>
            )}

            {/* Grammar note */}
            {card.grammarNote && (
              <div className="border-l-2 border-coral pl-4">
                <p className="text-xs font-ui font-medium text-coral uppercase tracking-wide mb-1">
                  Grammar note
                </p>
                <p className="text-sm font-ui text-gray-600 leading-relaxed">
                  {card.grammarNote}
                </p>
              </div>
            )}

            {/* Footer: badges + tags */}
            <div className="mt-auto flex flex-wrap items-center gap-2">
              <span className={`text-xs font-ui font-medium px-2.5 py-1 rounded-full ${difficultyColour[card.difficultyLevel]}`}>
                {card.difficultyLevel}
              </span>
              {card.topikLevel && card.topikLevel !== 'unknown' && (
                <span className={`text-xs font-ui font-medium px-2.5 py-1 rounded-full ${topikColour[card.topikLevel] ?? 'bg-gray-100 text-gray-600'}`}>
                  TOPIK {card.topikLevel}
                </span>
              )}
              {card.formality && card.formality !== 'neutral' && (
                <span className="text-xs font-ui font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                  {card.formality}
                </span>
              )}
              {card.tags?.map((tag) => (
                <span key={tag} className="tag-pill">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-4">
        <button
          onClick={onPrev}
          disabled={cardIndex === 0}
          className="px-6 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-ui font-medium text-gray-600 hover:border-ink-blue hover:text-ink-blue transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous card"
        >
          ← Prev
        </button>

        <button
          onClick={() => setFlipped((f) => !f)}
          className="px-6 py-2.5 rounded-xl bg-ink-blue/10 text-ink-blue text-sm font-ui font-medium hover:bg-ink-blue/20 transition-all"
          aria-label="Flip card"
        >
          Flip
        </button>

        <button
          onClick={onNext}
          disabled={cardIndex === total - 1}
          className="px-6 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-ui font-medium text-gray-600 hover:border-ink-blue hover:text-ink-blue transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next card"
        >
          Next →
        </button>
      </div>

      {/* Keyboard hints */}
      <p className="text-xs text-gray-300 font-ui">
        <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-400">←</kbd>{' '}
        <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-400">→</kbd> to navigate
        {'  '}
        <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-400">Space</kbd> to flip
      </p>
    </div>
  )
}
