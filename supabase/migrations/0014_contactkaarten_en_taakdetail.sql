-- Fase 5: Contacten worden volwaardige bedrijfskaarten (leverancier/
-- uitvoerder, adres, contactpersonen, visitekaartjes/contract), en
-- werkzaamheden krijgen een leverancier-koppeling + notities-logboek.

-- 1. Contacten uitbreiden.
alter table public.contacts add column soort text not null default 'leverancier'
  check (soort in ('leverancier', 'uitvoerder'));
alter table public.contacts add column adres text;

create table if not exists public.contactpersonen (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  naam text not null,
  functie text,
  telefoon text,
  email text,
  created_at timestamptz not null default now()
);

alter table public.contactpersonen enable row level security;

create policy "contactpersonen zijn zichtbaar voor iedereen"
  on public.contactpersonen for select to authenticated using (true);
create policy "maker van contact of admin beheert contactpersonen"
  on public.contactpersonen for all to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.contacts c where c.id = contactpersonen.contact_id and c.created_by = auth.uid())
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.contacts c where c.id = contactpersonen.contact_id and c.created_by = auth.uid())
  );

create table if not exists public.contact_bijlagen (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  file_path text not null,
  type text not null default 'overig' check (type in ('visitekaartje', 'contract', 'overig')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.contact_bijlagen enable row level security;

create policy "bijlagen van contacten zijn zichtbaar voor iedereen"
  on public.contact_bijlagen for select to authenticated using (true);
create policy "iedereen mag een bijlage bij een contact toevoegen"
  on public.contact_bijlagen for insert to authenticated with check (created_by = auth.uid());
create policy "uploader of admin mag contact-bijlage verwijderen"
  on public.contact_bijlagen for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

insert into storage.buckets (id, name, public)
values ('contacten', 'contacten', true)
on conflict (id) do nothing;

create policy "contacten-bestanden zijn zichtbaar voor ingelogde gebruikers"
  on storage.objects for select to authenticated
  using (bucket_id = 'contacten');
create policy "ingelogde gebruikers mogen een contacten-bestand uploaden"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'contacten');
create policy "eigenaar of admin mag contacten-bestand verwijderen"
  on storage.objects for delete to authenticated
  using (bucket_id = 'contacten' and (owner = auth.uid() or public.is_admin()));

-- 2. Werkzaamheden: leverancier-koppeling + notities-logboek.
alter table public.tasks add column leverancier_id uuid references public.contacts (id) on delete set null;

create table if not exists public.task_notities (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  tekst text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.task_notities enable row level security;

create policy "notities zichtbaar voor wie de taak mag zien"
  on public.task_notities for select to authenticated
  using (public.mag_taak_zien(task_id));
create policy "wie de taak mag zien mag een notitie toevoegen"
  on public.task_notities for insert to authenticated
  with check (public.mag_taak_zien(task_id) and created_by = auth.uid());

-- Toegewezene mag nu ook de taak bewerken (was: alleen maker/admin), zodat
-- diegene de beschrijving/leverancier kan bijwerken.
drop policy if exists "maker of admin mag werkzaamheid bewerken" on public.tasks;
create policy "maker, toegewezene of admin mag werkzaamheid bewerken"
  on public.tasks for update to authenticated
  using (created_by = auth.uid() or toegewezen_aan = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or toegewezen_aan = auth.uid() or public.is_admin());
