-- Fase 7: Sleuteloverzicht — wie heeft welke fysieke sleutel/tag.
-- Eigen tabel, geen uitbreiding van contacts (heel ander datamodel).
-- RLS is een letterlijke kopie van het contacts-patroon (migratie 0003).

create table if not exists public.sleutels (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  functie text,
  sleutelnummer text,
  tagnummer text,
  telefoon text,
  email text,
  adres text,
  opmerkingen text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.sleutels enable row level security;

create policy "sleutels zijn zichtbaar voor iedereen"
  on public.sleutels for select to authenticated using (true);
create policy "iedereen mag een sleutel toevoegen"
  on public.sleutels for insert to authenticated with check (created_by = auth.uid());
create policy "maker of admin mag sleutel bewerken"
  on public.sleutels for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());
create policy "maker of admin mag sleutel verwijderen"
  on public.sleutels for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());
