-- Module 1: bestellijst.

create table if not exists public.order_batches (
  id uuid primary key default gen_random_uuid(),
  besteld_op timestamptz not null default now(),
  besteld_door uuid references public.profiles (id) on delete set null
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  item_naam text not null,
  aantal integer not null check (aantal > 0),
  notitie text,
  link text,
  toegevoegd_door uuid references public.profiles (id) on delete set null,
  order_batch_id uuid references public.order_batches (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists order_items_batch_idx on public.order_items (order_batch_id);

alter table public.order_batches enable row level security;
alter table public.order_items enable row level security;

-- order_batches: iedereen ziet de bestelhistorie, alleen admin maakt een
-- nieuw bestelmoment aan ("markeer als besteld").
create policy "bestelmomenten zijn zichtbaar voor iedereen"
  on public.order_batches for select
  to authenticated
  using (true);

create policy "alleen admin maakt een bestelmoment aan"
  on public.order_batches for insert
  to authenticated
  with check (public.is_admin());

-- order_items: iedereen ziet de lijst en mag toevoegen; de toevoeger mag
-- zijn eigen item nog bewerken/verwijderen zolang het niet besteld is.
-- Alleen admin mag een item aan een bestelmoment koppelen (order_batch_id
-- zetten) of iets aanpassen nadat het besteld is.
create policy "bestellijst is zichtbaar voor iedereen"
  on public.order_items for select
  to authenticated
  using (true);

create policy "iedereen mag een item toevoegen"
  on public.order_items for insert
  to authenticated
  with check (toegevoegd_door = auth.uid());

create policy "eigenaar mag actief item bewerken"
  on public.order_items for update
  to authenticated
  using (toegevoegd_door = auth.uid() and order_batch_id is null)
  with check (toegevoegd_door = auth.uid() and order_batch_id is null);

create policy "eigenaar mag actief item verwijderen"
  on public.order_items for delete
  to authenticated
  using (toegevoegd_door = auth.uid() and order_batch_id is null);

create policy "admin mag alle bestelitems beheren"
  on public.order_items for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Markeert alle actieve items als besteld: maakt één bestelmoment aan en
-- koppelt alle actieve items eraan. security definer zodat dit in één
-- transactie gebeurt; de functie controleert zelf op adminrechten.
create or replace function public.markeer_bestellijst_als_besteld()
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  nieuw_batch_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Alleen een beheerder mag de lijst als besteld markeren.';
  end if;

  if not exists (select 1 from public.order_items where order_batch_id is null) then
    raise exception 'De bestellijst is leeg.';
  end if;

  insert into public.order_batches (besteld_door) values (auth.uid())
  returning id into nieuw_batch_id;

  update public.order_items
  set order_batch_id = nieuw_batch_id
  where order_batch_id is null;

  return nieuw_batch_id;
end;
$$;
