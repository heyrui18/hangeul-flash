import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAF8F5',
        'ink-blue': '#1B2B5E',
        coral: '#E8735A',
        'near-black': '#1A1A1A',
      },
      fontFamily: {
        korean: ['var(--font-korean)', 'serif'],
        ui: ['var(--font-ui)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out forwards',
      },
    },
  },
  plugins: [],
}

export default config
