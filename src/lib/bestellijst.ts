import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Eén aanvraag zoals de Bestellijst-tool (src/tools-html/bestellijst.html) hem kent. */
export type BestelItem = { id: string; status: string; [veld: string]: unknown };

export type BestellijstData = {
  items: BestelItem[];
  bestelNamen: Record<string, string>;
};

export type BestellijstWijziging = {
  upserts?: BestelItem[];
  deletes?: string[];
  bestelNamen?: Record<string, string>;
};

const STATUSSEN = ["aangevraagd", "besteld", "binnen", "geannuleerd"];

export async function laadBestellijst(supabase: SupabaseClient<Database>): Promise<BestellijstData> {
  const [{ data: rijen }, { data: namen }] = await Promise.all([
    supabase.from("bestel_items").select("id, status, data").order("created_at", { ascending: true }),
    supabase.from("bestel_namen").select("sleutel, naam"),
  ]);
  return {
    items: (rijen ?? []).map((r) => ({ ...r.data, id: r.id, status: r.status })),
    bestelNamen: Object.fromEntries((namen ?? []).map((n) => [n.sleutel, n.naam])),
  };
}

/**
 * Schrijft wijzigingen weg. De rechten worden door RLS afgedwongen
 * (zie migratie 0026): beheerder mag alles, een lid alleen eigen open aanvragen.
 * Geeft de ids terug die niet gelukt zijn.
 */
export async function slaBestellijstOp(
  supabase: SupabaseClient<Database>,
  userId: string,
  wijziging: BestellijstWijziging,
): Promise<{ mislukt: string[] }> {
  const mislukt: string[] = [];
  const upserts = (wijziging.upserts ?? []).filter(
    (i) => typeof i?.id === "string" && i.id && STATUSSEN.includes(i.status),
  );

  if (upserts.length > 0) {
    const { data: bestaand } = await supabase
      .from("bestel_items")
      .select("id")
      .in("id", upserts.map((i) => i.id));
    const bestaandeIds = new Set((bestaand ?? []).map((r) => r.id));

    for (const item of upserts) {
      const { id, status, ...rest } = item;
      const data = { ...rest, id, status };
      if (bestaandeIds.has(id)) {
        const { error } = await supabase
          .from("bestel_items")
          .update({ status, data, updated_at: new Date().toISOString(), updated_by: userId })
          .eq("id", id);
        if (error) mislukt.push(id);
      } else {
        const { error } = await supabase
          .from("bestel_items")
          .insert({ id, status, data, aanvrager_id: userId, updated_by: userId });
        if (error) mislukt.push(id);
      }
    }
  }

  for (const id of wijziging.deletes ?? []) {
    if (typeof id !== "string") continue;
    const { error } = await supabase.from("bestel_items").delete().eq("id", id);
    if (error) mislukt.push(id);
  }

  for (const [sleutel, naam] of Object.entries(wijziging.bestelNamen ?? {})) {
    if (!sleutel) continue;
    if (naam.trim()) {
      await supabase.from("bestel_namen").upsert({ sleutel, naam, updated_at: new Date().toISOString() });
    } else {
      await supabase.from("bestel_namen").delete().eq("sleutel", sleutel);
    }
  }

  return { mislukt };
}
