import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { ContactForm } from "./contact-form";
import { ContactCard } from "./contact-card";

export default async function ContactenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const { data: contactsRaw } = await supabase.from("contacts").select("*").order("naam");

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

      <form method="GET" className="mb-6 flex max-w-sm gap-2">
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
              categorie={c.categorie}
              telefoon={c.telefoon}
              email={c.email}
              notities={c.notities}
              magVerwijderen={profile.role === "admin" || c.created_by === userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
