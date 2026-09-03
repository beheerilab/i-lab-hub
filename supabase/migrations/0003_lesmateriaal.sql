-- Module 2: lesmateriaal (vak > onderwerp > materiaal).

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  naam text not null unique,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  naam text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (subject_id, naam)
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  titel text not null,
  beschrijving text,
  tags text[] not null default '{}',
  link text,
  file_path text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint materials_link_of_bestand check (link is not null or file_path is not null)
);

create index if not exists topics_subject_idx on public.topics (subject_id);
create index if not exists materials_subject_idx on public.materials (subject_id);
create index if not exists materials_topic_idx on public.materials (topic_id);
create index if not exists materials_tags_idx on public.materials using gin (tags);

alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.materials enable row level security;

-- subjects
create policy "vakken zijn zichtbaar voor iedereen"
  on public.subjects for select to authenticated using (true);
create policy "iedereen mag een vak aanmaken"
  on public.subjects for insert to authenticated with check (created_by = auth.uid());
create policy "maker of admin mag vak bewerken"
  on public.subjects for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());
create policy "maker of admin mag vak verwijderen"
  on public.subjects for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- topics
create policy "onderwerpen zijn zichtbaar voor iedereen"
  on public.topics for select to authenticated using (true);
create policy "iedereen mag een onderwerp aanmaken"
  on public.topics for insert to authenticated with check (created_by = auth.uid());
create policy "maker of admin mag onderwerp bewerken"
  on public.topics for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());
create policy "maker of admin mag onderwerp verwijderen"
  on public.topics for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- materials
create policy "materiaal is zichtbaar voor iedereen"
  on public.materials for select to authenticated using (true);
create policy "iedereen mag materiaal toevoegen"
  on public.materials for insert to authenticated with check (created_by = auth.uid());
create policy "maker of admin mag materiaal bewerken"
  on public.materials for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());
create policy "maker of admin mag materiaal verwijderen"
  on public.materials for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- Storage bucket voor geüploade lesmateriaal-bestanden (publiek leesbaar,
-- net als een gedeelde Drive-link — er staan geen gevoelige gegevens in).
insert into storage.buckets (id, name, public)
values ('materials', 'materials', true)
on conflict (id) do nothing;

create policy "materiaalbestanden zijn zichtbaar voor iedereen"
  on storage.objects for select to authenticated
  using (bucket_id = 'materials');

create policy "iedereen mag een materiaalbestand uploaden"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'materials');

create policy "eigenaar of admin mag materiaalbestand verwijderen"
  on storage.objects for delete to authenticated
  using (bucket_id = 'materials' and (owner = auth.uid() or public.is_admin()));
