'use client'

import { useState } from 'react'
import { Download, X } from 'lucide-react'
import { Flashcard, FilterType } from '@/lib/flashcard-types'

interface ExportPanelProps {
  flashcards: Flashcard[]
  videoTitle: string
  videoUrl: string
  activeFilter: FilterType
  filterLabel: string
  onClose: () => void
}

const PREVIEW_COLUMNS = ['Korean', 'English', 'TOPIK', 'Formality', 'Type', 'Difficulty']

export default function ExportPanel({
  flashcards,
  videoTitle,
  videoUrl,
  activeFilter,
  filterLabel,
  onClose,
}: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')

  const handleExport = async () => {
    setIsExporting(true)
    setError('')
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flashcards,
          videoTitle,
          videoUrl,
          filterLabel: activeFilter !== 'all' ? filterLabel : 'all',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Export failed')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      // Use the Content-Disposition filename from the server if available
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="([^"]+)"/)
      a.download = match?.[1] ?? 'hangeul-flash-export.csv'

      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-ui font-semibold text-near-black text-sm">Export flashcards</h3>
          <p className="text-xs text-gray-500 font-ui mt-0.5">
            {flashcards.length} card{flashcards.length !== 1 ? 's' : ''}
            {activeFilter !== 'all' ? (
              <span className="ml-1 px-1.5 py-0.5 bg-ink-blue/10 text-ink-blue rounded-full">
                {filterLabel} filter
              </span>
            ) : null}
            {' '}will be exported
          </p>
          {videoTitle && (
            <p className="text-xs text-gray-400 font-ui mt-0.5 truncate max-w-xs" title={videoTitle}>
              {videoTitle}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close export panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* CSV column preview */}
      <div className="bg-gray-50 rounded-xl p-3 mb-3 text-xs font-mono text-gray-500 overflow-x-auto whitespace-nowrap">
        Korean, Romanisation, English, Source Context, TOPIK Level, Formality, Example (KR), Example (Romanisation), Example (EN), Grammar Note, Type, Difficulty, Tags
      </div>

      {/* Data preview table — first 5 cards */}
      {flashcards.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-ui text-gray-400 mb-1.5">
            Preview (first {Math.min(5, flashcards.length)} of {flashcards.length} cards):
          </p>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-xs font-ui min-w-[480px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  {PREVIEW_COLUMNS.map((col) => (
                    <th key={col} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flashcards.slice(0, 5).map((card, i) => (
                  <tr key={card.id ?? i} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-korean text-near-black">{card.korean}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-[160px] truncate" title={card.english}>
                      {card.english.split(';')[0].slice(0, 40)}{card.english.length > 40 ? '…' : ''}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{card.topikLevel ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{card.formality ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{card.type}</td>
                    <td className="px-3 py-2 text-gray-500">{card.difficultyLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 font-ui mb-4">
        Works with Google Sheets, Excel, and Anki. The CSV includes a Source Context column with the original transcript sentence.
      </p>

      {error && <p className="text-xs text-red-500 font-ui mb-3">{error}</p>}

      <button
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center gap-2 w-full justify-center py-2.5 bg-ink-blue text-white text-sm font-ui font-medium rounded-xl hover:bg-ink-blue/90 transition-all disabled:opacity-60"
      >
        <Download size={15} aria-hidden="true" />
        {isExporting ? 'Downloading...' : 'Download CSV'}
      </button>
    </div>
  )
}
