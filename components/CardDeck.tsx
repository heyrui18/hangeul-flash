'use client'

import { useState, useMemo } from 'react'
import { Download, RotateCcw, BookOpen, GraduationCap, MessageSquare, BarChart2, Layers } from 'lucide-react'
import { Flashcard, FilterType } from '@/lib/flashcard-types'
import FlashCard from './FlashCard'
import ExportPanel from './ExportPanel'

interface CardDeckProps {
  flashcards: Flashcard[]
  videoTitle: string
  videoUrl: string
  onReset: () => void
}

const FILTER_GROUPS = [
  {
    label: 'Type',
    icon: <BookOpen size={13} />,
    filters: [
      { label: 'All cards', value: 'all' as FilterType },
      { label: '단어 Vocabulary', value: 'vocabulary' as FilterType },
      { label: '표현 Phrase', value: 'phrase' as FilterType },
      { label: '문법 Grammar', value: 'grammar' as FilterType },
    ],
  },
  {
    label: 'Difficulty',
    icon: <BarChart2 size={13} />,
    filters: [
      { label: 'Beginner', value: 'beginner' as FilterType },
      { label: 'Intermediate', value: 'intermediate' as FilterType },
      { label: 'Advanced', value: 'advanced' as FilterType },
    ],
  },
  {
    label: 'TOPIK Level',
    icon: <GraduationCap size={13} />,
    filters: [
      { label: 'TOPIK I', value: 'topik-I' as FilterType },
      { label: 'TOPIK II', value: 'topik-II' as FilterType },
    ],
  },
  {
    label: 'Register',
    icon: <MessageSquare size={13} />,
    filters: [
      { label: 'Formal', value: 'formal' as FilterType },
      { label: 'Informal', value: 'informal' as FilterType },
    ],
  },
]

const ALL_FILTERS = FILTER_GROUPS.flatMap((g) => g.filters)

function getFilterLabel(value: FilterType): string {
  return ALL_FILTERS.find((f) => f.value === value)?.label ?? value
}

const difficultyDot: Record<string, string> = {
  beginner: 'bg-emerald-400',
  intermediate: 'bg-amber-400',
  advanced: 'bg-rose-400',
}

export default function CardDeck({ flashcards, videoTitle, videoUrl, onReset }: CardDeckProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showExport, setShowExport] = useState(false)

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return flashcards
    if (activeFilter === 'vocabulary' || activeFilter === 'phrase' || activeFilter === 'grammar')
      return flashcards.filter((c) => c.type === activeFilter)
    if (activeFilter === 'beginner' || activeFilter === 'intermediate' || activeFilter === 'advanced')
      return flashcards.filter((c) => c.difficultyLevel === activeFilter)
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
  const safeIndex = Math.min(currentIndex, Math.max(0, filtered.length - 1))

  // Difficulty breakdown for sidebar mini-stats
  const stats = useMemo(() => ({
    beginner: flashcards.filter((c) => c.difficultyLevel === 'beginner').length,
    intermediate: flashcards.filter((c) => c.difficultyLevel === 'intermediate').length,
    advanced: flashcards.filter((c) => c.difficultyLevel === 'advanced').length,
  }), [flashcards])

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      {/* Two-column layout: card left, sidebar right */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── Left: Flash card ─────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Layers size={32} className="text-gray-300" />
              <p className="text-gray-400 font-ui">No cards match this filter.</p>
              <button
                onClick={() => handleFilterChange('all')}
                className="text-sm text-ink-blue font-ui hover:underline"
              >
                Show all cards
              </button>
            </div>
          ) : (
            <FlashCard
              card={filtered[safeIndex]}
              onNext={handleNext}
              onPrev={handlePrev}
              cardIndex={safeIndex}
              total={filtered.length}
            />
          )}
        </div>

        {/* ── Right: Sidebar ───────────────────────────────── */}
        <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-4">

          {/* Video source card */}
          <div className="sidebar-card">
            <p className="sidebar-label">Source video</p>
            <p className="text-sm font-ui font-medium text-near-black line-clamp-2 leading-snug">
              {videoTitle || 'Korean Video'}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                {filtered.length > 0 && (
                  <div
                    className="h-full bg-ink-blue rounded-full transition-all duration-300"
                    style={{ width: `${((safeIndex + 1) / filtered.length) * 100}%` }}
                  />
                )}
              </div>
              <span className="text-xs font-ui text-gray-400 shrink-0">
                {filtered.length > 0 ? `${safeIndex + 1} / ${filtered.length}` : '0'}
              </span>
            </div>
          </div>

          {/* Difficulty breakdown */}
          <div className="sidebar-card">
            <p className="sidebar-label">Deck breakdown</p>
            <div className="flex flex-col gap-2 mt-1">
              {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                <div key={level} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${difficultyDot[level]}`} />
                  <span className="text-xs font-ui text-gray-600 capitalize flex-1">{level}</span>
                  <span className="text-xs font-ui font-medium text-gray-800">{stats[level]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          {FILTER_GROUPS.map((group) => (
            <div key={group.label} className="sidebar-card">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-gray-400">{group.icon}</span>
                <p className="sidebar-label">{group.label}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.filters.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => handleFilterChange(f.value)}
                    className={`px-3 py-1 rounded-full text-xs font-ui font-medium transition-all ${
                      activeFilter === f.value
                        ? 'bg-ink-blue text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-ink-blue/10 hover:text-ink-blue'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Export */}
          <button
            onClick={() => setShowExport((s) => !s)}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-ui font-medium text-gray-500 hover:border-coral hover:text-coral transition-all"
          >
            <Download size={14} />
            Export as CSV
          </button>

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

          {/* Reset */}
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-1.5 text-xs text-gray-400 font-ui hover:text-ink-blue transition-colors py-1"
          >
            <RotateCcw size={12} />
            Try another video
          </button>
        </aside>
      </div>
    </div>
  )
}
