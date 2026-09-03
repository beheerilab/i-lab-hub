"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string };

export async function createManualAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const apparaatNaam = String(formData.get("apparaat_naam") ?? "").trim();
  const locatie = String(formData.get("locatie") ?? "").trim();
  const instructieTekst = String(formData.get("instructie_tekst") ?? "").trim();
  const videoLink = String(formData.get("video_link") ?? "").trim();
  const file = formData.get("file");

  if (!apparaatNaam) return { error: "Vul een apparaatnaam in." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Je bent niet ingelogd." };

  let filePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    filePath = `${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("manuals").upload(filePath, file);
    if (uploadError) return { error: "Upload mislukt: " + uploadError.message };
  }

  const { error } = await supabase.from("manuals").insert({
    apparaat_naam: apparaatNaam,
    locatie: locatie || null,
    instructie_tekst: instructieTekst || null,
    video_link: videoLink || null,
    file_path: filePath,
    created_by: user.id,
  });

  if (error) return { error: "Toevoegen mislukt: " + error.message };

  revalidatePath("/handleidingen");
  return {};
}

export async function deleteManualAction(id: string) {
  const supabase = await createClient();
  await supabase.from("manuals").delete().eq("id", id);
  revalidatePath("/handleidingen");
}
