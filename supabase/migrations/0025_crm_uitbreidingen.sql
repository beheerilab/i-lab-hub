-- Fase 15: CRM-uitbreidingen op verzoek van Daan (vervolg op fase 14).
-- Tags per contactpersoon (bijv. "beslisser", "technisch contact") — los
-- van de zoekwoorden op instantieniveau. Verjaardagen-widget, laatste-
-- contactmoment-op-de-rij en de koppeling met Werkzaamheden/Bestellijst
-- gebruiken bestaande kolommen/tabellen en hebben geen migratie nodig.

alter table public.contactpersonen add column tags text[] not null default '{}';
