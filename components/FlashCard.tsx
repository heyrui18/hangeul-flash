'use client'

import { useState, useEffect } from 'react'
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

const typeLabel: Record<string, string> = {
  vocabulary: '단어',
  phrase: '표현',
  grammar: '문법',
}

export default function FlashCard({ card, onNext, onPrev, cardIndex, total }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false)

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

  return (
    <div className="w-full flex flex-col items-center gap-6 animate-fade-in">
      {/* Progress bar */}
      <div className="w-full max-w-lg">
        <div className="flex justify-between items-center mb-2 text-xs font-ui text-gray-500">
          <span>Card {cardIndex + 1} of {total}</span>
          <span className="font-medium text-ink-blue">{Math.round(((cardIndex + 1) / total) * 100)}%</span>
        </div>
        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-ink-blue rounded-full transition-all duration-300"
            style={{ width: `${((cardIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        className="flip-card w-full max-w-lg cursor-pointer select-none"
        style={{ height: '420px' }}
        onClick={() => setFlipped((f) => !f)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setFlipped((f) => !f)}
        aria-label={flipped ? 'Show Korean (press Space to flip)' : 'Show English translation (press Space to flip)'}
      >
        <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`} style={{ height: '100%' }}>
          {/* FRONT — Korean */}
          <div className="flip-card-front h-full bg-white rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center justify-center p-8 gap-4">
            {/* Type badge */}
            <span className="text-xs font-ui font-medium px-3 py-1 rounded-full bg-ink-blue/10 text-ink-blue">
              {typeLabel[card.type] ?? card.type}
            </span>

            {/* Korean */}
            <p className="font-korean text-5xl text-center text-near-black leading-tight">
              {card.korean}
            </p>

            {/* Romanisation */}
            <p className="font-mono text-base text-gray-400 tracking-wide">
              {card.romanisation}
            </p>

            {card.sourceTimestamp && (
              <p className="text-xs text-gray-300 font-ui mt-auto">
                ⏱ {card.sourceTimestamp}
              </p>
            )}

            {/* Flip hint */}
            <p className="text-xs text-gray-300 font-ui mt-2">
              Click or press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-400">Space</kbd> to flip
            </p>
          </div>

          {/* BACK — definition + details */}
          <div className="flip-card-back bg-white rounded-3xl shadow-lg border border-gray-100 p-8 flex flex-col gap-5 overflow-y-auto">
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
                <p className="font-mono text-xs text-gray-400">
                  {card.exampleSentence.romanisation}
                </p>
                <p className="font-ui text-sm text-gray-600">
                  {card.exampleSentence.english}
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

            {/* Footer: difficulty + tags */}
            <div className="mt-auto flex flex-wrap items-center gap-2">
              <span
                className={`text-xs font-ui font-medium px-2.5 py-1 rounded-full ${difficultyColour[card.difficultyLevel]}`}
              >
                {card.difficultyLevel}
              </span>
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
        >
          ← Prev
        </button>

        <button
          onClick={() => setFlipped((f) => !f)}
          className="px-6 py-2.5 rounded-xl bg-ink-blue/10 text-ink-blue text-sm font-ui font-medium hover:bg-ink-blue/20 transition-all"
        >
          Flip
        </button>

        <button
          onClick={onNext}
          disabled={cardIndex === total - 1}
          className="px-6 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-ui font-medium text-gray-600 hover:border-ink-blue hover:text-ink-blue transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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
