import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { ContactForm } from "./contact-form";
import { ContactCard } from "./contact-card";

const SOORT_TABS = [
  { value: "", label: "Alle" },
  { value: "leverancier", label: "Leveranciers" },
  { value: "uitvoerder", label: "Uitvoerders" },
] as const;

export default async function ContactenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; soort?: string }>;
}) {
  const { q = "", soort = "" } = await searchParams;
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  let query = supabase.from("contacts").select("*").order("naam");
  if (soort === "leverancier" || soort === "uitvoerder") {
    query = query.eq("soort", soort);
  }
  const { data: contactsRaw } = await query;

  const zoekterm = q.trim().toLowerCase();
  const contacts = (contactsRaw ?? []).filter((c) =>
    zoekterm
      ? c.naam.toLowerCase().includes(zoekterm) || (c.categorie ?? "").toLowerCase().includes(zoekterm)
      : true,
  );

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-white">Contacten</h1>
      <p className="mb-6 text-white/80">
        Leveranciers en andere contacten — wie je waarvoor kunt bellen of mailen.
      </p>

      <ContactForm />

      <div className="mb-4 inline-flex gap-1 rounded-xl border border-border bg-white p-1">
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
        <Input type="search" name="q" placeholder="Zoek op naam of categorie…" defaultValue={q} />
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {contacts.map((c) => (
            <ContactCard
              key={c.id}
              id={c.id}
              naam={c.naam}
              soort={c.soort}
              categorie={c.categorie}
              telefoon={c.telefoon}
              email={c.email}
              notities={c.notities}
              adres={c.adres}
              magVerwijderen={profile.role === "admin" || c.created_by === userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
