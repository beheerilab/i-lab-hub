-- Planning: de docent-regels (trigger) gelden niet voor de service-role
-- (beheerscripts, zoals het laden van demodata). Gewone gebruikers
-- (anon/authenticated) worden er nog steeds door beperkt.

create or replace function public.bookings_docent_regels()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Beheerscripts met de service-role-sleutel.
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- Het automatisch laten verlopen van aanvragen (planning_verlopen_opruimen)
  -- mag de regels voor docenten omzeilen.
  if coalesce(current_setting('app.planning_sweep', true), '') = '1' then
    return new;
  end if;

  if public.is_crew() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'pending' then
      raise exception 'Een docent kan alleen een aanvraag indienen';
    end if;
    if not exists (select 1 from public.labs where id = new.lab_id and docent_boekbaar) then
      raise exception 'Deze ruimte is niet boekbaar voor docenten';
    end if;
    return new;
  end if;

  -- UPDATE
  if new.created_by is distinct from old.created_by or new.docent_id is distinct from old.docent_id then
    raise exception 'De docent van een boeking kan niet gewijzigd worden';
  end if;

  if old.status = 'pending' then
    if new.status not in ('pending', 'withdrawn') then
      raise exception 'Een aanvraag kan alleen door i-lab beoordeeld worden';
    end if;
  elsif old.status = 'confirmed' then
    if new.status <> 'cancelled'
       or (new.lab_id, new.datum, new.start_tijd, new.eind_tijd)
          is distinct from (old.lab_id, old.datum, old.start_tijd, old.eind_tijd) then
      raise exception 'Een bevestigde les kan alleen geannuleerd worden';
    end if;
  else
    raise exception 'Deze boeking kan niet meer gewijzigd worden';
  end if;

  return new;
end;
$$;
