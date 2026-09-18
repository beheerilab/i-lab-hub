-- Fase 14: Contacten wordt een uitgebreider CRM — instantie -> afdeling ->
-- contactpersoon, met per persoon contactmomenten, geboortedatum en een
-- eigen visitekaartje.

-- 1. Meer soorten instanties.
alter table public.contacts drop constraint if exists contacts_soort_check;
alter table public.contacts add constraint contacts_soort_check
  check (soort in ('gemeente', 'school', 'bedrijfsleven', 'leverancier', 'uitvoerder'));

-- 2. Afdelingen: nieuwe laag tussen een instantie en de contactpersonen
-- erin. Net als de rest van het CRM voor het hele team open (niet
-- vastgezet aan de maker van de instantie).
create table public.afdelingen (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  naam text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.afdelingen enable row level security;
create policy "afdelingen zijn zichtbaar voor iedereen"
  on public.afdelingen for select to authenticated using (true);
create policy "iedereen mag een afdeling toevoegen"
  on public.afdelingen for insert to authenticated with check (true);
create policy "iedereen mag een afdeling bewerken"
  on public.afdelingen for update to authenticated using (true) with check (true);
create policy "iedereen mag een afdeling verwijderen"
  on public.afdelingen for delete to authenticated using (true);

-- 3. Contactpersonen verhuizen naar een afdeling i.p.v. rechtstreeks aan de
-- instantie te hangen; "functie" wordt "titel"; geboortedatum erbij voor
-- persoonlijke info. Bestaande personen krijgen een "Algemeen"-afdeling
-- zodat er geen data verloren gaat.
alter table public.contactpersonen rename column functie to titel;
alter table public.contactpersonen add column afdeling_id uuid references public.afdelingen (id) on delete cascade;
alter table public.contactpersonen add column geboortedatum date;

insert into public.afdelingen (contact_id, naam)
select distinct contact_id, 'Algemeen' from public.contactpersonen;

update public.contactpersonen cp
set afdeling_id = a.id
from public.afdelingen a
where a.contact_id = cp.contact_id and a.naam = 'Algemeen' and cp.afdeling_id is null;

alter table public.contactpersonen alter column afdeling_id set not null;

-- Bestaande beheer-policy was aan de maker van de instantie gekoppeld (via
-- contact_id) — nu net als de rest van het CRM voor iedereen open. contact_id
-- zelf is overbodig geworden (de afdeling verwijst al naar de instantie).
drop policy if exists "maker van contact of admin beheert contactpersonen" on public.contactpersonen;
create policy "iedereen mag contactpersonen beheren"
  on public.contactpersonen for all to authenticated using (true) with check (true);

alter table public.contactpersonen drop column contact_id;

-- 4. Contactmomenten: logboek van interacties per persoon.
create table public.contactmomenten (
  id uuid primary key default gen_random_uuid(),
  contactpersoon_id uuid not null references public.contactpersonen (id) on delete cascade,
  datum date not null default current_date,
  notitie text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.contactmomenten enable row level security;
create policy "contactmomenten zijn zichtbaar voor iedereen"
  on public.contactmomenten for select to authenticated using (true);
create policy "iedereen mag een contactmoment toevoegen"
  on public.contactmomenten for insert to authenticated with check (created_by = auth.uid());
create policy "maker of admin mag contactmoment verwijderen"
  on public.contactmomenten for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- 5. Bijlagen (visitekaartje/contract/overig) mogen voortaan ook aan een
-- persoon hangen i.p.v. alleen aan de instantie.
alter table public.contact_bijlagen add column contactpersoon_id uuid references public.contactpersonen (id) on delete cascade;
alter table public.contact_bijlagen alter column contact_id drop not null;
alter table public.contact_bijlagen add constraint contact_bijlagen_doel_check check (
  (contact_id is not null and contactpersoon_id is null) or (contact_id is null and contactpersoon_id is not null)
);
