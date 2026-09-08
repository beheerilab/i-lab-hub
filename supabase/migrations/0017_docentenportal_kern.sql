-- Fase 9 ronde 2a: kern van de docentenportal. Docenten kunnen straks zelf
-- een les inplannen/wijzigen/annuleren, maar zien van andermans boekingen
-- alleen een "dichte" reservering (via bookings_docent_view). Uitnodigen per
-- e-mail (ronde 2b) vergt de Supabase service role key en komt later.

-- 1. Rolmodel: docent erbij naast admin/lid.
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'lid', 'docent'));

-- E-mailadres nodig om de crew te kunnen mailen (zie crew_emails() hieronder).
-- Gevuld door handle_new_user() bij nieuwe signups; bestaande profielen
-- krijgen een eenmalige backfill uit auth.users.
alter table public.profiles add column email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  return new;
end;
$$;

-- Alleen crew (admin/lid) mag e-mailadressen ophalen — security definer zodat
-- dit niet via de algemene profiles-select-policy hoeft te lopen (die blijft
-- ongewijzigd, dus geen e-mailadressen zichtbaar voor gewone select * op profiles
-- vanuit de app).
create or replace function public.crew_emails()
returns setof text
language sql
stable
security definer set search_path = public
as $$
  select email from public.profiles where role in ('admin', 'lid') and email is not null;
$$;

-- Herbruikbare helper, zelfde patroon als is_admin(): is de ingelogde
-- gebruiker crew (admin of lid) i.p.v. docent?
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

-- 2. Ruimtes: per ruimte instelbaar of docenten die zelf mogen boeken.
alter table public.labs add column docent_boekbaar boolean not null default false;

-- 3. Boekingen: "dichte" weergave voor docenten — eigen boeking volledig
-- zichtbaar, andermans boeking alleen tijd/ruimte (gevoelige kolommen null).
create view public.bookings_docent_view
with (security_invoker = true) as
select
  b.id,
  b.lab_id,
  b.datum,
  b.start_tijd,
  b.eind_tijd,
  b.categorie,
  b.type_activiteit,
  case when b.created_by = auth.uid() then b.vak else null end as vak,
  case when b.created_by = auth.uid() then b.school else null end as school,
  case when b.created_by = auth.uid() then b.docent else null end as docent,
  case when b.created_by = auth.uid() then b.type_activiteit_anders else null end as type_activiteit_anders,
  case when b.created_by = auth.uid() then b.aantal_leerlingen else null end as aantal_leerlingen,
  case when b.created_by = auth.uid() then b.bijzonderheden else null end as bijzonderheden,
  b.created_by
from public.bookings b;

grant select on public.bookings_docent_view to authenticated;

-- 4. RLS op bookings aanscherpen: nu nog "iedereen mag alles corrigeren/
-- verwijderen" (onschuldig met 5 vertrouwde crewleden, niet meer zodra
-- docenten meedoen). Crew houdt volledige rechten; iedereen (dus ook docent)
-- mag alleen eigen boekingen bewerken/verwijderen.
drop policy if exists "iedereen mag boekingen corrigeren" on public.bookings;
drop policy if exists "iedereen mag boekingen verwijderen" on public.bookings;

create policy "crew of eigenaar mag boeking bewerken"
  on public.bookings for update to authenticated
  using (created_by = auth.uid() or public.is_crew())
  with check (created_by = auth.uid() or public.is_crew());

create policy "crew of eigenaar mag boeking verwijderen"
  on public.bookings for delete to authenticated
  using (created_by = auth.uid() or public.is_crew());
