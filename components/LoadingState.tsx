'use client'

interface LoadingStateProps {
  step: 1 | 2 | 3
}

const steps = [
  { label: 'Fetching transcript', icon: '⏳' },
  { label: 'Analysing Korean content', icon: '🔍' },
  { label: 'Building your flashcards', icon: '🃏' },
]

export default function LoadingState({ step }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center gap-8 py-16 animate-fade-in">
      {/* Animated Korean character */}
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-ink-blue flex items-center justify-center shadow-lg">
          <span className="font-korean text-3xl text-white select-none" aria-hidden="true">한</span>
        </div>
        <div className="absolute inset-0 rounded-2xl bg-ink-blue animate-ping opacity-20" aria-hidden="true" />
      </div>

      {/* Estimated time */}
      <p className="text-xs text-gray-400 font-ui -mt-4">
        Usually takes 10–20 seconds — Groq is working on it.
      </p>

      {/* Steps */}
      <div className="flex flex-col gap-3 w-full max-w-xs" role="status" aria-live="polite" aria-label={`Step ${step} of 3: ${steps[step - 1]?.label}`}>
        {steps.map((s, i) => {
          const idx = i + 1
          const isDone = step > idx
          const isActive = step === idx
          return (
            <div
              key={idx}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-ink-blue/10 border border-ink-blue/20'
                  : isDone
                  ? 'opacity-50'
                  : 'opacity-30'
              }`}
            >
              <span className="text-lg" aria-hidden="true">{isDone ? '✅' : s.icon}</span>
              <span
                className={`text-sm font-ui ${
                  isActive ? 'text-ink-blue font-medium' : 'text-gray-500'
                }`}
              >
                {s.label}
                {isDone && <span className="sr-only"> (done)</span>}
                {isActive && (
                  <span className="ml-1 inline-flex gap-0.5" aria-hidden="true">
                    <span className="animate-bounce delay-0">.</span>
                    <span className="animate-bounce delay-100">.</span>
                    <span className="animate-bounce delay-200">.</span>
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>

      {/* Skeleton cards */}
      <div className="w-full max-w-sm space-y-3 mt-4" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-14 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
