-- ============================================================
-- CONVERGEVERSE STORY ENGINE — Supabase Schema
-- Run this in your Supabase SQL Editor (una sola vez por proyecto).
--
-- ⚠️ No mezclar con docs/supabase_chapters_edits_memory.sql: mismos nombres de tabla,
--    columnas distintas. Usa proyecto nuevo o DROP de tablas antiguas antes de ejecutar.
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── NARRATIVE MEMORY ─────────────────────────────────────────
-- The living bible: characters, locations, symbols, world state
create table if not exists narrative_memory (
  id           uuid primary key default gen_random_uuid(),
  key          text unique not null,   -- e.g. "aren_valis.emotional_state"
  value        jsonb not null,
  category     text not null,          -- character | location | symbol | world | bond_os_signal
  updated_at   timestamptz default now()
);

-- ── CHAPTERS ─────────────────────────────────────────────────
create table if not exists chapters (
  id               uuid primary key default gen_random_uuid(),
  day_number       integer not null,
  slot             integer not null check (slot between 1 and 3),  -- 3 per day
  title            text not null,
  script           text not null,
  panels           jsonb not null default '[]',
  status           text not null default 'draft'
                   check (status in ('draft','approved','rejected','published','obsolete')),
  arc_position     text,              -- setup | rising | climax | resolution
  symbols_planted  jsonb default '[]', -- game hints embedded in this chapter
  bond_os_signals  jsonb default '[]', -- Bond OS product signals
  author_notes     text,              -- AI notes about narrative choices
  canon_chapter_number integer,      -- Libro digital: orden global (NULL hasta aprobar)
  slug             text,              -- Libro digital: URL-friendly (NULL hasta aprobar)
  canon_registered_at timestamptz,    -- Momento en que pasó a canon
  book_payload     jsonb not null default '{}', -- Snapshot novela + manga al aprobar
  meta_summary     text,              -- Ficha canónica (finalize / Legado; continuidad)
  hero_image_url   text,             -- Ilustración Legado (Replicate / motor visual)
  narration_audio_url text,          -- Primer MP3 narración (OpenAI TTS); más URLs en book_payload.narration
  production_phase text not null default 'novel'
    check (production_phase in ('novel','manga','animation','complete')),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (day_number, slot)
);

comment on column chapters.production_phase is
  'novel | manga | animation | complete — ciclo Novela→Manga→Animación→Legado.';

create unique index if not exists chapters_canon_chapter_number_key
  on chapters (canon_chapter_number)
  where canon_chapter_number is not null;

create unique index if not exists chapters_slug_key
  on chapters (slug)
  where slug is not null;

create index if not exists idx_chapters_status_day on chapters (day_number, status);

-- ── CHAPTER EDITS ────────────────────────────────────────────
-- Every edit Oscar makes → the AI learns from these
create table if not exists chapter_edits (
  id            uuid primary key default gen_random_uuid(),
  chapter_id    uuid references chapters(id) on delete cascade,
  field         text not null,        -- "script" | "title" | "panels[0].dialogue" etc.
  original      text not null,
  edited        text not null,
  edit_reason   text,                 -- Oscar's note: why he changed it
  learned       boolean default false, -- has MemoryAgent processed this?
  created_at    timestamptz default now()
);

-- ── STORY ARCS ───────────────────────────────────────────────
create table if not exists story_arcs (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  day_start    integer not null,
  day_end      integer,               -- null = ongoing
  status       text default 'active' check (status in ('active','completed','abandoned')),
  themes       jsonb default '[]',    -- ['honor','betrayal','discovery']
  symbols      jsonb default '[]',    -- symbols introduced in this arc
  created_at   timestamptz default now()
);

-- ── SYMBOLS / GAME HINTS ─────────────────────────────────────
-- Hidden clues that will appear in Bond OS game
create table if not exists symbols (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  description   text not null,
  first_seen    uuid references chapters(id),
  category      text not null check (category in (
    'orbet_hint','faction_signal','character_omen',
    'world_event','bond_os_feature','game_mechanic_foreshadow'
  )),
  game_reveal   text,                 -- what this unlocks when game launches
  active        boolean default true,
  created_at    timestamptz default now()
);

