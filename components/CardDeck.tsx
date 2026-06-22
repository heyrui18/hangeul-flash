'use client'

import { useState, useMemo } from 'react'
import { Flashcard, FilterType } from '@/lib/flashcard-types'
import FlashCard from './FlashCard'
import ExportPanel from './ExportPanel'

interface CardDeckProps {
  flashcards: Flashcard[]
  videoTitle: string
  videoUrl: string
  onReset: () => void
}

const FILTERS: { label: string; value: FilterType; group?: string }[] = [
  { label: 'All', value: 'all' },
  { label: '단어 Vocab', value: 'vocabulary', group: 'type' },
  { label: '표현 Phrase', value: 'phrase', group: 'type' },
  { label: '문법 Grammar', value: 'grammar', group: 'type' },
  { label: 'Beginner', value: 'beginner', group: 'difficulty' },
  { label: 'Intermediate', value: 'intermediate', group: 'difficulty' },
  { label: 'Advanced', value: 'advanced', group: 'difficulty' },
  { label: 'TOPIK I', value: 'topik-I', group: 'topik' },
  { label: 'TOPIK II', value: 'topik-II', group: 'topik' },
  { label: 'Formal', value: 'formal', group: 'formality' },
  { label: 'Informal', value: 'informal', group: 'formality' },
]

function getFilterLabel(value: FilterType): string {
  return FILTERS.find((f) => f.value === value)?.label ?? value
}

export default function CardDeck({ flashcards, videoTitle, videoUrl, onReset }: CardDeckProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showExport, setShowExport] = useState(false)

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return flashcards
    if (activeFilter === 'vocabulary' || activeFilter === 'phrase' || activeFilter === 'grammar') {
      return flashcards.filter((c) => c.type === activeFilter)
    }
    if (activeFilter === 'beginner' || activeFilter === 'intermediate' || activeFilter === 'advanced') {
      return flashcards.filter((c) => c.difficultyLevel === activeFilter)
    }
    if (activeFilter === 'topik-I') return flashcards.filter((c) => c.topikLevel === 'I')
    if (activeFilter === 'topik-II') return flashcards.filter((c) => c.topikLevel === 'II')
    if (activeFilter === 'formal') return flashcards.filter((c) => c.formality === 'formal')
    if (activeFilter === 'informal') return flashcards.filter((c) => c.formality === 'informal')
    return flashcards
  }, [flashcards, activeFilter])

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter)
    setCurrentIndex(0)
    setShowExport(false)
  }

  const handleNext = () => setCurrentIndex((i) => Math.min(i + 1, filtered.length - 1))
  const handlePrev = () => setCurrentIndex((i) => Math.max(i - 1, 0))

  // Safety clamp: in case filter produces fewer cards than current index
  const safeIndex = Math.min(currentIndex, Math.max(0, filtered.length - 1))

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
      {/* Filter bar — horizontally scrollable on mobile */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none flex-1 min-w-0">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-ui font-medium transition-all whitespace-nowrap shrink-0 ${
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-ui font-medium border border-gray-200 text-gray-600 hover:border-coral hover:text-coral transition-all bg-white shrink-0"
          aria-label="Toggle export panel"
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Export panel */}
      {showExport && (
        <ExportPanel
          flashcards={filtered}
          videoTitle={videoTitle}
          videoUrl={videoUrl}
          activeFilter={activeFilter}
          filterLabel={getFilterLabel(activeFilter)}
          onClose={() => setShowExport(false)}
        />
      )}

      {/* Flash card */}
      <FlashCard
        card={filtered[safeIndex]}
        onNext={handleNext}
        onPrev={handlePrev}
        cardIndex={safeIndex}
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
