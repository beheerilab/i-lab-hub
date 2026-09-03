"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActiviteitType } from "@/lib/supabase/database.types";

export type ActionState = { error?: string };

export async function saveBookingAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const labId = String(formData.get("lab_id") ?? "");
  const datum = String(formData.get("datum") ?? "");
  const startUur = Number(formData.get("start_uur"));
  const vak = String(formData.get("vak") ?? "").trim();
  const klasGroep = String(formData.get("klas_groep") ?? "").trim();
  const typeActiviteit = String(formData.get("type_activiteit") ?? "") as ActiviteitType;
  const aantalLeerlingen = Number(formData.get("aantal_leerlingen"));

  if (!labId || !datum || !Number.isFinite(startUur)) {
    return { error: "Ongeldig tijdvak." };
  }
  if (!vak) return { error: "Vul een vak in." };
  if (!klasGroep) return { error: "Vul een klas of groep in." };
  if (!["les", "project", "vrij_gebruik", "extern_bezoek"].includes(typeActiviteit)) {
    return { error: "Kies een type activiteit." };
  }
  if (!Number.isFinite(aantalLeerlingen) || aantalLeerlingen < 0) {
    return { error: "Vul een geldig aantal leerlingen in." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Je bent niet ingelogd." };

  const payload = {
    lab_id: labId,
    datum,
    start_uur: startUur,
    vak,
    klas_groep: klasGroep,
    type_activiteit: typeActiviteit,
    aantal_leerlingen: aantalLeerlingen,
  };

  const { error } = id
    ? await supabase.from("bookings").update(payload).eq("id", id)
    : await supabase.from("bookings").insert({ ...payload, created_by: user.id });

  if (error) {
    if (error.code === "23505") {
      return { error: "Dit tijdvak is al geboekt in dit lab." };
    }
    return { error: "Opslaan mislukt: " + error.message };
  }

  revalidatePath("/planning");
  return {};
}

export async function deleteBookingAction(id: string) {
  const supabase = await createClient();
  await supabase.from("bookings").delete().eq("id", id);
  revalidatePath("/planning");
}
