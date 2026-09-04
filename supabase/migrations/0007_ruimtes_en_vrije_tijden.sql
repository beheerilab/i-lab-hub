-- Fase 2: van 3 vaste labs + lesuren naar 13 echte ruimtes met vrije tijden.

-- Testdata opschonen (op verzoek, schone start voor de echte huisstijl/ruimtes).
delete from public.order_items;
delete from public.order_batches;
delete from public.tasks;
delete from public.manuals;
delete from public.subjects; -- cascadeert naar topics + materials
delete from public.bookings;

-- Ruimtes vervangen: Lab 01 t/m 11 + twee spreekkamers.
delete from public.labs;
insert into public.labs (naam, volgorde) values
  ('Lab 01', 1), ('Lab 02', 2), ('Lab 03', 3), ('Lab 04', 4), ('Lab 05', 5),
  ('Lab 06', 6), ('Lab 07', 7), ('Lab 08', 8), ('Lab 09', 9), ('Lab 10', 10),
  ('Lab 11', 11), ('Spreekkamer Ashton', 12), ('Spreekkamer Hopper', 13);

-- Boekingsvelden: klas/groep wordt school, plus docent en bijzonderheden.
alter table public.bookings rename column klas_groep to school;
alter table public.bookings add column docent text not null default '';
alter table public.bookings alter column docent drop default;
alter table public.bookings add column bijzonderheden text;

-- Vaste uurblokken vervangen door vrije start-/eindtijden.
alter table public.bookings drop constraint if exists bookings_start_uur_check;
alter table public.bookings drop constraint if exists bookings_lab_id_datum_start_uur_key;

alter table public.bookings add column start_tijd time;
alter table public.bookings add column eind_tijd time;
alter table public.bookings alter column start_tijd set not null;
alter table public.bookings alter column eind_tijd set not null;
alter table public.bookings add constraint bookings_tijd_geldig check (eind_tijd > start_tijd);
alter table public.bookings drop column start_uur;

-- Overlap-preventie op basis van vrije tijden (i.p.v. exacte-uur-match): twee
-- boekingen in dezelfde ruimte op dezelfde dag mogen elkaar nooit overlappen,
-- gehandhaafd op databaseniveau.
create extension if not exists btree_gist;

alter table public.bookings
  add column start_minuten integer generated always as (
    extract(hour from start_tijd)::int * 60 + extract(minute from start_tijd)::int
  ) stored,
  add column eind_minuten integer generated always as (
    extract(hour from eind_tijd)::int * 60 + extract(minute from eind_tijd)::int
  ) stored;

alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (
    lab_id with =,
    datum with =,
    int4range(start_minuten, eind_minuten) with &&
  );
