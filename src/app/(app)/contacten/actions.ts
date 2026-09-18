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

export type AfdelingMetPersonen = {
  id: string;
  naam: string;
  contactpersonen: {
    id: string;
    naam: string;
    titel: string | null;
    telefoon: string | null;
    email: string | null;
  }[];
};

/** Hele boom van een instantie: afdelingen + de contactpersonen erin. */
export async function getContactHierarchieAction(contactId: string): Promise<AfdelingMetPersonen[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("afdelingen")
    .select("id, naam, contactpersonen(id, naam, titel, telefoon, email)")
    .eq("contact_id", contactId)
    .order("naam");
  return data ?? [];
}

export async function addAfdelingAction(contactId: string, naam: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("afdelingen").insert({ contact_id: contactId, naam, created_by: user?.id });
  revalidatePath("/contacten");
}

export async function deleteAfdelingAction(id: string) {
  const supabase = await createClient();
  await supabase.from("afdelingen").delete().eq("id", id);
  revalidatePath("/contacten");
}

export async function addContactpersoonAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const afdelingId = String(formData.get("afdeling_id") ?? "");
  const naam = String(formData.get("naam") ?? "").trim();
  const titel = String(formData.get("titel") ?? "").trim();
  const telefoon = String(formData.get("telefoon") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!afdelingId) return { error: "Ongeldige afdeling." };
  if (!naam) return { error: "Vul een naam in." };

  const supabase = await createClient();
  const { error } = await supabase.from("contactpersonen").insert({
    afdeling_id: afdelingId,
    naam,
    titel: titel || null,
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

export type PersoonDetail = {
  naam: string;
  titel: string | null;
  telefoon: string | null;
  email: string | null;
  geboortedatum: string | null;
  momenten: { id: string; datum: string; notitie: string; auteur: string }[];
  bijlagen: { id: string; type: string; url: string }[];
};

export async function getPersoonDetailAction(persoonId: string): Promise<PersoonDetail> {
  const supabase = await createClient();

  const [{ data: persoon }, { data: momenten }, { data: bijlagen }] = await Promise.all([
    supabase
      .from("contactpersonen")
      .select("naam, titel, telefoon, email, geboortedatum")
      .eq("id", persoonId)
      .single(),
    supabase
      .from("contactmomenten")
      .select("id, datum, notitie, profiles(full_name)")
      .eq("contactpersoon_id", persoonId)
      .order("datum", { ascending: false }),
    supabase.from("contact_bijlagen").select("id, file_path, type").eq("contactpersoon_id", persoonId),
  ]);

  return {
    naam: persoon?.naam ?? "",
    titel: persoon?.titel ?? null,
    telefoon: persoon?.telefoon ?? null,
    email: persoon?.email ?? null,
    geboortedatum: persoon?.geboortedatum ?? null,
    momenten: (momenten ?? []).map((m) => ({
      id: m.id,
      datum: m.datum,
      notitie: m.notitie,
      auteur: m.profiles?.full_name || "onbekend",
    })),
    bijlagen: (bijlagen ?? []).map((b) => ({
      id: b.id,
      type: b.type,
      url: supabase.storage.from("contacten").getPublicUrl(b.file_path).data.publicUrl,
    })),
  };
}

export async function updatePersoonAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const naam = String(formData.get("naam") ?? "").trim();
  const titel = String(formData.get("titel") ?? "").trim();
  const telefoon = String(formData.get("telefoon") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const geboortedatum = String(formData.get("geboortedatum") ?? "").trim();

  if (!id) return { error: "Ongeldige contactpersoon." };
  if (!naam) return { error: "Vul een naam in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("contactpersonen")
    .update({
      naam,
      titel: titel || null,
      telefoon: telefoon || null,
      email: email || null,
      geboortedatum: geboortedatum || null,
    })
    .eq("id", id);

  if (error) return { error: "Opslaan mislukt: " + error.message };

  revalidatePath("/contacten");
  return {};
}

export async function addContactmomentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const contactpersoonId = String(formData.get("contactpersoon_id") ?? "");
  const datum = String(formData.get("datum") ?? "").trim();
  const notitie = String(formData.get("notitie") ?? "").trim();

  if (!contactpersoonId) return { error: "Ongeldige contactpersoon." };
  if (!notitie) return { error: "Vul een notitie in." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Je bent niet ingelogd." };

  const { error } = await supabase.from("contactmomenten").insert({
    contactpersoon_id: contactpersoonId,
    datum: datum || undefined,
    notitie,
    created_by: user.id,
  });

  if (error) return { error: "Opslaan mislukt: " + error.message };

  revalidatePath("/contacten");
  return {};
}

export async function deleteContactmomentAction(id: string) {
  const supabase = await createClient();
  await supabase.from("contactmomenten").delete().eq("id", id);
  revalidatePath("/contacten");
}

/** Uploadt een bijlage bij een instantie óf bij een specifieke contactpersoon (precies één van de twee ids meegeven). */
export async function uploadBijlageAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const contactId = String(formData.get("contact_id") ?? "").trim() || null;
  const contactpersoonId = String(formData.get("contactpersoon_id") ?? "").trim() || null;
  const type = String(formData.get("type") ?? "overig") as ContactBijlageType;
  const file = formData.get("file");

  if (!contactId && !contactpersoonId) return { error: "Ongeldig doel." };
  if (!(file instanceof File) || file.size === 0) return { error: "Kies een bestand." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Je bent niet ingelogd." };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${contactId ?? contactpersoonId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from("contacten").upload(filePath, file);
  if (uploadError) return { error: "Upload mislukt: " + uploadError.message };

  const { error } = await supabase.from("contact_bijlagen").insert({
    contact_id: contactId,
    contactpersoon_id: contactpersoonId,
    file_path: filePath,
    type,
    created_by: user.id,
  });
  if (error) return { error: "Opslaan mislukt: " + error.message };

  revalidatePath("/contacten");
  return {};
}

export async function deleteContactBijlageAction(id: string) {
  const supabase = await createClient();
  await supabase.from("contact_bijlagen").delete().eq("id", id);
  revalidatePath("/contacten");
}

export async function getContactBijlagenAction(contactId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contact_bijlagen")
    .select("id, file_path, type")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((b) => ({
    id: b.id,
    type: b.type,
    url: supabase.storage.from("contacten").getPublicUrl(b.file_path).data.publicUrl,
  }));
}
