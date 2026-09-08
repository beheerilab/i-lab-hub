"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string };

export async function createSleutelAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const naam = String(formData.get("naam") ?? "").trim();
  const functie = String(formData.get("functie") ?? "").trim();
  const sleutelnummer = String(formData.get("sleutelnummer") ?? "").trim();
  const tagnummer = String(formData.get("tagnummer") ?? "").trim();
  const telefoon = String(formData.get("telefoon") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const adres = String(formData.get("adres") ?? "").trim();
  const opmerkingen = String(formData.get("opmerkingen") ?? "").trim();
  const alarmcode = String(formData.get("alarmcode") ?? "").trim();

  if (!naam) return { error: "Vul een naam in." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Je bent niet ingelogd." };

  const { error } = await supabase.from("sleutels").insert({
    naam,
    functie: functie || null,
    sleutelnummer: sleutelnummer || null,
    tagnummer: tagnummer || null,
    telefoon: telefoon || null,
    email: email || null,
    adres: adres || null,
    opmerkingen: opmerkingen || null,
    alarmcode: alarmcode || null,
    created_by: user.id,
  });

  if (error) return { error: "Toevoegen mislukt: " + error.message };

  revalidatePath("/sleutels");
  return {};
}

export async function updateSleutelAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const naam = String(formData.get("naam") ?? "").trim();
  const functie = String(formData.get("functie") ?? "").trim();
  const sleutelnummer = String(formData.get("sleutelnummer") ?? "").trim();
  const tagnummer = String(formData.get("tagnummer") ?? "").trim();
  const telefoon = String(formData.get("telefoon") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const adres = String(formData.get("adres") ?? "").trim();
  const opmerkingen = String(formData.get("opmerkingen") ?? "").trim();
  const alarmcode = String(formData.get("alarmcode") ?? "").trim();

  if (!id) return { error: "Ongeldige sleutel." };
  if (!naam) return { error: "Vul een naam in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sleutels")
    .update({
      naam,
      functie: functie || null,
      sleutelnummer: sleutelnummer || null,
      tagnummer: tagnummer || null,
      telefoon: telefoon || null,
      email: email || null,
      adres: adres || null,
      opmerkingen: opmerkingen || null,
      alarmcode: alarmcode || null,
    })
    .eq("id", id);

  if (error) return { error: "Opslaan mislukt: " + error.message };

  revalidatePath("/sleutels");
  return {};
}

export async function deleteSleutelAction(id: string) {
  const supabase = await createClient();
  await supabase.from("sleutels").delete().eq("id", id);
  revalidatePath("/sleutels");
}
