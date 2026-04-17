-- Creative Hub — referencias (anime/cine) + bóveda de ideas
-- Ejecutar en Supabase SQL Editor (mismo proyecto que Story Engine o el que uses).
--
-- El Story Engine hace «Multi-Reference Blending»: por día muestrea hasta 4 refs + 2 ideas
-- (no envía el catálogo completo al LLM) y fusiona con el prompt 33/33/34 en story_engine.

create extension if not exists "pgcrypto";

create table if not exists creative_references (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  media_type    text not null default 'anime',
  key_elements  jsonb not null default '[]',
  notes         text,
  created_at    timestamptz not null default now()
);

create table if not exists ideation_vault (
  id                  uuid primary key default gen_random_uuid(),
  concept_name        text not null,
  description         text,
  category            text,
  integration_style   text,
  created_at          timestamptz not null default now()
);

create index if not exists idx_creative_references_created on creative_references (created_at desc);
create index if not exists idx_ideation_vault_created on ideation_vault (created_at desc);

alter table creative_references enable row level security;
alter table ideation_vault enable row level security;

drop policy if exists "creative_references_all" on creative_references;
drop policy if exists "ideation_vault_all" on ideation_vault;

create policy "creative_references_all" on creative_references for all using (true) with check (true);
create policy "ideation_vault_all" on ideation_vault for all using (true) with check (true);
