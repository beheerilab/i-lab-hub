-- Fase 9 ronde 2a hotfix: de backfill uit migratie 0017 lijkt profiles.email
-- niet overal gevuld te hebben (crew_emails() kwam leeg terug bij een echte
-- test). Deze herhaling is veilig om nogmaals te draaien — raakt alleen rijen
-- waar email nog steeds null is.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;
