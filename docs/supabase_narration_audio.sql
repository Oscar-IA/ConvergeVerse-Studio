-- Narración TTS (OpenAI) — columna opcional en chapters
-- Ejecutar en Supabase SQL Editor si ya aplicaste supabase_story_engine.sql sin esta columna.

alter table if exists chapters
  add column if not exists narration_audio_url text;

comment on column chapters.narration_audio_url is
  'URL pública del primer segmento MP3 (narración). Lista completa en book_payload.narration.urls';
