# 한글 Flash — Project Context

## What this app does
A Next.js 15 web app that takes a Korean YouTube video URL, extracts the transcript, sends it to an AI API, and generates Korean language flashcards for an advanced/native-fluency learner. Deployed on Render (free tier).

## Live URLs
- App: https://hangeul-flash.onrender.com
- Health check: https://hangeul-flash.onrender.com/api/health
- Gemini diagnostic: https://hangeul-flash.onrender.com/api/test-gemini

## GitHub repo
https://github.com/heyrui18/hangeul-flash

## Local project path
C:\Users\lee_r\OneDrive\Desktop\claude\hangeul-flash

## Tech stack
- Next.js 15 (App Router)
- Tailwind CSS
- TypeScript
- `@google/genai` SDK (new Google SDK, supports `AQ.` key format)
- `youtube-transcript` npm package + manual fallbacks
- Render free tier (Singapore region)

## Current problem — UNRESOLVED
The AI (Gemini) quota is exhausted on the free tier from repeated testing during setup.

**Error:**
```json
{"code": 429, "message": "You exceeded your current quota..."}
```

**Two options to fix:**
1. **Wait** — Gemini free quota resets daily. Try again tomorrow.
2. **Switch to Groq** (recommended) — completely free, faster, generous limits.
   - Get key at console.groq.com (key starts with `gsk_`)
   - Run: `npm install groq-sdk` in the project folder
   - Update `lib/gemini.ts` to use Groq SDK with Llama 3 model
   - Update `GEMINI_API_KEY` → `GROQ_API_KEY` in Render environment variables

## API Key situation
- Google Gemini key format: `AQ.Ab8RN6L...` (new format, NOT `AIza`)
- Key is correctly set in Render environment variables
- SDK correctly updated to `@google/genai` (was `@google/generative-ai`)
- Issue is quota, not the key itself

## File structure
```
hangeul-flash/
├── app/
│   ├── page.tsx                  # Landing + loading + error UI (single page app)
│   ├── layout.tsx                # Fonts: Noto Serif KR, Outfit, DM Mono
│   ├── globals.css               # Flip card CSS + Tailwind
│   └── api/
│       ├── transcript/route.ts   # 3-approach YouTube transcript fetch
│       ├── generate/route.ts     # AI flashcard generation
│       ├── export/route.ts       # CSV export
│       ├── health/route.ts       # Silent health check (no AI calls)
│       └── test-gemini/route.ts  # Diagnostic — safe to delete after fix
├── components/
│   ├── URLInput.tsx              # YouTube URL input with paste button
│   ├── FlashCard.tsx             # 3D flip card, keyboard nav (Space/arrows)
│   ├── CardDeck.tsx              # Filter pills + progress bar
│   ├── ExportPanel.tsx           # CSV download
│   └── LoadingState.tsx          # 3-step progress indicator
├── lib/
│   ├── gemini.ts                 # AI call (currently Gemini, needs Groq switch)
│   ├── validate.ts               # Internal runtime validators (silent)
│   └── flashcard-types.ts        # TypeScript interfaces
├── .env.local                    # GEMINI_API_KEY (local only, gitignored)
├── render.yaml                   # Render deployment config
└── package.json
```

## Flashcard data structure
```typescript
interface Flashcard {
  id: string
  type: 'vocabulary' | 'phrase' | 'grammar'
  korean: string
  romanisation: string
  english: string
  exampleSentence: { korean: string; romanisation: string; english: string }
  grammarNote?: string
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced'
  sourceTimestamp?: string
  tags: string[]
}
```

## Transcript fetching (3 approaches in order)
1. `youtube-transcript` npm package (tries Korean then any language)
2. Direct timedtext JSON API (`/api/timedtext?v=...&fmt=json3`)
3. Page scrape — finds timedtext URLs embedded in YouTube HTML

## Design
- Background: `#FAF8F5` (warm off-white)
- Primary: `#1B2B5E` (ink blue)
- Accent: `#E8735A` (coral)
- Fonts: Noto Serif KR (Korean), Outfit (UI), DM Mono (romanisation)

## Environment variables needed
- `GEMINI_API_KEY` — in Render + local `.env.local`
- If switching to Groq: `GROQ_API_KEY` instead

## Git workflow
```bash
cd ~/OneDrive/Desktop/claude/hangeul-flash
# make changes
git add .
git commit -m "message"
git push
# Render auto-redeploys in ~2 min
```

## What works
- Full UI: landing page, flip cards, filters, CSV export
- Transcript fetching (3 fallback approaches)
- Internal silent validation on all routes
- Health check endpoint
- Render deployment pipeline

## What needs fixing
- AI generation broken due to Gemini quota exhaustion
- Recommended fix: switch `lib/gemini.ts` to use Groq SDK
