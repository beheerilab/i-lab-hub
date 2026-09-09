import { requireGeenDocent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OpslagClient } from "./opslag-client";
import { OPSLAG_ZONES, type OpslagContent, type OpslagHoofdlijn } from "./types";

export default async function OpslagPage() {
  await requireGeenDocent();
  const supabase = await createClient();

  const { data: rows } = await supabase.from("opslag_content").select("zone_naam, inhoud");

  const content: OpslagContent = {};
  for (const row of rows ?? []) {
    content[row.zone_naam] = (row.inhoud as OpslagHoofdlijn[]) ?? [];
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-white">Opslagoverzicht</h1>
      <p className="mb-6 text-white/80">
        Waar staat wat — klik op een vak in de plattegrond of zoek op naam.
      </p>
      <OpslagClient zones={OPSLAG_ZONES} initialContent={content} />
    </div>
  );
}
