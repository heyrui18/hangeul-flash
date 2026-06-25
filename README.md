# Hangeul on Demand — 한국어 플래시카드

> **AI-generated Korean flashcards from any YouTube video, instantly.**

Paste a Korean YouTube URL → captions are fetched → Groq (Llama 3.3-70b) analyses vocabulary sampled from across the full video → you get 20 polished flashcards covering vocabulary, phrases, and grammar patterns, tailored for advanced learners.

**Live at:** https://hangeul-flash.onrender.com

---

## What's new in v2

- **Full-video sampling** — instead of just the first few minutes, the AI samples from the beginning, middle, and end of the video to surface key vocabulary from the whole content
- **Randomised selection** — submitting the same URL twice gives a different set of 20 words each time
- **Two-column layout** — flashcard on the left, filter sidebar on the right (difficulty, TOPIK level, register, type)
- **Richer flashcard fields** — TOPIK level (I / II / advanced), formality register (formal / informal / honorific), source context sentence from the video
- **CSV export** — correctly encoded UTF-8 with BOM so Korean characters display in Excel and Google Sheets; includes all fields plus video metadata header
- **Korean-only captions** — all transcript methods now explicitly request Korean (`lang=ko`), preventing Chinese/English fallback captions
- **Prompt injection defence** — AI system prompt rejects any instructions embedded in transcripts
- **Session persistence** — last session is restored from localStorage (24h TTL)

---

## Prerequisites

- **Node.js 18+** — [download here](https://nodejs.org)
- **A free Groq API key** — [get one at console.groq.com](https://console.groq.com) (no credit card, takes ~1 min)
- *(Optional)* **A free Supadata API key** — [supadata.ai](https://supadata.ai) — primary transcript source; the app falls back to three other methods if absent

---

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.local.example .env.local

# 3. Add your keys to .env.local:
#    GROQ_API_KEY=gsk_...
#    SUPADATA_API_KEY=...  (optional but recommended)

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deploy to Render (free)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New → Web Service** → select your repo
3. Render auto-detects the `render.yaml` config
4. Under **Environment Variables**, add:
   - `GROQ_API_KEY` — your Groq key (starts with `gsk_`)
   - `SUPADATA_API_KEY` — your Supadata key (optional)
5. Click **Create Web Service** — deploy takes ~2 minutes

> **Note**: Render free tier spins down after 15 min of inactivity. First request after sleep takes ~30 s to wake up.

---

## Transcript extraction (4-method cascade)

The app tries four methods in order, stopping at the first success:

| # | Method | Notes |
|---|--------|-------|
| 1 | **Supadata API** | Fastest; requires `SUPADATA_API_KEY`; requests `lang=ko` |
| 2 | **youtube-transcript npm** | Works on non-geo-blocked IPs; Korean only |
| 3 | **YouTube timedtext JSON API** | Direct caption endpoint; Korean only |
| 4 | **ytInitialPlayerResponse** | Parses the YouTube watch page; Korean tracks only |

All methods have a 20-second timeout. Non-Korean transcripts are rejected before reaching the AI.

---

## Best YouTube videos to try

| Type | What to search |
|------|---------------|
| Korean cooking | Maangchi, 백종원의 요리비책 |
| K-drama clips | 드라마 명장면, 최고의 명대사 |
| Lifestyle vlogs | 일상 브이로그, 서울 일상 |
| News / documentary | KBS News, YTN |
| Language channels | 하루한국어, Korean Unnie |

---

## Importing the CSV to Anki

1. Export cards as CSV from the app
2. Open Anki → **File → Import**
3. Select the `.csv` file — Korean characters will display correctly (UTF-8 BOM encoded)
4. Set **Field separator** to Comma
5. Map: Field 1 = Korean, Field 2 = English, Field 3 = Romanisation, etc.
6. Click **Import**

---

## Tech stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 App Router (TypeScript) |
| AI | Groq — Llama 3.3-70b-versatile |
| Styling | Tailwind CSS |
| Hosting | Render (free tier) |
| Transcripts | Supadata API + youtube-transcript + timedtext + ytInitialPlayerResponse |
