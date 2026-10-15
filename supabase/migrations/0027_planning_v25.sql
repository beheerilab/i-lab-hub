-- Planning V2.5: aanvraag-/bevestigingsflow, reeksen, sluitingen en instellingen.
-- Bestaande reserveringen blijven bestaan en worden "bevestigd".

-- Zelfvoorzienend (zie ook 0017/0026).
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

-- 1. Ruimtes: capaciteit en een korte omschrijving (bijv. "Robotica").
alter table public.labs add column if not exists capaciteit integer not null default 30 check (capaciteit > 0);
alter table public.labs add column if not exists omschrijving text;

update public.labs set omschrijving = v.omschrijving, capaciteit = v.capaciteit
from (values
  ('Lab 01', 'Zorgtechnologie', 30),
  ('Lab 02', 'Smart Engineering', 30),
  ('Lab 03', 'Werkhal', 32),
  ('Lab 05', 'Robotica', 30),
  ('Lab 06', 'Dronetechnologie', 30),
  ('Lab 07', 'Infra & groen', 30),
  ('Lab 08', 'Grote spreekruimte', 40),
  ('Lab 09', 'Limonadefabriek', 24),
  ('Lab 10', 'Keuken / Restaurant', 24),
  ('Lab 11', 'Installatietechniek', 30),
  ('Spreekkamer Ashton', null, 12),
  ('Spreekkamer Hopper', null, 8)
) as v(naam, omschrijving, capaciteit)
where public.labs.naam = v.naam and public.labs.omschrijving is null;

-- 2. Boekingen: status, reeks, niveau, wie de docent is en de beoordeling.
alter table public.bookings add column if not exists status text not null default 'confirmed'
  check (status in ('pending', 'confirmed', 'rejected', 'withdrawn', 'cancelled', 'expired'));
alter table public.bookings add column if not exists series_id uuid;
alter table public.bookings add column if not exists niveau text;
alter table public.bookings add column if not exists docent_id uuid references public.profiles (id) on delete set null;
alter table public.bookings add column if not exists beoordeeld_door text;
alter table public.bookings add column if not exists beoordeeld_op timestamptz;
alter table public.bookings add column if not exists afwijs_reden text;
alter table public.bookings add column if not exists geschiedenis jsonb not null default '[]'::jsonb;

update public.bookings set docent_id = created_by where docent_id is null and created_by is not null;
update public.bookings
set geschiedenis = jsonb_build_array(
  jsonb_build_object('at', created_at, 'by', docent, 'action', 'Ingepland')
)
where geschiedenis = '[]'::jsonb;

create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_series_idx on public.bookings (series_id);

-- Een aanvraag houdt het tijdvak vast; afgewezen/ingetrokken/verlopen/geannuleerd niet.
alter table public.bookings drop constraint if exists bookings_no_overlap;
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (
    lab_id with =,
    datum with =,
    int4range(start_minuten, eind_minuten) with &&
  ) where (status in ('pending', 'confirmed'));

-- 3. Sluitingen en instellingen.
create table if not exists public.planning_sluitingen (
  id uuid primary key default gen_random_uuid(),
  titel text not null,
  van date not null,
  tot date not null,
  hele_dag boolean not null default true,
  start_tijd time,
  eind_tijd time,
  lab_ids uuid[],            -- null = alle labs
  created_at timestamptz not null default now(),
  check (tot >= van)
);

create table if not exists public.planning_instellingen (
  id boolean primary key default true check (id),
  open_van time not null default '08:30',
  open_tot time not null default '17:00',
  vervalt_na_werkdagen integer not null default 5 check (vervalt_na_werkdagen between 1 and 20)
);
insert into public.planning_instellingen (id) values (true) on conflict do nothing;

alter table public.planning_sluitingen enable row level security;
alter table public.planning_instellingen enable row level security;

create policy "iedereen ziet sluitingen"
  on public.planning_sluitingen for select to authenticated using (true);
create policy "crew beheert sluitingen"
  on public.planning_sluitingen for all to authenticated
  using (public.is_crew()) with check (public.is_crew());

create policy "iedereen ziet planning-instellingen"
  on public.planning_instellingen for select to authenticated using (true);
create policy "crew past planning-instellingen aan"
  on public.planning_instellingen for update to authenticated
  using (public.is_crew()) with check (public.is_crew());

-- 4. Rechten op boekingen: crew ziet en doet alles; een docent ziet eigen
-- boekingen en vraagt aan. (Andermans boekingen zien docenten alleen via de
-- afgeschermde view hieronder.)
drop policy if exists "boekingen zijn zichtbaar voor iedereen" on public.bookings;
create policy "crew of eigenaar ziet boeking"
  on public.bookings for select to authenticated
  using (public.is_crew() or created_by = auth.uid() or docent_id = auth.uid());

drop policy if exists "crew of eigenaar mag boeking bewerken" on public.bookings;
create policy "crew of eigenaar mag boeking bewerken"
  on public.bookings for update to authenticated
  using (public.is_crew() or created_by = auth.uid() or docent_id = auth.uid())
  with check (public.is_crew() or created_by = auth.uid() or docent_id = auth.uid());

drop policy if exists "crew of eigenaar mag boeking verwijderen" on public.bookings;
create policy "alleen crew verwijdert boeking definitief"
  on public.bookings for delete to authenticated
  using (public.is_crew());

