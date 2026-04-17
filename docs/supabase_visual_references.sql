-- ============================================================
-- CONVERGEVERSE — Referencias visuales para el Story Engine
-- Inyectadas en el generador como «CONTEXTO VISUAL OBLIGATORIO».
-- Ejecutar en Supabase SQL Editor (una vez).
-- ============================================================

create table if not exists visual_references (
  id                  uuid primary key default gen_random_uuid(),
  label               text not null,
  visual_description  text not null,
  notes               text,
  active              boolean not null default true,
  sort_order          integer not null default 0,
  image_url           text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_visual_references_active_sort
  on visual_references (active, sort_order, created_at desc);

comment on table visual_references is
  'Reglas de diseño visual leídas por el generador antes de cada capítulo (paneles + image_prompt).';

comment on column visual_references.image_url is
  'URL pública (Storage) — el bloque de contexto visual la cita para coherencia con el arte.';

alter table visual_references enable row level security;
create policy "allow_all_visual_references" on visual_references for all using (true);
