"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string };

export async function createContactAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const naam = String(formData.get("naam") ?? "").trim();
  const categorie = String(formData.get("categorie") ?? "").trim();
  const telefoon = String(formData.get("telefoon") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const notities = String(formData.get("notities") ?? "").trim();

  if (!naam) return { error: "Vul een naam in." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Je bent niet ingelogd." };

  const { error } = await supabase.from("contacts").insert({
    naam,
    categorie: categorie || null,
    telefoon: telefoon || null,
    email: email || null,
    notities: notities || null,
    created_by: user.id,
  });

  if (error) return { error: "Toevoegen mislukt: " + error.message };

  revalidatePath("/contacten");
  revalidatePath("/bestellijst");
  return {};
}

export async function deleteContactAction(id: string) {
  const supabase = await createClient();
  await supabase.from("contacts").delete().eq("id", id);
  revalidatePath("/contacten");
  revalidatePath("/bestellijst");
}
