-- Fase 4: boekingen kunnen ook bijeenkomsten zijn (bedrijven/gemeente op bezoek),
-- niet alleen lessen. Zelfde kolommen, andere labels/opties per categorie.

alter table public.bookings
  add column categorie text not null default 'les' check (categorie in ('les', 'bijeenkomst'));

alter table public.bookings add column type_activiteit_anders text;

alter table public.bookings drop constraint if exists bookings_type_activiteit_check;
alter table public.bookings add constraint bookings_type_activiteit_check check (
  type_activiteit in ('les', 'project', 'vrij_gebruik', 'extern_bezoek', 'evenement', 'vergadering', 'anders')
);
