import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { ManualForm } from "./manual-form";
import { ManualCard } from "./manual-card";

export default async function HandleidingenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const { data: manualsRaw } = await supabase
    .from("manuals")
    .select("*")
    .order("apparaat_naam");

  const zoekterm = q.trim().toLowerCase();
  const manuals = (manualsRaw ?? []).filter((m) =>
    zoekterm ? m.apparaat_naam.toLowerCase().includes(zoekterm) : true,
  );

  const fileUrls = new Map<string, string>();
  for (const m of manuals) {
    if (m.file_path) {
      const { data } = supabase.storage.from("manuals").getPublicUrl(m.file_path);
      fileUrls.set(m.id, data.publicUrl);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Handleidingen</h1>
      <p className="mb-6 text-muted">Instructies voor apparatuur en machines in het lab.</p>

      <ManualForm />

      <form method="GET" className="mb-6">
        <Input
          type="search"
          name="q"
          placeholder="Zoek op apparaatnaam…"
          defaultValue={q}
          className="max-w-sm"
        />
      </form>

      {manuals.length === 0 ? (
        <Card>
          <p className="text-muted">Geen handleidingen gevonden.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {manuals.map((m) => (
            <ManualCard
              key={m.id}
              id={m.id}
              apparaatNaam={m.apparaat_naam}
              locatie={m.locatie}
              instructieTekst={m.instructie_tekst}
              videoLink={m.video_link}
              fileUrl={fileUrls.get(m.id) ?? null}
              magVerwijderen={profile.role === "admin" || m.created_by === userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
