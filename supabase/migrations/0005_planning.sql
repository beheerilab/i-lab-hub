-- Module 4: planning (labgebruik per week).

create table if not exists public.labs (
  id uuid primary key default gen_random_uuid(),
  naam text not null unique,
  volgorde integer not null default 0,
  actief boolean not null default true
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.labs (id) on delete cascade,
  datum date not null,
  start_uur integer not null check (start_uur between 9 and 14),
  vak text not null,
  klas_groep text not null,
  type_activiteit text not null check (type_activiteit in ('les', 'project', 'vrij_gebruik', 'extern_bezoek')),
  aantal_leerlingen integer not null check (aantal_leerlingen >= 0),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (lab_id, datum, start_uur)
);

create index if not exists bookings_datum_idx on public.bookings (datum);

insert into public.labs (naam, volgorde)
values ('Lab 1', 1), ('Lab 2', 2), ('Lab 3', 3)
on conflict (naam) do nothing;

alter table public.labs enable row level security;
alter table public.bookings enable row level security;

-- labs: iedereen ziet de labs, alleen admin beheert het aantal/de namen.
create policy "labs zijn zichtbaar voor iedereen"
  on public.labs for select to authenticated using (true);
create policy "admin beheert labs"
  on public.labs for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- bookings: gedeelde planning — iedereen ziet alles, iedereen mag boeken,
-- en iedereen mag corrigeren/verwijderen (klein vertrouwd team, vervangt
-- de gedeelde Outlook-agenda). De unique-constraint hierboven voorkomt
-- dubbele boekingen op databaseniveau.
create policy "boekingen zijn zichtbaar voor iedereen"
  on public.bookings for select to authenticated using (true);
create policy "iedereen mag boeken"
  on public.bookings for insert to authenticated with check (created_by = auth.uid());
create policy "iedereen mag boekingen corrigeren"
  on public.bookings for update to authenticated using (true) with check (true);
create policy "iedereen mag boekingen verwijderen"
  on public.bookings for delete to authenticated using (true);
