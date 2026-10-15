-- Opslag voor de losse tools (prijscalculator, reiskosten): wat vroeger in de
-- browser (localStorage) stond, komt nu in Supabase.
--   scope = 'team'      -> gedeeld met alle crew (prijscalculator)
--   scope = <user-id>   -> persoonlijk (reiskosten)

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

create table if not exists public.tool_opslag (
  tool text not null,
  sleutel text not null,
  scope text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  primary key (tool, sleutel, scope)
);

alter table public.tool_opslag enable row level security;

create policy "crew leest team- en eigen toolgegevens"
  on public.tool_opslag for select to authenticated
  using (public.is_crew() and (scope = 'team' or scope = auth.uid()::text));

create policy "crew voegt team- en eigen toolgegevens toe"
  on public.tool_opslag for insert to authenticated
  with check (public.is_crew() and (scope = 'team' or scope = auth.uid()::text));

create policy "crew wijzigt team- en eigen toolgegevens"
  on public.tool_opslag for update to authenticated
  using (public.is_crew() and (scope = 'team' or scope = auth.uid()::text))
  with check (public.is_crew() and (scope = 'team' or scope = auth.uid()::text));

create policy "crew wist team- en eigen toolgegevens"
  on public.tool_opslag for delete to authenticated
  using (public.is_crew() and (scope = 'team' or scope = auth.uid()::text));
