-- ============================================================
-- CONVERGEVERSE — Libro digital / canon (migración)
-- Ejecuta en Supabase si ya aplicaste docs/supabase_story_engine.sql
-- antes de existir estas columnas.
-- ============================================================

alter table chapters
  add column if not exists canon_chapter_number integer,
  add column if not exists slug text,
  add column if not exists canon_registered_at timestamptz,
  add column if not exists book_payload jsonb not null default '{}'::jsonb,
  add column if not exists meta_summary text,
  add column if not exists hero_image_url text;

-- Un número y un slug únicos en todo el multiverso (varios NULL en borradores)
create unique index if not exists chapters_canon_chapter_number_key
  on chapters (canon_chapter_number)
  where canon_chapter_number is not null;

create unique index if not exists chapters_slug_key
  on chapters (slug)
  where slug is not null;

create index if not exists idx_chapters_status_day on chapters (day_number, status);

comment on column chapters.canon_chapter_number is 'Orden global en el Libro de Crónicas (solo al aprobar).';
comment on column chapters.slug is 'URL / libro digital (solo canon).';
comment on column chapters.book_payload is 'Snapshot novela+manga en el momento de aprobación.';
