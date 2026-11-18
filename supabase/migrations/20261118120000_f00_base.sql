-- F00: base. Cache de respuestas de proveedores y extension vector (usada en F07).
create extension if not exists vector with schema extensions;

create table public.provider_cache (
  key        text primary key,
  payload    jsonb not null,
  expires_at timestamptz not null
);

-- Solo el service role (que ignora RLS) accede a esta tabla: RLS activo y sin policies.
alter table public.provider_cache enable row level security;
