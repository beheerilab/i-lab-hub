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
  const startTijd = String(formData.get("start_tijd") ?? "");
  const eindTijd = String(formData.get("eind_tijd") ?? "");
  const vak = String(formData.get("vak") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const docent = String(formData.get("docent") ?? "").trim();
  const typeActiviteit = String(formData.get("type_activiteit") ?? "") as ActiviteitType;
  const aantalLeerlingen = Number(formData.get("aantal_leerlingen"));
  const bijzonderheden = String(formData.get("bijzonderheden") ?? "").trim();

  if (!labId || !datum) return { error: "Ongeldige ruimte of datum." };
  if (!startTijd || !eindTijd) return { error: "Vul een begin- en eindtijd in." };
  if (startTijd >= eindTijd) return { error: "Eindtijd moet na begintijd liggen." };
  if (!vak) return { error: "Vul een vak/les in." };
  if (!school) return { error: "Vul de school in." };
  if (!docent) return { error: "Vul de docent of inplanner in." };
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
    start_tijd: startTijd,
    eind_tijd: eindTijd,
    vak,
    school,
    docent,
    type_activiteit: typeActiviteit,
    aantal_leerlingen: aantalLeerlingen,
    bijzonderheden: bijzonderheden || null,
  };

  const { error } = id
    ? await supabase.from("bookings").update(payload).eq("id", id)
    : await supabase.from("bookings").insert({ ...payload, created_by: user.id });

  if (error) {
    if (error.code === "23P01") {
      return { error: "Dit tijdvak overlapt met een bestaande boeking in deze ruimte." };
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

export type RoomActionState = { error?: string };

export async function createRoomAction(
  _prevState: RoomActionState,
  formData: FormData,
): Promise<RoomActionState> {
  const naam = String(formData.get("naam") ?? "").trim();
  if (!naam) return { error: "Vul een naam voor de ruimte in." };

  const supabase = await createClient();
  const { data: bestaande } = await supabase
    .from("labs")
    .select("volgorde")
    .order("volgorde", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("labs").insert({
    naam,
    volgorde: (bestaande?.volgorde ?? 0) + 1,
  });

  if (error) return { error: "Toevoegen mislukt: " + error.message };

  revalidatePath("/planning");
  return {};
}

export async function renameRoomAction(id: string, naam: string) {
  const supabase = await createClient();
  await supabase.from("labs").update({ naam }).eq("id", id);
  revalidatePath("/planning");
}

export async function toggleRoomActiveAction(id: string, actief: boolean) {
  const supabase = await createClient();
  await supabase.from("labs").update({ actief }).eq("id", id);
  revalidatePath("/planning");
}

export async function deleteRoomAction(id: string) {
  const supabase = await createClient();
  await supabase.from("labs").delete().eq("id", id);
  revalidatePath("/planning");
}

export async function reorderRoomsAction(orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, i) => supabase.from("labs").update({ volgorde: i + 1 }).eq("id", id)),
  );
  revalidatePath("/planning");
}
