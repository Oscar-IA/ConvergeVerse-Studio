-- ============================================================
-- CONVERGEVERSE — "El libro es la llave" (gamificación / Bond OS)
-- Secretos ligados a capítulos: el jugador debe leer la pista en la prosa
-- y acertar el código para desbloquear recompensas en el juego.
--
-- Ejecutar en Supabase después de docs/supabase_story_engine.sql
-- (requiere tabla public.chapters).
-- ============================================================

create extension if not exists "pgcrypto";

-- Secretos por capítulo (ej. "frecuencia 180Hz" mencionada sutilmente en el texto)
create table if not exists story_secrets (
  id              uuid primary key default gen_random_uuid(),
  chapter_id      uuid not null references chapters (id) on delete cascade,
  secret_code     text not null,       -- palabra/frase que debe acertar el jugador (normalízala en API)
  hint_text       text,                -- pista para UI / diseño (no sustituye leer el libro)
  reward_data     jsonb not null default '{}',  -- ej. {"stat": "resistencia", "delta": 50}
  is_discovered   boolean not null default false, -- MVP global; multi-jugador → tabla player_* aparte
  created_at      timestamptz not null default now()
);

create index if not exists idx_story_secrets_chapter on story_secrets (chapter_id);
create index if not exists idx_story_secrets_undiscovered on story_secrets (chapter_id) where is_discovered = false;

comment on table story_secrets is 'Bond OS: lectura obligatoria — sin acertar secret_code no se completa la misión.';

alter table story_secrets enable row level security;

drop policy if exists "story_secrets_all" on story_secrets;
create policy "story_secrets_all" on story_secrets for all using (true) with check (true);

-- Ejemplo (descomenta y sustituye chapter_id real tras generar capítulos):
-- insert into story_secrets (chapter_id, secret_code, hint_text, reward_data) values
-- (
--   '00000000-0000-0000-0000-000000000000',
--   '180Hz',
--   'El archivo susurra que el Orbe vibra en un tono que casi duele los oídos del gremio…',
--   '{"tipo": "buff", "stat": "resistencia_energetica", "valor": 50, "mision_id": "orbet_calibracion_01"}'
-- );
