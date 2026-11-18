-- F01: profile 1:1 con auth.users. Lo crea un trigger al registrarse; F02 llena el perfil de riesgo.
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  risk_score   int null check (risk_score between 6 and 24),
  risk_profile text null check (risk_profile in ('conservador', 'moderado', 'agresivo')),
  onboarded_at timestamptz null,
  created_at   timestamptz not null default now(),
  -- F02 guarda puntaje, perfil y fecha juntos: o estan los tres o ninguno.
  constraint profiles_onboarding_consistent check (
    (risk_score is null and risk_profile is null and onboarded_at is null)
    or (risk_score is not null and risk_profile is not null and onboarded_at is not null)
  )
);

-- security definer: el insert en auth.users lo hace el rol de Auth, que no pasa RLS de public.profiles.
-- search_path vacio: evita que un objeto con el mismo nombre en otro schema secuestre la funcion.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 50)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Sin policies de insert/delete: insert lo hace el trigger, delete el cascade de auth.users.
-- El usuario solo puede cambiar su nombre. risk_score, risk_profile y onboarded_at no se pueden escribir
-- con su JWT (evita saltarse el calculo del servidor); los escribira una funcion security definer de F02.
revoke update on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;