-- ── WORLD STATE ──────────────────────────────────────────────
-- Living state of the world that evolves with each chapter
create table if not exists world_state (
  id            uuid primary key default gen_random_uuid(),
  day_number    integer not null unique,
  snapshot      jsonb not null,       -- full world state at end of that day
  changes       jsonb default '[]',   -- what changed vs previous day
  created_at    timestamptz default now()
);

-- ── EDITORIAL RULES ──────────────────────────────────────────
-- Rules the AI learns and must follow forever
create table if not exists editorial_rules (
  id          uuid primary key default gen_random_uuid(),
  rule        text not null,
  source      text default 'human'    -- 'human' | 'ai_derived'
              check (source in ('human','ai_derived')),
  priority    integer default 5,      -- 1=critical, 10=suggestion
  active      boolean default true,
  created_at  timestamptz default now()
);

-- Seed initial editorial rules
insert into editorial_rules (rule, source, priority) values
  ('Aren Valis never knows he is inside a game. He experiences everything as real.', 'human', 1),
  ('Every chapter must have exactly one moment of genuine danger, one comedic beat, and one mysterious symbol.', 'human', 1),
  ('Dialogue must be in Spanish unless a character is from a culture that speaks another language.', 'human', 1),
  ('Bond OS product features must appear as natural world elements, never as obvious advertisements.', 'human', 2),
  ('Each world (Nova Terra, Astra Nexus, Verdant Sphere, Abyssal Domain) has its own culture, accent, and values.', 'human', 2),
  ('The Null Syndicate operates in shadows — never confirmed, always implied.', 'human', 3),
  ('Symbols planted in the story must be subtle enough to re-read and say "I missed that".', 'human', 2);

-- ── FUNCTIONS ────────────────────────────────────────────────
-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger chapters_updated_at before update on chapters
  for each row execute function update_updated_at();

create trigger memory_updated_at before update on narrative_memory
  for each row execute function update_updated_at();

-- ── VISUAL REFERENCES (contexto obligatorio en el generador) ─
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
  'Reglas visuales inyectadas en el prompt del Story Engine (paneles + image_prompt).';

-- ── TIMELINE / PARADOJAS (regeneración en cascada) ───────────
create table if not exists story_timeline_events (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  pivot_chapter_id      uuid references chapters(id) on delete set null,
  pivot_canon_number    integer,
  pivot_day_number      integer not null,
  pivot_slot            integer not null check (pivot_slot between 1 and 3),
  plot_pivot_note       text not null default '',
  chapters_removed      integer not null default 0,
  chapters_refined      integer not null default 0,
  cascade_mode          text not null default 'hard_reset'
    check (cascade_mode in ('hard_reset','soft_enrich')),
  generation_day        integer not null,
  generation_start_slot integer not null check (generation_start_slot between 1 and 3)
);

create index if not exists idx_story_timeline_events_created
  on story_timeline_events (created_at desc);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
alter table chapters enable row level security;
alter table chapter_edits enable row level security;
alter table narrative_memory enable row level security;
alter table story_arcs enable row level security;
alter table symbols enable row level security;
alter table world_state enable row level security;
alter table editorial_rules enable row level security;
alter table story_timeline_events enable row level security;
alter table visual_references enable row level security;

-- For now: allow all (you'll tighten this when the game launches)
create policy "allow_all" on chapters for all using (true);
create policy "allow_all" on chapter_edits for all using (true);
create policy "allow_all" on narrative_memory for all using (true);
create policy "allow_all" on story_arcs for all using (true);
create policy "allow_all" on symbols for all using (true);
create policy "allow_all" on world_state for all using (true);
create policy "allow_all" on editorial_rules for all using (true);
create policy "allow_all" on story_timeline_events for all using (true);
create policy "allow_all_visual_references" on visual_references for all using (true);
