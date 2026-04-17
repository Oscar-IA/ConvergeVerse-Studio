-- Notas de trama del Arquitecto (espacio de trabajo) → triangulación del GENERADOR
-- Ejecutar en Supabase SQL Editor (mismo proyecto que Story Engine).

create table if not exists architect_plot_notes (
  id uuid primary key default gen_random_uuid(),
  raw_plot_idea text not null check (char_length(trim(raw_plot_idea)) > 0),
  title text default '',
  is_processed boolean not null default false,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_architect_plot_notes_pending
  on architect_plot_notes (created_at asc)
  where is_processed = false;

alter table architect_plot_notes enable row level security;

drop policy if exists "architect_plot_notes_all" on architect_plot_notes;
create policy "architect_plot_notes_all" on architect_plot_notes
  for all using (true) with check (true);

comment on table architect_plot_notes is 'Ideas crudas del autor; el GENERADOR consume is_processed=false y puede marcarlas al completar el día.';
