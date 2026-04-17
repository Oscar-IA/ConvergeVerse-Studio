# Narración «La Voz del Multiverso» (OpenAI TTS + Storage)

El backend genera audio con **OpenAI Speech** (`tts-1-hd` por defecto) y sube los `.mp3` a **Supabase Storage**.

## 1. Columna en Postgres

Si tu tabla `chapters` no tiene `narration_audio_url`, ejecuta:

`docs/supabase_narration_audio.sql`

Los metadatos completos quedan en `book_payload.narration` (voces, modelo, lista de URLs si el texto se parte en varios MP3).

## 2. Bucket de Storage

1. Supabase → **Storage** → **New bucket**
2. Nombre recomendado: `narration` (o el que pongas en `SUPABASE_STORAGE_BUCKET_NARRATION`).
3. Para que el front reproduzca el audio sin firmar URLs en cada petición, marca el bucket como **público** (o configura políticas de lectura `SELECT` para `anon` / tu rol).

Política mínima de lectura pública (ejemplo):

```sql
-- Ajusta "narration" si usas otro nombre de bucket
create policy "Public read narration"
on storage.objects for select
to public
using (bucket_id = 'narration');
```

La **subida** la hace el backend con `SUPABASE_SERVICE_KEY`, así que no hace falta política de `insert` para el cliente anónimo.

## 3. Variables en `apps/api/.env`

- `OPENAI_API_KEY` — obligatoria para TTS
- `OPENAI_TTS_MODEL` — opcional (default `tts-1-hd`)
- `OPENAI_TTS_VOICE` — opcional (default `onyx`)
- `SUPABASE_STORAGE_BUCKET_NARRATION` — opcional (default `narration`)

## 4. API

- `POST /api/story-engine/chapters/narrate` — cuerpo JSON: `chapterId`, opcional `voice`, `ttsModel`, `textSource` (`script` | `meta_summary` | `custom`), `customText`.
- `POST /api/story-engine/chapters/voice-local` — mismo TTS (OpenAI **onyx** + **tts-1-hd** por defecto) pero guarda MP3 en **`apps/api/static/audio/`** y devuelve URLs tipo `http://localhost:8000/static/audio/chapter_<id>.mp3`. Requiere `OPENAI_API_KEY`; opcional `API_PUBLIC_URL` en `.env` si el front llama desde otro host. Sin Supabase Storage.
- `POST /api/story-engine/finalize` — `generateNarrationAudio: true` (usa el **script** del capítulo).

## 5. ElevenLabs

No está cableado en este repo; si generas el MP3 con ElevenLabs, puedes **subir el archivo al mismo bucket** y guardar la URL en `book_payload.narration` / `narration_audio_url` con un script o endpoint propio.
