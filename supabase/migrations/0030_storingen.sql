-- =====================================================================
-- i-lab hub · Storingen & machinelogboek  (versie 2) — migratie 0030 voor de hub
-- Uitvoeren in Supabase: SQL Editor > New query > plakken > Run
-- Mag ook opnieuw worden uitgevoerd over versie 1 heen.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Machines (ieder apparaat of iedere set met één QR-code) ----------
create table if not exists public.machines (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique check (code ~ '^[A-Z0-9-]{2,20}$'),
  naam           text not null,
  categorie      text,
  merk           text,
  model          text,
  locatie        text,
  aanschafdatum  date,
  aantal         int  not null default 1 check (aantal between 1 and 200),  -- >1 = set (bijv. 12 drones), docent kiest itemnummer
  melden_aan     boolean not null default true,                          -- uitzetten bij misbruik van de QR-code
  actief         boolean not null default true,
  notities       text,
  created_at     timestamptz not null default now()
);
alter table public.machines add column if not exists aantal int not null default 1;
alter table public.machines add column if not exists melden_aan boolean not null default true;

-- ---------- Storingen ----------
create table if not exists public.storingen (
  id               uuid primary key default gen_random_uuid(),
  machine_code     text not null references public.machines(code) on update cascade on delete restrict,
  item_nr          int check (item_nr >= 0),          -- null = enkel apparaat, 0 = "weet ik niet", 1..n = exemplaar
  ernst            text not null check (ernst in ('defect','gedeeltelijk')),
  omschrijving     text not null check (char_length(omschrijving) between 3 and 1000),
  datum            date not null default current_date,
  gemeld_door      text check (char_length(gemeld_door) <= 80),
  gemeld_door_id   uuid,                               -- gevuld als de melder ingelogd was
  bron             text not null default 'qr' check (bron in ('qr','hub')),
  foto_pad         text,
  status           text not null default 'nieuw'
                   check (status in ('nieuw','in_behandeling','gerepareerd','afgeschreven')),
  gemeld_op        timestamptz not null default now(),
  opgelost_op      timestamptz,
  oorzaak          text,
  reparatie        text,
  gerepareerd_door text,
  kosten           numeric(10,2),
  onderdelen       text
);
alter table public.storingen add column if not exists item_nr int;
alter table public.storingen add column if not exists datum date not null default current_date;
alter table public.storingen add column if not exists gemeld_door_id uuid;
alter table public.storingen add column if not exists bron text not null default 'qr';
create index if not exists storingen_machine_idx on public.storingen(machine_code);
create index if not exists storingen_status_idx  on public.storingen(status);

-- ---------- Wie is beheerder? (ÉÉN plek om aan te passen) ----------
-- In de hub: alleen de beheerder (rol admin). Wil je ook leden (collega's) bij
-- de storingen, vervang dan public.is_admin() door public.is_crew().
create or replace function public.is_storing_beheerder()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.is_admin(), false);
$$;
grant execute on function public.is_storing_beheerder() to authenticated;

-- ---------- Beveiliging (RLS): alleen de beheerder ziet en wijzigt ----------
alter table public.machines  enable row level security;
alter table public.storingen enable row level security;

drop policy if exists "hub beheert machines" on public.machines;
create policy "hub beheert machines" on public.machines
  for all to authenticated using (public.is_storing_beheerder()) with check (public.is_storing_beheerder());

drop policy if exists "hub beheert storingen" on public.storingen;
create policy "hub beheert storingen" on public.storingen
  for all to authenticated using (public.is_storing_beheerder()) with check (public.is_storing_beheerder());

-- ---------- Openbare functies voor het meldformulier ----------
drop function if exists public.machine_info(text);
create function public.machine_info(p_code text)
returns table(code text, naam text, locatie text, aantal int, melden_aan boolean,
              open_aantal int, laatste_open text, laatste_open_item int, laatste_open_op timestamptz)
