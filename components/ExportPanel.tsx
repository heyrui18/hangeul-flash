'use client'

import { useState } from 'react'
import { Download, X } from 'lucide-react'
import { Flashcard } from '@/lib/flashcard-types'

interface ExportPanelProps {
  flashcards: Flashcard[]
  onClose: () => void
}

export default function ExportPanel({ flashcards, onClose }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')

  const handleExport = async () => {
    setIsExporting(true)
    setError('')
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flashcards }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Export failed')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'hangeul-flash-export.csv'
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
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-ui font-semibold text-near-black text-sm">Export flashcards</h3>
          <p className="text-xs text-gray-500 font-ui mt-0.5">
            {flashcards.length} cards will be exported as CSV
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close export panel"
        >
          <X size={16} />
        </button>
      </div>

      <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs font-mono text-gray-500">
        Korean, Romanisation, English, Example (KR), Example (Romanisation), Example (EN), Grammar Note, Type, Difficulty, Tags
      </div>

      <p className="text-xs text-gray-400 font-ui mb-4">
        Works with Google Sheets, Excel, and can be imported into Anki.
      </p>

      {error && <p className="text-xs text-red-500 font-ui mb-3">{error}</p>}

      <button
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center gap-2 w-full justify-center py-2.5 bg-ink-blue text-white text-sm font-ui font-medium rounded-xl hover:bg-ink-blue/90 transition-all disabled:opacity-60"
      >
        <Download size={15} />
        {isExporting ? 'Downloading...' : 'Download CSV'}
      </button>
    </div>
  )
}
