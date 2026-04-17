-- ============================================================
-- CONVERGEVERSE — Regeneración en cascada + cronología de decisiones
-- Ejecutar en Supabase SQL Editor (proyectos ya existentes).
-- ============================================================

-- 1) Estado obsolete (líneas descartadas por paradoja temporal; el flujo
--    principal suele borrar filas futuras; obsolete queda para retención opcional)
alter table chapters drop constraint if exists chapters_status_check;
alter table chapters add constraint chapters_status_check
  check (status in ('draft','approved','rejected','published','obsolete'));

comment on column chapters.status is
  'draft | approved | rejected | published | obsolete — obsolete: descartado por regeneración en cascada.';

-- 2) Registro de decisiones (BOND OS — «Cronología de decisiones»)
create table if not exists story_timeline_events (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  pivot_chapter_id      uuid references chapters(id) on delete set null,
  pivot_canon_number    integer,
  pivot_day_number      integer not null,
  pivot_slot            integer not null check (pivot_slot between 1 and 3),
  plot_pivot_note       text not null default '',
  chapters_removed      integer not null default 0,
  generation_day        integer not null,
  generation_start_slot integer not null check (generation_start_slot between 1 and 3)
);

create index if not exists idx_story_timeline_events_created
  on story_timeline_events (created_at desc);

-- Si la tabla ya existía sin columnas de modo soft:
alter table story_timeline_events add column if not exists chapters_refined integer not null default 0;
alter table story_timeline_events add column if not exists cascade_mode text not null default 'hard_reset';
alter table story_timeline_events drop constraint if exists story_timeline_events_cascade_mode_check;
alter table story_timeline_events add constraint story_timeline_events_cascade_mode_check
  check (cascade_mode in ('hard_reset', 'soft_enrich'));

comment on table story_timeline_events is
  'Paradojas editoriales: hard_reset colapsa el futuro; soft_enrich refina capítulos posteriores.';
