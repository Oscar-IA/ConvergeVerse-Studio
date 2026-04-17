-- Añade URL de imagen de referencia (subida vía API → Storage).
alter table visual_references add column if not exists image_url text;

comment on column visual_references.image_url is
  'URL pública (p. ej. Supabase Storage) — el generador la menciona en el bloque de contexto visual.';
