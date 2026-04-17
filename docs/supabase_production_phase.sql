-- Ciclo de evolución: Novela → Manga → Animación (futuro) → Completo
-- Ejecutar en Supabase SQL Editor después de supabase_story_engine.sql / chronicle_canon.

alter table chapters
  add column if not exists production_phase text not null default 'novel'
  check (production_phase in ('novel', 'manga', 'animation', 'complete'));

comment on column chapters.production_phase is
  'novel=borrador texto; manga=canon novela aprobada listo para paneles Replicate; animation=paneles listos motor video futuro; complete=publicado Legado.';

-- Canon existente: aprobados → manga; publicados → complete
update chapters set production_phase = 'complete' where status = 'published';
update chapters set production_phase = 'manga' where status = 'approved' and production_phase = 'novel';

create index if not exists idx_chapters_production_phase on chapters (production_phase);
