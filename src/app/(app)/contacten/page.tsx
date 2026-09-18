import Link from "next/link";
import { requireGeenDocent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { GradientSearchInput } from "@/components/ui/field";
import { ContactForm } from "./contact-form";
import { ContactRow } from "./contact-row";
import { SOORT_OPTIES } from "./soort";
import type { ContactSoort } from "@/lib/supabase/database.types";

const SOORT_TABS = [
  { value: "", label: "Alle" },
  { value: "gemeente", label: "Gemeente" },
  { value: "school", label: "Scholen" },
  { value: "bedrijfsleven", label: "Bedrijfsleven" },
  { value: "leverancier", label: "Leveranciers" },
  { value: "uitvoerder", label: "Uitvoerders" },
] as const;

export default async function ContactenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; soort?: string }>;
}) {
  const { q = "", soort = "" } = await searchParams;
  const { userId, profile } = await requireGeenDocent();
  const supabase = await createClient();

  let query = supabase
    .from("contacts")
    .select("*, afdelingen(naam, contactpersonen(naam))")
    .order("naam");
  if (SOORT_OPTIES.includes(soort as ContactSoort)) {
    query = query.eq("soort", soort as ContactSoort);
  }
  const { data: contactsRaw } = await query;

  const zoekterm = q.trim().toLowerCase();
  const contacts = (contactsRaw ?? []).filter((c) =>
    zoekterm
      ? c.naam.toLowerCase().includes(zoekterm) ||
        (c.categorie ?? "").toLowerCase().includes(zoekterm) ||
        (c.afdelingen ?? []).some(
          (a) =>
            a.naam.toLowerCase().includes(zoekterm) ||
            (a.contactpersonen ?? []).some((p) => p.naam.toLowerCase().includes(zoekterm)),
        ) ||
        (c.zoekwoorden ?? []).some((w) => w.toLowerCase().includes(zoekterm))
      : true,
  );

  return (
    <div>
      <div className="mb-1 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">Contacten</h1>
        <ContactForm />
      </div>
      <p className="mb-6 text-white/80">
        Gemeente, scholen, bedrijfsleven, leveranciers en uitvoerders — wie je waarvoor kunt
        bellen of mailen.
      </p>

      <div className="mb-4 inline-flex flex-wrap gap-1 rounded-xl border border-border bg-white p-1">
        {SOORT_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/contacten?${tab.value ? `soort=${tab.value}&` : ""}q=${encodeURIComponent(q)}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              soort === tab.value ? "bg-accent text-white" : "text-muted hover:bg-black/[.03]"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <form method="GET" className="mb-6 flex max-w-sm gap-2">
        <input type="hidden" name="soort" value={soort} />
        <GradientSearchInput
          name="q"
          placeholder="Zoek op naam, afdeling, contactpersoon of zoekwoord…"
          defaultValue={q}
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium hover:bg-black/[.03]"
        >
          Zoeken
        </button>
      </form>

      {contacts.length === 0 ? (
        <Card>
          <p className="text-muted">Geen contacten gevonden.</p>
        </Card>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {contacts.map((c) => (
            <ContactRow
              key={c.id}
              contact={{
                id: c.id,
                naam: c.naam,
                soort: c.soort,
                categorie: c.categorie,
                telefoon: c.telefoon,
                email: c.email,
                adres: c.adres,
                notities: c.notities,
                zoekwoorden: c.zoekwoorden,
              }}
              magBeheren={profile.role === "admin" || c.created_by === userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
