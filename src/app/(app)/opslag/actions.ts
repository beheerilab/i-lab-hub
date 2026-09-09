"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { OpslagHoofdlijn } from "./types";

/** Slaat de volledige inhoud van één vak op — zelfde aanpak als het origineel: elke wijziging schrijft het hele vak terug. */
export async function saveZoneContentAction(zoneNaam: string, inhoud: OpslagHoofdlijn[]) {
  const supabase = await createClient();
  await supabase
    .from("opslag_content")
    .upsert({ zone_naam: zoneNaam, inhoud, updated_at: new Date().toISOString() });
  revalidatePath("/opslag");
}
