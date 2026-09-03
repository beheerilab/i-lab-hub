-- Stap 0: profielen, rollen en de "eerste gebruiker wordt beheerder"-bootstrap.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'lid' check (role in ('admin', 'lid')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Herbruikbare helper voor RLS-policies in alle modules. security definer
-- zodat de functie zelf niet vastloopt in de RLS van profiles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Iedereen die ingelogd is mag alle profielen zien (klein, vertrouwd team;
-- nodig om namen te tonen bij taken/boekingen/materiaal).
create policy "profielen zijn zichtbaar voor ingelogde gebruikers"
  on public.profiles for select
  to authenticated
  using (true);

-- Een gebruiker mag zijn eigen naam aanpassen, maar niet zijn eigen rol
-- (rol wijzigen kan alleen via claim_admin() of door een admin).
create policy "gebruiker mag eigen naam bijwerken"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

create policy "admin mag alle profielen beheren"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Maakt automatisch een profielrij aan zodra iemand zich registreert via
-- Supabase Auth. Leest de naam uit de signup-metadata (full_name).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Maakt de aanroepende gebruiker beheerder, maar alleen zolang er nog geen
-- enkele beheerder bestaat. Voorkomt dat leden zichzelf later admin maken.
create or replace function public.claim_admin()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'Er is al een beheerder.';
  end if;

  update public.profiles set role = 'admin' where id = auth.uid();
end;
$$;
