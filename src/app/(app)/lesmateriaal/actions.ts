"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string };

export async function createSubjectAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const naam = String(formData.get("naam") ?? "").trim();
  if (!naam) return { error: "Vul een naam voor het vak in." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Je bent niet ingelogd." };

  const { error } = await supabase.from("subjects").insert({ naam, created_by: user.id });
  if (error) return { error: error.message.includes("duplicate") ? "Dit vak bestaat al." : error.message };

  revalidatePath("/lesmateriaal");
  return {};
}

export async function createTopicAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const naam = String(formData.get("naam") ?? "").trim();
  const subjectId = String(formData.get("subject_id") ?? "");
  if (!naam) return { error: "Vul een naam voor het onderwerp in." };
  if (!subjectId) return { error: "Kies een vak." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Je bent niet ingelogd." };

  const { error } = await supabase
    .from("topics")
    .insert({ naam, subject_id: subjectId, created_by: user.id });
  if (error) return { error: error.message.includes("duplicate") ? "Dit onderwerp bestaat al bij dit vak." : error.message };

  revalidatePath("/lesmateriaal");
  return {};
}

export async function createMaterialAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const titel = String(formData.get("titel") ?? "").trim();
  const beschrijving = String(formData.get("beschrijving") ?? "").trim();
  const subjectId = String(formData.get("subject_id") ?? "");
  const topicId = String(formData.get("topic_id") ?? "");
  const link = String(formData.get("link") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "");
  const file = formData.get("file");

  if (!titel) return { error: "Vul een titel in." };
  if (!subjectId || !topicId) return { error: "Kies een vak en onderwerp." };

  const hasFile = file instanceof File && file.size > 0;
  if (!link && !hasFile) {
    return { error: "Voeg een link toe of upload een bestand." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Je bent niet ingelogd." };

  let filePath: string | null = null;
  if (hasFile) {
    const uploadFile = file as File;
    const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    filePath = `${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("materials")
      .upload(filePath, uploadFile);
    if (uploadError) return { error: "Upload mislukt: " + uploadError.message };
  }

  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const { error } = await supabase.from("materials").insert({
    titel,
    beschrijving: beschrijving || null,
    subject_id: subjectId,
    topic_id: topicId,
    link: link || null,
    file_path: filePath,
    tags,
    created_by: user.id,
  });

  if (error) return { error: "Toevoegen mislukt: " + error.message };

  revalidatePath("/lesmateriaal");
  return {};
}

export async function deleteMaterialAction(id: string) {
  const supabase = await createClient();
  await supabase.from("materials").delete().eq("id", id);
  revalidatePath("/lesmateriaal");
}
