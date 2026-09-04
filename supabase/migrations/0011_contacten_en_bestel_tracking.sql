-- Fase 4: nieuwe Contacten-module (leveranciers/bellijst) + bestellijst die
-- per item bijhoudt: besteld/binnen, bij welke leverancier, en facturatie.

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  categorie text,
  telefoon text,
  email text,
  notities text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.contacts enable row level security;

create policy "contacten zijn zichtbaar voor iedereen"
  on public.contacts for select to authenticated using (true);
create policy "iedereen mag een contact toevoegen"
  on public.contacts for insert to authenticated with check (created_by = auth.uid());
create policy "maker of admin mag contact bewerken"
  on public.contacts for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());
create policy "maker of admin mag contact verwijderen"
  on public.contacts for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- Bestellijst: elk item krijgt voortaan zijn eigen bestelmoment/leverancier/
-- status i.p.v. alles gezamenlijk in één bestelbatch. De oude
-- order_batches-tabel/order_batch_id-kolom worden niet meer gebruikt door de
-- app, maar blijven ongewijzigd staan (geen dataverlies).
alter table public.order_items add column status text not null default 'actief'
  check (status in ('actief', 'besteld', 'binnen'));
alter table public.order_items add column besteld_op timestamptz;
alter table public.order_items add column leverancier_id uuid references public.contacts (id) on delete set null;
alter table public.order_items add column binnen_op timestamptz;
alter table public.order_items add column factuur_aangevraagd boolean not null default false;
alter table public.order_items add column factuur_opgeslagen boolean not null default false;
alter table public.order_items add column factuurnaam text;

drop policy if exists "eigenaar mag actief item bewerken" on public.order_items;
create policy "eigenaar mag actief item bewerken"
  on public.order_items for update to authenticated
  using (toegevoegd_door = auth.uid() and status = 'actief')
  with check (toegevoegd_door = auth.uid() and status = 'actief');

drop policy if exists "eigenaar mag actief item verwijderen" on public.order_items;
create policy "eigenaar mag actief item verwijderen"
  on public.order_items for delete to authenticated
  using (toegevoegd_door = auth.uid() and status = 'actief');

drop function if exists public.markeer_bestellijst_als_besteld();