language sql security definer set search_path = public stable as $$
  select m.code, m.naam, m.locatie, m.aantal, m.melden_aan,
         (select count(*)::int from storingen s
           where s.machine_code = m.code and s.status in ('nieuw','in_behandeling')),
         o.omschrijving, o.item_nr, o.gemeld_op
  from machines m
  left join lateral (
    select s.omschrijving, s.item_nr, s.gemeld_op from storingen s
    where s.machine_code = m.code and s.status in ('nieuw','in_behandeling')
    order by s.gemeld_op desc limit 1
  ) o on true
  where m.code = upper(trim(p_code)) and m.actief;
$$;

drop function if exists public.meld_storing(text,text,text,text,text);
drop function if exists public.meld_storing(text,text,text,text,date,int,text);
create function public.meld_storing(
  p_code text, p_ernst text, p_omschrijving text, p_naam text,
  p_datum date default current_date, p_item int default null, p_foto_pad text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id   uuid;
  v_code text := upper(trim(p_code));
  v_m    machines%rowtype;
begin
  select * into v_m from machines where code = v_code and actief;
  if not found then
    raise exception 'Onbekend apparaat. Scan de QR-code opnieuw.';
  end if;
  if not v_m.melden_aan then
    raise exception 'Melden via de QR-code staat voor dit apparaat tijdelijk uit. Meld het direct bij de beheerder.';
  end if;
  if char_length(trim(coalesce(p_naam, ''))) < 2 then
    raise exception 'Vul je naam in.';
  end if;
  if char_length(trim(coalesce(p_omschrijving, ''))) < 3 then
    raise exception 'Beschrijf kort wat er aan de hand is.';
  end if;
  if p_ernst not in ('defect','gedeeltelijk') then
    raise exception 'Kies of het apparaat nog werkt.';
  end if;
  if p_datum is null or p_datum > current_date + 1 or p_datum < current_date - 30 then
    raise exception 'De datum moet binnen de afgelopen 30 dagen liggen.';
  end if;
  if v_m.aantal > 1 then
    if p_item is null or p_item < 0 or p_item > v_m.aantal then
      raise exception 'Kies welk exemplaar (nummer) het is.';
    end if;
  else
    p_item := null;
  end if;
  -- spamrem: max. 3 meldingen per apparaat per 10 minuten
  if (select count(*) from storingen
      where machine_code = v_code and bron = 'qr' and gemeld_op > now() - interval '10 minutes') >= 3 then
    raise exception 'Er zijn net al meerdere meldingen voor dit apparaat gedaan. Probeer het later opnieuw.';
  end if;
  if p_foto_pad is not null and p_foto_pad !~ ('^' || v_code || '/[0-9a-f-]{36}\.jpg$') then
    p_foto_pad := null;
  end if;

  insert into storingen (machine_code, item_nr, ernst, omschrijving, datum, gemeld_door, gemeld_door_id, bron, foto_pad)
  values (v_code, p_item, p_ernst, left(trim(p_omschrijving), 1000), p_datum,
          left(trim(p_naam), 80), auth.uid(), 'qr', p_foto_pad)
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.machine_info(text) from public;
revoke all on function public.meld_storing(text,text,text,text,date,int,text) from public;
grant execute on function public.machine_info(text) to anon, authenticated;
grant execute on function public.meld_storing(text,text,text,text,date,int,text) to anon, authenticated;

-- ---------- Foto's (privé bucket: iedereen mag uploaden, alleen de beheerder kijkt/verwijdert) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('storing-fotos', 'storing-fotos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "storingfoto uploaden" on storage.objects;
create policy "storingfoto uploaden" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'storing-fotos');

drop policy if exists "storingfoto bekijken" on storage.objects;
create policy "storingfoto bekijken" on storage.objects
  for select to authenticated using (bucket_id = 'storing-fotos' and public.is_storing_beheerder());

drop policy if exists "storingfoto verwijderen" on storage.objects;
create policy "storingfoto verwijderen" on storage.objects
  for delete to authenticated using (bucket_id = 'storing-fotos' and public.is_storing_beheerder());

-- ---------- Live meldingen op het dashboard ----------
do $$ begin
  alter publication supabase_realtime add table public.storingen;
exception when duplicate_object then null; end $$;
