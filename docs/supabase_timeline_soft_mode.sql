-- ============================================================
-- CONVERGEVERSE — Modo «Enriquecer» (soft lore forward) en cronología
-- Ejecutar en Supabase si ya tienes story_timeline_events sin estas columnas.
-- ============================================================

alter table story_timeline_events
  add column if not exists chapters_refined integer not null default 0;

alter table story_timeline_events
  add column if not exists cascade_mode text not null default 'hard_reset';

-- Asegurar check (si la columna ya existía sin check, puedes omitir si falla)
alter table story_timeline_events drop constraint if exists story_timeline_events_cascade_mode_check;
alter table story_timeline_events add constraint story_timeline_events_cascade_mode_check
  check (cascade_mode in ('hard_reset', 'soft_enrich'));

comment on column story_timeline_events.cascade_mode is
  'hard_reset: colapsar futuro y regenerar · soft_enrich: refinar capítulos futuros aprobados/publicados.';

comment on column story_timeline_events.chapters_refined is
  'Número de capítulos cuyo guion se refinó en modo soft_enrich.';
