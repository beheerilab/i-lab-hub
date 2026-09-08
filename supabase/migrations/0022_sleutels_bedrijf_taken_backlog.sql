-- Fase 12: bedrijf-veld bij sleutelhouders (naast functie, voor externen),
-- en werkzaamheden mogen voortaan zonder datum bestaan (backlog/
-- prioriteitenlijst — pas een datum krijgen zodra ze ingepland worden).

alter table public.sleutels add column bedrijf text;

alter table public.tasks alter column datum drop not null;
