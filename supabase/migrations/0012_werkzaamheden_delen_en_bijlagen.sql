-- Fase 4: werkzaamheden krijgen eigen regie — iedereen maakt eigen items aan,
-- een werkzaamheid is privé (maker/toegewezene/admin) tenzij expliciet
-- gedeeld met specifieke collega's, en er kunnen foto's bij.

create table if not exists public.task_shares (
  task_id uuid not null references public.tasks (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (task_id, profile_id)
);

alter table public.task_shares enable row level security;

-- Herbruikbare zichtbaarheidscheck: maker, toegewezene, admin, of iemand met
-- wie de taak gedeeld is. security definer zodat dit ook door de policies
-- van task_shares/task_bijlagen gebruikt kan worden zonder recursie.
create or replace function public.mag_taak_zien(p_task_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.tasks t
    where t.id = p_task_id
      and (
        t.created_by = auth.uid()
        or t.toegewezen_aan = auth.uid()
        or public.is_admin()
        or exists (
          select 1 from public.task_shares ts
          where ts.task_id = t.id and ts.profile_id = auth.uid()
        )
      )
  );
$$;

create policy "betrokkenen zien met wie een taak gedeeld is"
  on public.task_shares for select to authenticated
  using (public.mag_taak_zien(task_id));

create policy "maker of admin beheert het delen"
  on public.task_shares for all to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.tasks t where t.id = task_shares.task_id and t.created_by = auth.uid())
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.tasks t where t.id = task_shares.task_id and t.created_by = auth.uid())
  );

-- Bestaande taken-policies vervangen: iedereen mag eigen werkzaamheden
-- aanmaken (was: alleen admin), zichtbaarheid wordt privé-tenzij-gedeeld.
drop policy if exists "taken zijn zichtbaar voor iedereen" on public.tasks;
drop policy if exists "alleen admin maakt een taak aan" on public.tasks;
drop policy if exists "admin mag taken beheren" on public.tasks;

create policy "zichtbaar voor maker, toegewezene, admin of gedeeld"
  on public.tasks for select to authenticated
  using (
    created_by = auth.uid()
    or toegewezen_aan = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.task_shares ts
      where ts.task_id = tasks.id and ts.profile_id = auth.uid()
    )
  );

create policy "iedereen mag een eigen werkzaamheid aanmaken"
  on public.tasks for insert to authenticated
  with check (created_by = auth.uid());

create policy "maker of admin mag werkzaamheid bewerken"
  on public.tasks for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

create policy "maker of admin mag werkzaamheid verwijderen"
  on public.tasks for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- Foto's/bijlagen per werkzaamheid.
create table if not exists public.task_bijlagen (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  file_path text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.task_bijlagen enable row level security;

create policy "bijlagen zichtbaar voor wie de taak mag zien"
  on public.task_bijlagen for select to authenticated
  using (public.mag_taak_zien(task_id));

create policy "wie de taak mag zien mag een bijlage toevoegen"
  on public.task_bijlagen for insert to authenticated
  with check (public.mag_taak_zien(task_id) and created_by = auth.uid());

create policy "uploader of admin mag bijlage verwijderen"
  on public.task_bijlagen for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

insert into storage.buckets (id, name, public)
values ('werkzaamheden', 'werkzaamheden', true)
on conflict (id) do nothing;

create policy "werkzaamheden-bestanden zijn zichtbaar voor ingelogde gebruikers"
  on storage.objects for select to authenticated
  using (bucket_id = 'werkzaamheden');

create policy "ingelogde gebruikers mogen een werkzaamheden-bestand uploaden"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'werkzaamheden');

create policy "eigenaar of admin mag werkzaamheden-bestand verwijderen"
  on storage.objects for delete to authenticated
  using (bucket_id = 'werkzaamheden' and (owner = auth.uid() or public.is_admin()));
