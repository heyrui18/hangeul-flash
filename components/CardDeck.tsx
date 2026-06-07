'use client'

import { useState, useMemo } from 'react'
import { Flashcard, FilterType } from '@/lib/flashcard-types'
import FlashCard from './FlashCard'
import ExportPanel from './ExportPanel'

interface CardDeckProps {
  flashcards: Flashcard[]
  onReset: () => void
}

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'All', value: 'all' },
  { label: '단어 Vocab', value: 'vocabulary' },
  { label: '표현 Phrase', value: 'phrase' },
  { label: '문법 Grammar', value: 'grammar' },
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
]

export default function CardDeck({ flashcards, onReset }: CardDeckProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showExport, setShowExport] = useState(false)

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return flashcards
    return flashcards.filter(
      (c) => c.type === activeFilter || c.difficultyLevel === activeFilter
    )
  }, [flashcards, activeFilter])

  // Reset index when filter changes
  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter)
    setCurrentIndex(0)
  }

  const handleNext = () => setCurrentIndex((i) => Math.min(i + 1, filtered.length - 1))
  const handlePrev = () => setCurrentIndex((i) => Math.max(i - 1, 0))

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 font-ui">No cards match this filter.</p>
        <button
          onClick={() => handleFilterChange('all')}
          className="mt-4 text-sm text-ink-blue font-ui hover:underline"
        >
          Show all cards
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg mx-auto">
      {/* Top bar: filter + export */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-ui font-medium transition-all ${
                activeFilter === f.value
                  ? 'bg-ink-blue text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-ink-blue hover:text-ink-blue'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowExport((s) => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-ui font-medium border border-gray-200 text-gray-600 hover:border-coral hover:text-coral transition-all bg-white"
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Export panel */}
      {showExport && (
        <ExportPanel flashcards={filtered} onClose={() => setShowExport(false)} />
      )}

      {/* Flash card */}
      <FlashCard
        card={filtered[currentIndex]}
        onNext={handleNext}
        onPrev={handlePrev}
        cardIndex={currentIndex}
        total={filtered.length}
      />

      {/* Back to start */}
      <div className="text-center">
        <button
          onClick={onReset}
          className="text-xs text-gray-400 font-ui hover:text-ink-blue transition-colors"
        >
          ← Try another video
        </button>
      </div>
    </div>
  )
}
