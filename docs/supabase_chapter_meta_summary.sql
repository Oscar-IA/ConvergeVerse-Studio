-- Meta-resumen canónico por capítulo (continuidad / Legado)
-- Ejecutar en Supabase si chapters ya existe sin esta columna.

alter table chapters
  add column if not exists meta_summary text;

comment on column chapters.meta_summary is 'Ficha técnica canónica generada al publicar (finalize); alimenta Previously On vía story_day_summaries.';
