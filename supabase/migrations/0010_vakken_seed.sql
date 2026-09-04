-- Fase 4: standaard-vakkenlijst voor de lesboekingen in de planning.
-- created_by blijft leeg (systeem-seed, geen specifieke gebruiker).

insert into public.subjects (naam) values
  ('01 Zorgtechnologie'),
  ('02 Smart engineering'),
  ('03 Maakhal'),
  ('04 Algemeen'),
  ('05 Robotica'),
  ('06 Drone technologie'),
  ('07 Bouw, Infra en groen Escaperoom'),
  ('09 Keuken'),
  ('10 Duurzaamheid/Installatie techniek')
on conflict (naam) do nothing;
