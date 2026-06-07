'use client'

import { useState } from 'react'
import { Link, ClipboardPaste, Sparkles } from 'lucide-react'

interface URLInputProps {
  onSubmit: (url: string) => void
  isLoading: boolean
}

function isValidYouTubeURL(url: string): boolean {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)/.test(url)
}

export default function URLInput({ onSubmit, isLoading }: URLInputProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setUrl(text)
      setError('')
    } catch {
      // Clipboard access denied — user can type manually
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmed = url.trim()
    if (!trimmed) {
      setError('Please enter a YouTube URL.')
      return
    }
    if (!isValidYouTubeURL(trimmed)) {
      setError(
        'That doesn\'t look like a YouTube URL. Try: https://www.youtube.com/watch?v=...'
      )
      return
    }

    onSubmit(trimmed)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto">
      <div className="relative flex items-center gap-2">
        {/* URL icon */}
        <div className="absolute left-4 text-gray-400 pointer-events-none">
          <Link size={18} />
        </div>

        {/* Input */}
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setError('')
          }}
          placeholder="https://www.youtube.com/watch?v=..."
          disabled={isLoading}
          className="w-full pl-10 pr-28 py-4 rounded-2xl border-2 border-gray-200 bg-white text-near-black font-ui text-sm placeholder-gray-400 focus:outline-none focus:border-ink-blue transition-colors shadow-sm disabled:opacity-60"
          aria-label="YouTube video URL"
        />

        {/* Paste button */}
        <button
          type="button"
          onClick={handlePaste}
          disabled={isLoading}
          className="absolute right-[6.5rem] text-gray-400 hover:text-ink-blue transition-colors p-1 rounded"
          title="Paste from clipboard"
          aria-label="Paste URL"
        >
          <ClipboardPaste size={18} />
        </button>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="absolute right-3 flex items-center gap-1.5 px-4 py-2 bg-ink-blue text-white text-sm font-ui font-medium rounded-xl hover:bg-ink-blue/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          <Sparkles size={14} />
          Generate
        </button>
      </div>

      {/* Inline error */}
      {error && (
        <p className="mt-2 text-sm text-red-500 font-ui px-1">{error}</p>
      )}
    </form>
  )
}
