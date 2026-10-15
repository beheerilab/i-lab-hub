-- Ruimtegebruik facturatie: gegevens in Supabase i.p.v. een los .json-bestand.
-- Per reservering één rij (zoals de tool het zelf al samenvoegt op "gewijzigd");
-- verwijderen gebeurt in de tool als vlag, dus er is geen delete nodig.

create or replace function public.is_crew()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lid')
  );
$$;

create table if not exists public.facturatie_reserveringen (
  id text primary key,
  data jsonb not null,
  gewijzigd text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create table if not exists public.facturatie_instellingen (
  id boolean primary key default true check (id),
  data jsonb not null default '{}'::jsonb,
  gewijzigd text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.facturatie_reserveringen enable row level security;
alter table public.facturatie_instellingen enable row level security;

create policy "crew ziet facturatie-reserveringen"
  on public.facturatie_reserveringen for select to authenticated using (public.is_crew());
create policy "crew voegt facturatie-reserveringen toe"
  on public.facturatie_reserveringen for insert to authenticated with check (public.is_crew());
create policy "crew wijzigt facturatie-reserveringen"
  on public.facturatie_reserveringen for update to authenticated
  using (public.is_crew()) with check (public.is_crew());

create policy "crew ziet facturatie-instellingen"
  on public.facturatie_instellingen for select to authenticated using (public.is_crew());
create policy "crew voegt facturatie-instellingen toe"
  on public.facturatie_instellingen for insert to authenticated with check (public.is_crew());
create policy "crew wijzigt facturatie-instellingen"
  on public.facturatie_instellingen for update to authenticated
  using (public.is_crew()) with check (public.is_crew());