-- Regels voor niet-crew (docent): alleen aanvragen indienen, een eigen open
-- aanvraag wijzigen of intrekken, en een eigen bevestigde les annuleren.
create or replace function public.bookings_docent_regels()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Het automatisch laten verlopen van aanvragen (planning_verlopen_opruimen)
  -- mag de regels voor docenten omzeilen.
  if coalesce(current_setting('app.planning_sweep', true), '') = '1' then
    return new;
  end if;

  if public.is_crew() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'pending' then
      raise exception 'Een docent kan alleen een aanvraag indienen';
    end if;
    if not exists (select 1 from public.labs where id = new.lab_id and docent_boekbaar) then
      raise exception 'Deze ruimte is niet boekbaar voor docenten';
    end if;
    return new;
  end if;

  -- UPDATE
  if new.created_by is distinct from old.created_by or new.docent_id is distinct from old.docent_id then
    raise exception 'De docent van een boeking kan niet gewijzigd worden';
  end if;

  if old.status = 'pending' then
    if new.status not in ('pending', 'withdrawn') then
      raise exception 'Een aanvraag kan alleen door i-lab beoordeeld worden';
    end if;
  elsif old.status = 'confirmed' then
    if new.status <> 'cancelled'
       or (new.lab_id, new.datum, new.start_tijd, new.eind_tijd)
          is distinct from (old.lab_id, old.datum, old.start_tijd, old.eind_tijd) then
      raise exception 'Een bevestigde les kan alleen geannuleerd worden';
    end if;
  else
    raise exception 'Deze boeking kan niet meer gewijzigd worden';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_docent_regels_trg on public.bookings;
create trigger bookings_docent_regels_trg
  before insert or update on public.bookings
  for each row execute function public.bookings_docent_regels();

-- Afgeschermde weergave voor docenten: andermans actieve boeking alleen als
-- "bezet" (ruimte, datum, tijd, status); eigen boekingen volledig.
-- Bewust zonder security_invoker: de view moet de rijen van anderen kunnen
-- lezen, maar levert voor die rijen enkel de niet-gevoelige kolommen.
drop view if exists public.bookings_docent_view;
create view public.bookings_docent_view as
select
  b.id,
  b.lab_id,
  b.datum,
  b.start_tijd,
  b.eind_tijd,
  b.status,
  b.series_id,
  b.categorie,
  b.type_activiteit,
  b.created_by,
  b.docent_id,
  b.created_at,
  (b.created_by = auth.uid() or b.docent_id = auth.uid()) as is_eigen,
  case when b.created_by = auth.uid() or b.docent_id = auth.uid() then b.vak end as vak,
  case when b.created_by = auth.uid() or b.docent_id = auth.uid() then b.school end as school,
  case when b.created_by = auth.uid() or b.docent_id = auth.uid() then b.docent end as docent,
  case when b.created_by = auth.uid() or b.docent_id = auth.uid() then b.niveau end as niveau,
  case when b.created_by = auth.uid() or b.docent_id = auth.uid() then b.type_activiteit_anders end as type_activiteit_anders,
  case when b.created_by = auth.uid() or b.docent_id = auth.uid() then b.aantal_leerlingen end as aantal_leerlingen,
  case when b.created_by = auth.uid() or b.docent_id = auth.uid() then b.bijzonderheden end as bijzonderheden,
  case when b.created_by = auth.uid() or b.docent_id = auth.uid() then b.afwijs_reden end as afwijs_reden,
  case when b.created_by = auth.uid() or b.docent_id = auth.uid() then b.beoordeeld_door end as beoordeeld_door,
  case when b.created_by = auth.uid() or b.docent_id = auth.uid() then b.beoordeeld_op end as beoordeeld_op,
  case when b.created_by = auth.uid() or b.docent_id = auth.uid() then b.geschiedenis end as geschiedenis
from public.bookings b
where b.status in ('pending', 'confirmed')
   or b.created_by = auth.uid()
   or b.docent_id = auth.uid();

grant select on public.bookings_docent_view to authenticated;

-- 5. Verlopen van aanvragen: pending -> expired na X werkdagen (of op de
-- lesdag zelf). Wordt aangeroepen bij het openen van de planning; geeft de
-- zojuist verlopen aanvragen terug zodat de docent een mail kan krijgen.
create or replace function public.planning_verlopen_opruimen()
returns table (
  boeking_id uuid,
  email text,
  vak text,
  datum date,
  start_tijd time,
  eind_tijd time,
  lab_naam text
)
language plpgsql
security definer set search_path = public
as $$
#variable_conflict use_column
declare
  termijn integer;
begin
  perform set_config('app.planning_sweep', '1', true);
  select vervalt_na_werkdagen into termijn from public.planning_instellingen limit 1;
  termijn := coalesce(termijn, 5);

  return query
  with verlopen as (
    update public.bookings b
    set status = 'expired',
        geschiedenis = b.geschiedenis || jsonb_build_array(jsonb_build_object(
          'at', now(), 'by', 'Systeem',
          'action', 'Verlopen: niet op tijd bevestigd, tijdvak vrijgegeven'))
    where b.status = 'pending'
      and (now() at time zone 'Europe/Amsterdam')::date > least(
        b.datum,
        (
          select d::date
          from generate_series(
            (b.created_at at time zone 'Europe/Amsterdam')::date + 1,
            (b.created_at at time zone 'Europe/Amsterdam')::date + 60,
            interval '1 day'
          ) as d
          where extract(isodow from d) < 6
          order by d
          offset termijn - 1
          limit 1
        )
      )
    returning b.id, b.docent_id, b.created_by, b.vak, b.datum, b.start_tijd, b.eind_tijd, b.lab_id
  )
  select v.id, p.email, v.vak, v.datum, v.start_tijd, v.eind_tijd, l.naam
  from verlopen v
  left join public.profiles p on p.id = coalesce(v.docent_id, v.created_by)
  left join public.labs l on l.id = v.lab_id;
end;
$$;

grant execute on function public.planning_verlopen_opruimen() to authenticated;
