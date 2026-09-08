-- Fase 10: prioriteit op werkzaamheden (t.b.v. het nieuwe sleepbare
-- kanban-bord), zoekwoorden op contacten (zodat je op synoniemen als
-- "loodgieter" een installatiebedrijf kunt terugvinden) en een alarmcode per
-- sleutelhouder (meldkamer-code, centraal geregistreerd bij het
-- sleuteloverzicht).

alter table public.tasks add column prioriteit text not null default 'normaal'
  check (prioriteit in ('hoog', 'normaal', 'laag'));

alter table public.contacts add column zoekwoorden text[] not null default '{}';

alter table public.sleutels add column alarmcode text;
