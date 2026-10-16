-- Werkzaamheden V2: werkorders met bord, terugkerend werk, signalen, checklists,
-- updates en bijlagen. De oude tabel `tasks` blijft bestaan als archief maar
-- wordt niet meer gebruikt in de hub.

create or replace function public.is_crew()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lid')
  );
$$;

create sequence if not exists public.werkzaamheden_nr_seq;

create table if not exists public.werkzaamheden (
  id uuid primary key default gen_random_uuid(),
  nr integer not null unique default nextval('public.werkzaamheden_nr_seq'),
  title text not null check (char_length(title) between 1 and 200),
  descr text not null default '',
  cat text not null default 'onderhoud'
    check (cat in ('onderhoud', 'gebouw', 'veilig', 'inkoop', 'lessen', 'admin')),
  prio text not null default 'normaal' check (prio in ('urgent', 'hoog', 'normaal', 'laag')),
  who text not null default '',            -- '' = niemand, 'samen', of het id van een profiel
  status text not null default 'plannen'
    check (status in ('plannen', 'week', 'bezig', 'wacht', 'klaar')),
  due date,
  lead_days integer not null default 0 check (lead_days between 0 and 365),
  repeat text not null default '' check (repeat in ('', 'w1', 'w2', 'm1', 'm3', 'm6', 'm12', 'm24')),
  loc text not null default '',
  checklist jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  log jsonb not null default '[]'::jsonb,
  series_id uuid,
  next_id uuid,
  done_at date,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

create index if not exists werkzaamheden_status_idx on public.werkzaamheden (status);
create index if not exists werkzaamheden_due_idx on public.werkzaamheden (due);
create index if not exists werkzaamheden_series_idx on public.werkzaamheden (series_id);

alter table public.werkzaamheden enable row level security;

create policy "crew ziet werkzaamheden"
  on public.werkzaamheden for select to authenticated using (public.is_crew());

-- Beheerder maakt taken aan; een collega mag alleen de volgende keer van een
-- bestaande terugkerende reeks aanmaken (gebeurt automatisch bij afronden).
create policy "beheerder maakt werkzaamheden, collega alleen vervolg in reeks"
  on public.werkzaamheden for insert to authenticated
  with check (
    public.is_admin()
    or (
      public.is_crew()
      and series_id is not null
      and exists (select 1 from public.werkzaamheden w where w.series_id = werkzaamheden.series_id)
    )
  );

create policy "beheerder wijzigt alles, collega eigen en gedeelde taken"
  on public.werkzaamheden for update to authenticated
  using (public.is_admin() or (public.is_crew() and (who = auth.uid()::text or who = 'samen')))
  with check (public.is_crew());

create policy "alleen beheerder verwijdert werkzaamheden"
  on public.werkzaamheden for delete to authenticated using (public.is_admin());

-- Een collega mag alleen status, wie, checklist-vinkjes, updates en het
-- afrondingsveld wijzigen — niet titel, toelichting, deadline, enz.
create or replace function public.werkzaamheden_veldrechten()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;
  if new.title is distinct from old.title
     or new.descr is distinct from old.descr
     or new.cat is distinct from old.cat
     or new.prio is distinct from old.prio
     or new.due is distinct from old.due
     or new.lead_days is distinct from old.lead_days
     or new.repeat is distinct from old.repeat
     or new.loc is distinct from old.loc
     or new.nr is distinct from old.nr
     or new.series_id is distinct from old.series_id
     or new.created_by is distinct from old.created_by then
    raise exception 'Alleen de beheerder kan de gegevens van een werkorder wijzigen';
  end if;
  return new;
end;
$$;

drop trigger if exists werkzaamheden_veldrechten_trg on public.werkzaamheden;
create trigger werkzaamheden_veldrechten_trg
  before update on public.werkzaamheden
  for each row execute function public.werkzaamheden_veldrechten();

-- Bijlagen bij een werkorder (bestanden in de privé-bucket "werkzaamheden-bijlagen").
create table if not exists public.werkzaamheden_bijlagen (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.werkzaamheden (id) on delete cascade,
  naam text not null,
  pad text not null,
  type text,
  grootte integer,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists werkzaamheden_bijlagen_task_idx on public.werkzaamheden_bijlagen (task_id);

alter table public.werkzaamheden_bijlagen enable row level security;

create policy "crew ziet bijlagen van werkzaamheden"
  on public.werkzaamheden_bijlagen for select to authenticated using (public.is_crew());
create policy "crew voegt bijlagen toe"
  on public.werkzaamheden_bijlagen for insert to authenticated
  with check (public.is_crew() and created_by = auth.uid());
create policy "beheerder of uploader verwijdert bijlage"
  on public.werkzaamheden_bijlagen for delete to authenticated
  using (public.is_admin() or created_by = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit)
values ('werkzaamheden-bijlagen', 'werkzaamheden-bijlagen', false, 10485760)
on conflict (id) do nothing;

drop policy if exists "werkbijlage uploaden" on storage.objects;
create policy "werkbijlage uploaden" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'werkzaamheden-bijlagen' and public.is_crew());

drop policy if exists "werkbijlage bekijken" on storage.objects;
create policy "werkbijlage bekijken" on storage.objects
  for select to authenticated
  using (bucket_id = 'werkzaamheden-bijlagen' and public.is_crew());

drop policy if exists "werkbijlage verwijderen" on storage.objects;
create policy "werkbijlage verwijderen" on storage.objects
  for delete to authenticated
  using (bucket_id = 'werkzaamheden-bijlagen' and public.is_crew());
