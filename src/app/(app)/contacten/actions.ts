"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ContactSoort, ContactBijlageType } from "@/lib/supabase/database.types";

export type ActionState = { error?: string };

export async function createContactAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const naam = String(formData.get("naam") ?? "").trim();
  const soort = String(formData.get("soort") ?? "leverancier") as ContactSoort;
  const categorie = String(formData.get("categorie") ?? "").trim();
  const telefoon = String(formData.get("telefoon") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const adres = String(formData.get("adres") ?? "").trim();
  const notities = String(formData.get("notities") ?? "").trim();
  const zoekwoorden = String(formData.get("zoekwoorden") ?? "")
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);

  if (!naam) return { error: "Vul een naam in." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Je bent niet ingelogd." };

  const { error } = await supabase.from("contacts").insert({
    naam,
    soort,
    categorie: categorie || null,
    telefoon: telefoon || null,
    email: email || null,
    adres: adres || null,
    notities: notities || null,
    zoekwoorden,
    created_by: user.id,
  });

  if (error) return { error: "Toevoegen mislukt: " + error.message };

  revalidatePath("/contacten");
  revalidatePath("/bestellijst");
  return {};
}

export async function updateContactSoortAction(id: string, soort: ContactSoort) {
  const supabase = await createClient();
  await supabase.from("contacts").update({ soort }).eq("id", id);
  revalidatePath("/contacten");
  revalidatePath("/bestellijst");
}

export async function updateZoekwoordenAction(id: string, ruw: string) {
  const zoekwoorden = ruw
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);
  const supabase = await createClient();
  await supabase.from("contacts").update({ zoekwoorden }).eq("id", id);
  revalidatePath("/contacten");
}

export async function deleteContactAction(id: string) {
  const supabase = await createClient();
  await supabase.from("contacts").delete().eq("id", id);
  revalidatePath("/contacten");
  revalidatePath("/bestellijst");
}

export async function getContactDetailsAction(contactId: string) {
  const supabase = await createClient();

  const [{ data: personen }, { data: bijlagen }] = await Promise.all([
    supabase
      .from("contactpersonen")
      .select("id, naam, functie, telefoon, email")
      .eq("contact_id", contactId)
      .order("naam"),
    supabase
      .from("contact_bijlagen")
      .select("id, file_path, type")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false }),
  ]);

  const bijlagenMetUrl = (bijlagen ?? []).map((b) => ({
    id: b.id,
    type: b.type,
    url: supabase.storage.from("contacten").getPublicUrl(b.file_path).data.publicUrl,
  }));

  return { personen: personen ?? [], bijlagen: bijlagenMetUrl };
}

export async function addContactpersoonAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const contactId = String(formData.get("contact_id") ?? "");
  const naam = String(formData.get("naam") ?? "").trim();
  const functie = String(formData.get("functie") ?? "").trim();
  const telefoon = String(formData.get("telefoon") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!contactId) return { error: "Ongeldig contact." };
  if (!naam) return { error: "Vul een naam in." };

  const supabase = await createClient();
  const { error } = await supabase.from("contactpersonen").insert({
    contact_id: contactId,
    naam,
    functie: functie || null,
    telefoon: telefoon || null,
    email: email || null,
  });

  if (error) return { error: "Toevoegen mislukt: " + error.message };

  revalidatePath("/contacten");
  return {};
}

export async function deleteContactpersoonAction(id: string) {
  const supabase = await createClient();
  await supabase.from("contactpersonen").delete().eq("id", id);
  revalidatePath("/contacten");
}

export async function uploadContactBijlageAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const contactId = String(formData.get("contact_id") ?? "");
  const type = String(formData.get("type") ?? "overig") as ContactBijlageType;
  const file = formData.get("file");

  if (!contactId) return { error: "Ongeldig contact." };
  if (!(file instanceof File) || file.size === 0) return { error: "Kies een bestand." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Je bent niet ingelogd." };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${contactId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from("contacten").upload(filePath, file);
  if (uploadError) return { error: "Upload mislukt: " + uploadError.message };

  const { error } = await supabase
    .from("contact_bijlagen")
    .insert({ contact_id: contactId, file_path: filePath, type, created_by: user.id });
  if (error) return { error: "Opslaan mislukt: " + error.message };

  revalidatePath("/contacten");
  return {};
}

export async function deleteContactBijlageAction(id: string) {
  const supabase = await createClient();
  await supabase.from("contact_bijlagen").delete().eq("id", id);
  revalidatePath("/contacten");
}
