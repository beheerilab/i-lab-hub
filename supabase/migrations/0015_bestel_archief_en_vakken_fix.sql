-- Fase 6: bestellijst krijgt een expliciet archief-stadium (besteld-items
-- blijven zichtbaar in de actieve lijst met checkboxes tot alles is
-- afgevinkt en handmatig gearchiveerd), en de vakkenlijst wordt hersteld.

-- 1. Bestellijst-archief.
alter table public.order_items add column gearchiveerd boolean not null default false;

-- Bestaande besteld/binnen-items zijn al "klaar" onder de oude flow — die
-- moeten in Historie blijven staan, niet plots in de actieve lijst opduiken.
update public.order_items set gearchiveerd = true where status in ('besteld', 'binnen');

-- 2. Vakkenlijst herstellen (niet-destructief: update i.p.v. verwijderen/
-- opnieuw invoegen, zodat gekoppeld lesmateriaal niet meeslept).
update public.subjects set naam = '10 Keuken/Restaurant' where naam = '09 Keuken';
update public.subjects set naam = '11 Duurzaamheid/Installatietechniek'
  where naam = '10 Duurzaamheid/Installatie techniek';

insert into public.subjects (naam) values
  ('08 Vergaderruimte'),
  ('09 Limonadefabriek')
on conflict (naam) do nothing;
