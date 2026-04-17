-- URL de ilustración hero (Replicate) por capítulo publicado
alter table chapters
  add column if not exists hero_image_url text;

comment on column chapters.hero_image_url is 'Imagen generada al publicar al Legado (BOND OS / Replicate).';
