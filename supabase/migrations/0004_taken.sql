-- Module 3: taken.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  titel text not null,
  beschrijving text,
  datum date not null,
  toegewezen_aan uuid references public.profiles (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'afgevinkt')),
  afgevinkt_op timestamptz,
  gearchiveerd boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists tasks_datum_idx on public.tasks (datum);
create index if not exists tasks_toegewezen_aan_idx on public.tasks (toegewezen_aan);

alter table public.tasks enable row level security;

-- Iedereen ziet alle taken (teamoverzicht), maar alleen admin maakt ze aan
-- of bewerkt/archiveert ze rechtstreeks. Afvinken door de toegewezen
-- gebruiker gaat via de aparte functie toggle_task() hieronder, zodat een
-- lid nooit andere velden dan status/afgevinkt_op kan wijzigen.
create policy "taken zijn zichtbaar voor iedereen"
  on public.tasks for select to authenticated using (true);

create policy "alleen admin maakt een taak aan"
  on public.tasks for insert to authenticated with check (public.is_admin());

create policy "admin mag taken beheren"
  on public.tasks for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.toggle_task(task_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  huidige_status text;
  toegewezen uuid;
begin
  select status, toegewezen_aan into huidige_status, toegewezen
  from public.tasks where id = task_id;

  if toegewezen is null or (toegewezen <> auth.uid() and not public.is_admin()) then
    raise exception 'Je mag deze taak niet afvinken.';
  end if;

  if huidige_status = 'open' then
    update public.tasks set status = 'afgevinkt', afgevinkt_op = now() where id = task_id;
  else
    update public.tasks set status = 'open', afgevinkt_op = null where id = task_id;
  end if;
end;
$$;
