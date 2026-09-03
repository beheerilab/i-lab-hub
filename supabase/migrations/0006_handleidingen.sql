-- Module 6: handleidingen van apparatuur/machines.

create table if not exists public.manuals (
  id uuid primary key default gen_random_uuid(),
  apparaat_naam text not null,
  locatie text,
  instructie_tekst text,
  file_path text,
  video_link text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists manuals_apparaat_naam_idx on public.manuals (apparaat_naam);

alter table public.manuals enable row level security;

create policy "handleidingen zijn zichtbaar voor iedereen"
  on public.manuals for select to authenticated using (true);
create policy "iedereen mag een handleiding toevoegen"
  on public.manuals for insert to authenticated with check (created_by = auth.uid());
create policy "maker of admin mag handleiding bewerken"
  on public.manuals for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());
create policy "maker of admin mag handleiding verwijderen"
  on public.manuals for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

insert into storage.buckets (id, name, public)
values ('manuals', 'manuals', true)
on conflict (id) do nothing;

create policy "handleiding-bestanden zijn zichtbaar voor iedereen"
  on storage.objects for select to authenticated
  using (bucket_id = 'manuals');

create policy "iedereen mag een handleiding-bestand uploaden"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'manuals');

create policy "eigenaar of admin mag handleiding-bestand verwijderen"
  on storage.objects for delete to authenticated
  using (bucket_id = 'manuals' and (owner = auth.uid() or public.is_admin()));
