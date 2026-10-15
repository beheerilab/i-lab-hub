import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type FacturatieDb = {
  versie: 1;
  instellingen?: { [key: string]: unknown };
  reserveringen: { [key: string]: unknown }[];
};

export type FacturatieWijziging = {
  reserveringen?: { id: string; gewijzigd?: string; [key: string]: unknown }[];
  instellingen?: { gewijzigd?: string; [key: string]: unknown };
};

/** Haalt alle reserveringen en de instellingen op in de vorm die de tool gebruikt. */
export async function laadFacturatie(supabase: Client): Promise<FacturatieDb> {
  const reserveringen: { [key: string]: unknown }[] = [];
  for (let van = 0; van < 50000; van += 1000) {
    const { data } = await supabase
      .from("facturatie_reserveringen")
      .select("data")
      .order("id")
      .range(van, van + 999);
    const stuk = data ?? [];
    reserveringen.push(...stuk.map((r) => r.data));
    if (stuk.length < 1000) break;
  }
  const { data: inst } = await supabase.from("facturatie_instellingen").select("data").limit(1).maybeSingle();
  const instellingen = inst && Object.keys(inst.data).length > 0 ? inst.data : undefined;
  return { versie: 1, instellingen, reserveringen };
}

/** Slaat wijzigingen op; een oudere versie overschrijft nooit een nieuwere (op "gewijzigd"). */
export async function slaFacturatieOp(
  supabase: Client,
  userId: string,
  wijziging: FacturatieWijziging,
): Promise<{ opgeslagen: number; overgeslagen: number }> {
  const nieuw = (wijziging.reserveringen ?? []).filter((r) => typeof r?.id === "string" && r.id.length > 0 && r.id.length < 100);
  let opgeslagen = 0;
  let overgeslagen = 0;

  if (nieuw.length > 0) {
    const bestaand = new Map<string, string>();
    for (let i = 0; i < nieuw.length; i += 200) {
      const { data } = await supabase
        .from("facturatie_reserveringen")
        .select("id, gewijzigd")
        .in("id", nieuw.slice(i, i + 200).map((r) => r.id));
      (data ?? []).forEach((r) => bestaand.set(r.id, r.gewijzigd));
    }

    const rijen = nieuw
      .filter((r) => {
        const oud = bestaand.get(r.id);
        const ok = oud === undefined || String(r.gewijzigd ?? "") >= oud;
        if (!ok) overgeslagen++;
        return ok;
      })
      .map((r) => ({
        id: r.id,
        data: r as { [key: string]: unknown },
        gewijzigd: String(r.gewijzigd ?? ""),
        updated_at: new Date().toISOString(),
        updated_by: userId,
      }));
    for (let i = 0; i < rijen.length; i += 200) {
      const { error } = await supabase.from("facturatie_reserveringen").upsert(rijen.slice(i, i + 200));
      if (error) throw new Error(error.message);
      opgeslagen += Math.min(200, rijen.length - i);
    }
  }

  if (wijziging.instellingen && typeof wijziging.instellingen === "object") {
    const { data: oud } = await supabase.from("facturatie_instellingen").select("gewijzigd").limit(1).maybeSingle();
    const g = String(wijziging.instellingen.gewijzigd ?? "");
    if (!oud || g >= oud.gewijzigd) {
      const { error } = await supabase.from("facturatie_instellingen").upsert({
        id: true,
        data: wijziging.instellingen as { [key: string]: unknown },
        gewijzigd: g,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      });
      if (error) throw new Error(error.message);
    }
  }

  return { opgeslagen, overgeslagen };
}
