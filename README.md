# i-lab Hub

Centraal systeem voor het i-lab: bestellijst, lesmateriaal, taken, planning,
jaaroverzicht en handleidingen op één plek.

## Techniek

Next.js (App Router) + TypeScript + Tailwind CSS, Supabase (auth + Postgres +
storage) voor de backend.

## 1. Supabase-project aanmaken

1. Ga naar [supabase.com](https://supabase.com), maak een account/organisatie
   en klik op **New project**. Kies een naam (bijv. `i-lab-hub`), een
   wachtwoord voor de database en een regio dichtbij (bijv. Frankfurt).
2. Wacht tot het project klaar is (ca. 1-2 minuten).
3. Ga naar **Project Settings → API**. Daar vind je:
   - **Project URL** → dit wordt `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → dit wordt `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Database-schema aanmaken

Alle tabellen, rechten (Row Level Security) en storage-buckets staan als
losse SQL-bestanden in `supabase/migrations/`, in de volgorde waarin de
modules gebouwd zijn (`0001_profiles.sql` t/m `0006_handleidingen.sql`).

**Makkelijkste manier:** open in je Supabase-project **SQL Editor**, en
plak en voer elk bestand uit `supabase/migrations/` één voor één uit, in
volgorde (0001, 0002, 0003, …).

**Alternatief (met de Supabase CLI):**

```bash
npm install -g supabase
supabase login
supabase link --project-ref <jouw-project-ref>   # te vinden in Project Settings → General
supabase db push
```

## 3. E-mailbevestiging (aanbevolen voor dit interne team)

Ga naar **Authentication → Providers → Email** en zet **Confirm email**
desgewenst uit, zodat teamleden meteen kunnen inloggen na het aanmaken van
een account zonder eerst een bevestigingsmail te hoeven openen. Laat je hem
aan staan, dan moet iedereen na het aanmaken van een account eerst op de
link in de bevestigingsmail klikken.

## 4. Environment variables invullen

Kopieer `.env.local.example` naar `.env.local` en vul de twee waarden in
die je bij stap 1 hebt opgezocht:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 5. Lokaal opstarten

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Maak via **Account
aanmaken** het eerste account aan, en klik op het dashboard op **Word
beheerder** — dat werkt alleen zolang er nog geen enkele beheerder bestaat.
Collega's die zich daarna aanmelden krijgen automatisch de rol "lid"; jij
kunt ze later desgewenst tot beheerder maken (rechtstreeks in de
`profiles`-tabel in Supabase, of via een latere uitbreiding van de
instellingenpagina).

## 6. Deployen naar Vercel

1. Zet de code op GitHub en importeer het project in
   [vercel.com](https://vercel.com).
2. Voeg in **Project Settings → Environment Variables** dezelfde twee
   variabelen toe als in `.env.local`.
3. Koppel het domein `i-lab.online` via **Project Settings → Domains**.

Omdat authenticatie en database volledig via Supabase lopen (geen lokale
SQLite-toestand zoals bij sommige andere projecten), werkt lokaal en
productie meteen tegen dezelfde database zodra je dezelfde environment
variables gebruikt.
