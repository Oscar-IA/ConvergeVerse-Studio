-- Resúmenes técnicos por día (opcional) — «Previously On» recursivo
-- Si existe fila para día D, el Story Engine usa summary_technical en lugar de
-- re-enviar extractos largos de script al generar el día D+1 / D+2.
--
-- Poblar manualmente, vía API futura, o con un job post-aprobación de capítulos.

create extension if not exists "pgcrypto";

create table if not exists story_day_summaries (
  day_number         integer primary key,
  summary_technical  text not null,   -- ficha técnica: hechos, decisiones, cliffhangers
  based_on_chapter_ids uuid[] default '{}',
  updated_at         timestamptz not null default now()
);

comment on table story_day_summaries is 'Continuidad: resumen canónico por día narrativo para precuelas/Previously On.';

alter table story_day_summaries enable row level security;
drop policy if exists "story_day_summaries_all" on story_day_summaries;
create policy "story_day_summaries_all" on story_day_summaries for all using (true) with check (true);
