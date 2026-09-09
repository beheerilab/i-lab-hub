-- Fase 13: Opslagoverzicht — plattegrond met opslagvakken, met per vak een
-- geneste inhoud (hoofdlijn -> subcategorie -> items). Eén rij per vak, hele
-- inhoud als JSON — dit is gedeelde, collaboratieve inventarisatiedata zonder
-- een "eigenaar" per rij (net als de rest van de crew-only modules mag
-- iedere ingelogde collega, behalve docenten, dit lezen en bewerken).

create table if not exists public.opslag_content (
  zone_naam text primary key,
  inhoud jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.opslag_content enable row level security;

create policy "opslaginhoud is zichtbaar voor iedereen"
  on public.opslag_content for select to authenticated using (true);
create policy "iedereen mag opslaginhoud toevoegen"
  on public.opslag_content for insert to authenticated with check (true);
create policy "iedereen mag opslaginhoud bewerken"
  on public.opslag_content for update to authenticated using (true) with check (true);
