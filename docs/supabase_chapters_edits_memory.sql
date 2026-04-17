-- ConvergeVerse Studio — Supabase (PostgreSQL)
-- ⚠️ INCOMPATIBLE con el Story Engine diario: usa otros `chapters` / `narrative_memory`.
--    Para el motor de 3 caps/día usa docs/supabase_story_engine.sql (u otro proyecto Supabase).
-- Tablas: temporadas, capítulos, formatos (canon), ediciones (historial), memoria narrativa.
-- Uso: Supabase → SQL Editor → New Query → pegar → Run.
--
-- Requisitos: Postgres 13+ (gen_random_uuid). Sin extensiones extra.

-- ---------------------------------------------------------------------------
-- 1) Temporadas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seasons (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  title       text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2) Capítulos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chapters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id       uuid NOT NULL REFERENCES public.seasons (id) ON DELETE CASCADE,
  chapter_number  integer NOT NULL CHECK (chapter_number >= 1),
  slug            text NOT NULL,
  title           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, chapter_number),
  UNIQUE (season_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_chapters_season ON public.chapters (season_id);
CREATE INDEX IF NOT EXISTS idx_chapters_season_number ON public.chapters (season_id, chapter_number);

-- ---------------------------------------------------------------------------
-- 3) Contenido por formato (novel | manga | anime) — estado actual (como SQLite chapter_formats)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chapter_formats (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id  uuid NOT NULL REFERENCES public.chapters (id) ON DELETE CASCADE,
  format      text NOT NULL CHECK (format IN ('novel', 'manga', 'anime')),
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chapter_id, format)
);

CREATE INDEX IF NOT EXISTS idx_chapter_formats_chapter ON public.chapter_formats (chapter_id);

-- ---------------------------------------------------------------------------
-- 4) Edits — historial de cambios (borradores, autosave, versiones)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chapter_edits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id    uuid NOT NULL REFERENCES public.chapters (id) ON DELETE CASCADE,
  -- Qué parte del capítulo se editó (alineado con formatos + metadatos)
  edit_scope    text NOT NULL CHECK (
    edit_scope IN ('novel', 'manga', 'anime', 'metadata', 'full_pipeline')
  ),
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  label         text,
  is_checkpoint boolean NOT NULL DEFAULT false,
  created_by    uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chapter_edits_chapter_created ON public.chapter_edits (chapter_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 5) Memoria — contexto persistente para agentes / lore / resúmenes (RAG-friendly)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.narrative_memory (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope       text NOT NULL CHECK (scope IN ('global', 'season', 'chapter')),
  season_id   uuid REFERENCES public.seasons (id) ON DELETE CASCADE,
  chapter_id  uuid REFERENCES public.chapters (id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'summary' CHECK (
    role IN ('system', 'user', 'assistant', 'summary', 'fact', 'open_question')
  ),
  content     text NOT NULL,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by  uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT narrative_memory_scope_fk CHECK (
    (scope = 'global' AND season_id IS NULL AND chapter_id IS NULL)
    OR (scope = 'season' AND season_id IS NOT NULL AND chapter_id IS NULL)
    OR (scope = 'chapter' AND chapter_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_narrative_memory_scope ON public.narrative_memory (scope);
CREATE INDEX IF NOT EXISTS idx_narrative_memory_season ON public.narrative_memory (season_id) WHERE season_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_narrative_memory_chapter ON public.narrative_memory (chapter_id) WHERE chapter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_narrative_memory_created ON public.narrative_memory (created_at DESC);

-- ---------------------------------------------------------------------------
-- Comentarios (documentación en catálogo)
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.seasons IS 'Temporadas del canon (World Engine).';
COMMENT ON TABLE public.chapters IS 'Capítulos por temporada.';
COMMENT ON TABLE public.chapter_formats IS 'JSON por formato: novel, manga, anime.';
COMMENT ON TABLE public.chapter_edits IS 'Historial de ediciones / checkpoints por capítulo.';
COMMENT ON TABLE public.narrative_memory IS 'Memoria narrativa y contexto para pipelines y agentes.';

-- ---------------------------------------------------------------------------
-- (Opcional) RLS: activa y define políticas según tu auth.
-- Sin RLS, el service_role de la API puede leer/escribir todo.
-- ---------------------------------------------------------------------------
-- ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.chapter_formats ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.chapter_edits ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.narrative_memory ENABLE ROW LEVEL SECURITY;
