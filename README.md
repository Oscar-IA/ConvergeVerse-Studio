# ConvergeVerse Studio

Autonomous Anime Creator — Bond Converge Universe. Pipeline Manga-Flow: Story Beat → Script → Panels.

## Stack

- **Frontend**: Next.js 14 (App Router), Brutalist/Minimalist UI
- **Backend**: Python FastAPI, multi-agent (Script, Image, Sound)
- **Lore**: JSON files in `lore/` (Universe Bible)
- **Ideas del autor**: Markdown en **`IDEAS.pages/IDEAS.md`** (carpeta en la raíz del repo). El Story Engine lo inyecta al generar capítulos para adaptar trama sin llenar solo la cola en Supabase — ver **`docs/AUTHOR_IDEAS_FILE.md`**.

## Setup

### Backend (Python)

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

Create `apps/api/.env` (copy from `apps/api/.env.example`):

| Variable | Role |
|----------|------|
| `ANTHROPIC_API_KEY` | **ScriptAgent (Claude)** — used **first** if set. Default model `claude-3-5-sonnet-20241022` (override with `ANTHROPIC_MODEL`). |
| `OPENAI_API_KEY` | **ScriptAgent (GPT)** — used if Anthropic is not set. Default `gpt-4o`. |
| `REPLICATE_API_TOKEN` | **ImageAgent** — Flux Schnell on Replicate for real manga panels. Without it, panels have no image URL. |

**Visual pipeline:** every image prompt automatically appends: `Solo Leveling style, high contrast, blue aura energy` (+ cel-shading / quality tags) so Flux stays on-brand.

Run API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (Next.js)

```bash
npm install
npm run dev
```

Create `apps/web/.env.local` (optional; see `apps/web/.env.example`):

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

The frontend **must** call the API on **port 8000**, not the Next.js port (3000/3001). CORS on the API allows `localhost:3000` and `localhost:3001`.

## Usage

1. Open http://localhost:3000
2. Open **MANGA ARCHIVE** (`/manga`) — brutalist reader wired to the Python API
3. Enter a story beat → **Generate Manga** (flip view or vertical strip)
4. Header shows **API LIVE** when `GET /health` on the FastAPI backend succeeds

Legacy URL `/manga-flow` redirects to `/manga`.

## Structure

```
apps/
  web/     — Next.js (The Weaver dashboard, Manga-Flow editor)
  api/     — FastAPI (pipeline, agents)
lore/      — Bond Converge universe (worlds, factions, characters, orbets)
```

## Agents

- **ScriptAgent**: **Anthropic Claude** (if `ANTHROPIC_API_KEY`) or **OpenAI** (`OPENAI_API_KEY`) — script + structured panels
- **ImageAgent**: **Replicate** Flux first; if it fails or there’s no token → **Pollinations.ai** URL (free, prompt-based); last resort → **Unsplash** dark mood placeholders. Set `POLLINATIONS_FALLBACK=false` to skip Pollinations.
- **SoundAgent**: Placeholder for future (ElevenLabs, Suno, etc.)
