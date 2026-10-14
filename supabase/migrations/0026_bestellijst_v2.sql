-- Bestellijst V2 (vervangt de oude order_items/order_batches in de interface).
-- De oude tabellen blijven bestaan als archief, maar worden niet meer gebruikt.

-- Helper: is de ingelogde gebruiker crew (admin of lid) i.p.v. docent?
-- Staat ook in 0017; hier opnieuw (create or replace) zodat deze migratie
-- ook werkt als 0017 destijds niet is uitgevoerd.
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

create table if not exists public.bestel_items (
  id text primary key,
  status text not null default 'aangevraagd'
    check (status in ('aangevraagd', 'besteld', 'binnen', 'geannuleerd')),
  aanvrager_id uuid references public.profiles (id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create index if not exists bestel_items_status_idx on public.bestel_items (status);

-- Eigen naam per bestelling (de "factuurnaam" die in de bestelronde is aangepast).
create table if not exists public.bestel_namen (
  sleutel text primary key,
  naam text not null,
  updated_at timestamptz not null default now()
);

alter table public.bestel_items enable row level security;
alter table public.bestel_namen enable row level security;

-- Crew (admin + lid) ziet alles; docenten komen er niet bij.
create policy "crew ziet bestel_items"
  on public.bestel_items for select to authenticated
  using (public.is_crew());

-- Iedereen uit de crew mag een aanvraag doen (status aangevraagd, op eigen naam);
-- de beheerder mag alles.
create policy "crew mag aanvraag toevoegen"
  on public.bestel_items for insert to authenticated
  with check (
    public.is_admin()
    or (public.is_crew() and aanvrager_id = auth.uid() and status = 'aangevraagd')
  );

create policy "eigen open aanvraag bewerken, admin alles"
  on public.bestel_items for update to authenticated
  using (
    public.is_admin()
    or (public.is_crew() and aanvrager_id = auth.uid() and status = 'aangevraagd')
  )
  with check (
    public.is_admin()
    or (public.is_crew() and aanvrager_id = auth.uid() and status = 'aangevraagd')
  );

create policy "eigen open aanvraag verwijderen, admin alles"
  on public.bestel_items for delete to authenticated
  using (
    public.is_admin()
    or (public.is_crew() and aanvrager_id = auth.uid() and status = 'aangevraagd')
  );

create policy "crew ziet bestel_namen"
  on public.bestel_namen for select to authenticated
  using (public.is_crew());

create policy "alleen admin beheert bestel_namen"
  on public.bestel_namen for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Foto's verlopen 30 dagen nadat een aanvraag in het archief staat (binnen of
-- geannuleerd). Wordt bij het openen van de bestellijst aangeroepen; de rest
-- van de aanvraag blijft bewaard.
create or replace function public.bestel_fotos_opruimen()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  aantal integer;
begin
  if not public.is_crew() then
    return 0;
  end if;

  update public.bestel_items
  set data = data - 'foto'
  where status in ('binnen', 'geannuleerd')
    and coalesce(data->>'foto', '') <> ''
    and (
      case
        when data->>'binnenOp' ~ '^\d{4}-\d{2}-\d{2}$' then (data->>'binnenOp')::date
        else updated_at::date
      end
    ) < current_date - 30;

  get diagnostics aantal = row_count;
  return aantal;
end;
$$;
