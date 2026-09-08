-- Fase 11: sommige ruimtes zijn bedoeld voor volwassenen (overleg/vergaderen)
-- en niet geschikt om leerlingen les in te geven. Nieuwe kolom per ruimte,
-- standaard toegestaan (bestaand gedrag blijft voor alle andere ruimtes
-- ongewijzigd); de drie genoemde ruimtes worden nu uitgesloten voor lessen.

alter table public.labs add column leerlingen_toegestaan boolean not null default true;

update public.labs set leerlingen_toegestaan = false
  where naam in ('Lab 08', 'Spreekkamer Ashton', 'Spreekkamer Hopper');
