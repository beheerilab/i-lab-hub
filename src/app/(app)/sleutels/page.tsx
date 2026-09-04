import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { SleutelForm } from "./sleutel-form";
import { SleutelRow } from "./sleutel-row";

export default async function SleutelsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const { data: sleutelsRaw } = await supabase.from("sleutels").select("*").order("naam");

  const zoekterm = q.trim().toLowerCase();
  const sleutels = (sleutelsRaw ?? []).filter((s) =>
    zoekterm
      ? s.naam.toLowerCase().includes(zoekterm) ||
        (s.sleutelnummer ?? "").toLowerCase().includes(zoekterm)
      : true,
  );

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-white">Sleuteloverzicht</h1>
      <p className="mb-6 text-white/80">Wie heeft welke sleutel en tag.</p>

      <SleutelForm />

      <form method="GET" className="mb-6 flex max-w-sm gap-2">
        <Input type="search" name="q" placeholder="Zoek op naam of sleutelnummer…" defaultValue={q} />
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium hover:bg-black/[.03]"
        >
          Zoeken
        </button>
      </form>

      <Card>
        {sleutels.length === 0 ? (
          <p className="text-muted">Geen sleutels gevonden.</p>
        ) : (
          <ul>
            {sleutels.map((s) => (
              <SleutelRow
                key={s.id}
                sleutel={s}
                magBeheren={profile.role === "admin" || s.created_by === userId}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
