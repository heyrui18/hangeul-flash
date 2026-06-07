# 한글 Flash

Turn any Korean YouTube video into AI-generated flashcards — instantly, for free.

Paste a YouTube URL → the app fetches the video's Korean captions → Google Gemini analyses the transcript → you get 15–30 polished flashcards covering vocabulary, phrases, and grammar patterns, tailored for advanced learners.

---

## Prerequisites

- **Node.js 18+** — [download here](https://nodejs.org)
- **A free Gemini API key** — [get one at aistudio.google.com](https://aistudio.google.com) (no credit card needed)

---

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Copy the environment variable template
cp .env.local.example .env.local

# 3. Open .env.local and paste your Gemini API key
#    GEMINI_API_KEY=AIza...

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deploy to Render (free)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) and sign in with GitHub
3. Click **New → Web Service** → select your repo
4. Render will auto-detect the `render.yaml` config
5. Under **Environment Variables**, add:
   - Key: `GEMINI_API_KEY`
   - Value: your API key from aistudio.google.com
6. Click **Create Web Service** — deploy takes ~2 minutes

Your app will be live at `https://hangeul-flash.onrender.com` (or similar).

> **Note**: Render free tier spins down after 15 minutes of inactivity. The first request after sleep takes ~30 seconds to wake up.

---

## Best YouTube videos to try

| Type | What to search |
|------|---------------|
| Korean cooking | Maangchi, 백종원의 요리비책, 숟가락 |
| K-drama clips | 드라마 명장면, 최고의 명대사 |
| Lifestyle vlogs | 일상 브이로그, 서울 일상 |
| News & documentary | KBS News, YTN |
| Language channels | 하루한국어, Korean Unnie |

---

## Importing to Anki

1. Export your cards as CSV from the app
2. Open Anki → **File → Import**
3. Select the downloaded `.csv` file
4. Set **Field separator** to Comma
5. Map fields: Field 1 = Korean, Field 2 = English (+ Romanisation)
6. Click **Import**

---

## Known limitations

- Videos without captions (auto-generated or manual) cannot be processed
- Auto-generated captions may contain errors — the AI does its best to work around them
- The Gemini free tier has rate limits (15 requests/minute) — if you hit them, wait 60 seconds and try again
- Very long videos (1h+) are trimmed to the first ~12,000 characters of transcript

---

## v2 ideas (not built yet)

- User accounts + saved decks (Supabase)
- Spaced repetition scheduling (SM-2 algorithm)
- Audio pronunciation via TTS
- Upload your own `.srt` subtitle file
- Browser extension: "Generate flashcards" button on any YouTube page
- Support for other target languages
