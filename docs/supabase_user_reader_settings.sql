-- Panel de lectura — preferencias persistentes (tamaño de letra, narración)
-- Ejecutar en Supabase SQL Editor (mismo proyecto que Story Engine).

create table if not exists user_reader_settings (
  profile_id          text primary key default 'default',
  font_size           integer not null default 18
                      check (font_size between 14 and 32),
  narration_enabled   boolean not null default true,
  updated_at          timestamptz default now()
);

comment on table user_reader_settings is
  'Ajustes del lector Studio (Story Engine). profile_id permite varios perfiles sin auth (ej. default, oscar).';

-- El backend FastAPI usa service_role; no es obligatorio exponer esta tabla al anon del navegador.
