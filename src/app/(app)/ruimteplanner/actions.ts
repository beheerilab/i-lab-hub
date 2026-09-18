"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string };

function revalidateBeide() {
  revalidatePath("/ruimteplanner");
  revalidatePath("/planning");
}

export async function createReserveringAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const labId = String(formData.get("lab_id") ?? "");
  const datum = String(formData.get("datum") ?? "");
  const startTijd = String(formData.get("start_tijd") ?? "");
  const eindTijd = String(formData.get("eind_tijd") ?? "");
  const gastnaam = String(formData.get("gastnaam") ?? "").trim();
  const aantalGasten = Number(formData.get("aantal_gasten"));

  if (!labId || !datum) return { error: "Kies een ruimte en datum." };
  if (!startTijd || !eindTijd) return { error: "Vul een begin- en eindtijd in." };
  if (startTijd >= eindTijd) return { error: "Eindtijd moet na begintijd liggen." };
  if (!gastnaam) return { error: "Vul een naam in." };
  if (!Number.isFinite(aantalGasten) || aantalGasten < 0) {
    return { error: "Vul een geldig aantal gasten in." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Je bent niet ingelogd." };

  const { error } = await supabase.from("bookings").insert({
    lab_id: labId,
    datum,
    start_tijd: startTijd,
    eind_tijd: eindTijd,
    categorie: "bijeenkomst",
    type_activiteit: "evenement",
    vak: gastnaam,
    school: "",
    docent: gastnaam,
    aantal_leerlingen: aantalGasten,
    created_by: user.id,
  });

  if (error) {
    if (error.code === "23P01") {
      return { error: "Dit tijdvak overlapt met een bestaande reservering in deze ruimte." };
    }
    return { error: "Opslaan mislukt: " + error.message };
  }

  revalidateBeide();
  return {};
}

export async function updateReserveringAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const labId = String(formData.get("lab_id") ?? "");
  const datum = String(formData.get("datum") ?? "");
  const startTijd = String(formData.get("start_tijd") ?? "");
  const eindTijd = String(formData.get("eind_tijd") ?? "");
  const gastnaam = String(formData.get("gastnaam") ?? "").trim();
  const aantalGasten = Number(formData.get("aantal_gasten"));

  if (!id) return { error: "Ongeldige reservering." };
  if (!labId || !datum) return { error: "Kies een ruimte en datum." };
  if (!startTijd || !eindTijd) return { error: "Vul een begin- en eindtijd in." };
  if (startTijd >= eindTijd) return { error: "Eindtijd moet na begintijd liggen." };
  if (!gastnaam) return { error: "Vul een naam in." };
  if (!Number.isFinite(aantalGasten) || aantalGasten < 0) {
    return { error: "Vul een geldig aantal gasten in." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      lab_id: labId,
      datum,
      start_tijd: startTijd,
      eind_tijd: eindTijd,
      vak: gastnaam,
      docent: gastnaam,
      aantal_leerlingen: aantalGasten,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23P01") {
      return { error: "Dit tijdvak overlapt met een bestaande reservering in deze ruimte." };
    }
    return { error: "Opslaan mislukt: " + error.message };
  }

  revalidateBeide();
  return {};
}

export async function deleteReserveringAction(id: string) {
  const supabase = await createClient();
  await supabase.from("bookings").delete().eq("id", id);
  revalidateBeide();
}
