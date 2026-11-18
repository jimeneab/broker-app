-- F02: unica via para escribir el perfil de riesgo. Calcula puntaje y perfil desde las respuestas y escribe
-- solo la fila de auth.uid(): llamarla directo por PostgREST no permite nada que el cuestionario no permita.
-- Unica fuente de verdad del calculo (el API solo valida la forma de la entrada).
create function public.submit_risk_profile(answers int[])
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user  uuid := (select auth.uid());
  v_score int;
  v_row   public.profiles;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if answers is null
     or array_ndims(answers) <> 1
     or cardinality(answers) <> 6
     or array_position(answers, null) is not null
     or exists (select 1 from unnest(answers) as a(v) where v not between 1 and 4) then
    raise exception 'answers must be 6 integers between 1 and 4' using errcode = '22023';
  end if;

  select sum(v)::int into v_score from unnest(answers) as a(v);

  update public.profiles
     set risk_score   = v_score,
         risk_profile = case when v_score <= 11 then 'conservador'
                             when v_score <= 18 then 'moderado'
                             else 'agresivo' end,
         -- Rehacer conserva la fecha del primer onboarding; el historial es de F07.
         onboarded_at = coalesce(onboarded_at, now())
   where id = v_user
  returning * into v_row;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

-- Postgres da EXECUTE a PUBLIC y Supabase a anon/authenticated por default privileges: se deja solo authenticated.
revoke execute on function public.submit_risk_profile(int[]) from public, anon;
grant execute on function public.submit_risk_profile(int[]) to authenticated;
