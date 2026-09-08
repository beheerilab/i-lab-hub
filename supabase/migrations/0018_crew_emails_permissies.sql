-- Fase 9 ronde 2a hotfix: crew_emails() geeft echte e-mailadressen terug en
-- had, zoals elke net aangemaakte functie, standaard EXECUTE-rechten voor
-- iedereen (ook niet-ingelogde bezoekers via de publieke anon-key) — dat is
-- hier wél gevoelig, in tegenstelling tot de bestaande boolean-only helpers
-- (is_admin() e.d.). Voortaan alleen aanroepbaar door ingelogde gebruikers.
revoke execute on function public.crew_emails() from public;
grant execute on function public.crew_emails() to authenticated;
