'use client'

interface LoadingStateProps {
  step: 1 | 2 | 3
}

const steps = [
  { label: 'Fetching transcript', emoji: '⏳' },
  { label: 'Analysing Korean content', emoji: '🔍' },
  { label: 'Building your flashcards', emoji: '🃏' },
]

export default function LoadingState({ step }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center gap-8 py-16 animate-fade-in">
      {/* Animated Korean character */}
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-ink-blue flex items-center justify-center shadow-lg">
          <span className="font-korean text-3xl text-white select-none">한</span>
        </div>
        <div className="absolute inset-0 rounded-2xl bg-ink-blue animate-ping opacity-20" />
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
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
              <span className="text-lg">{isDone ? '✅' : s.emoji}</span>
              <span
                className={`text-sm font-ui ${
                  isActive ? 'text-ink-blue font-medium' : 'text-gray-500'
                }`}
              >
                {s.label}
                {isActive && (
                  <span className="ml-1 inline-flex gap-0.5">
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
      <div className="w-full max-w-sm space-y-3 mt-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-14 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
