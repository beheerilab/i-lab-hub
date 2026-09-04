"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { amsterdamNaarUtc, formatAmsterdam } from "@/lib/tijd";

export type ActionState = { error?: string };

export async function createTaskAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const titel = String(formData.get("titel") ?? "").trim();
  const beschrijving = String(formData.get("beschrijving") ?? "").trim();
  const datum = String(formData.get("datum") ?? "");
  const toegewezenAan = String(formData.get("toegewezen_aan") ?? "");
  const deadlineRaw = String(formData.get("deadline_op") ?? "").trim();
  const gedeeldMet = formData.getAll("gedeeld_met").map(String).filter(Boolean);

  if (!titel) return { error: "Vul een titel in." };
  if (!datum) return { error: "Kies een datum." };
  if (!toegewezenAan) return { error: "Kies aan wie de werkzaamheid is toegewezen." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Je bent niet ingelogd." };

  const { data: nieuweTaak, error } = await supabase
    .from("tasks")
    .insert({
      titel,
      beschrijving: beschrijving || null,
      datum,
      toegewezen_aan: toegewezenAan,
      deadline_op: deadlineRaw ? amsterdamNaarUtc(deadlineRaw).toISOString() : null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: "Aanmaken mislukt: " + error.message };

  if (gedeeldMet.length > 0) {
    await supabase
      .from("task_shares")
      .insert(gedeeldMet.map((profileId) => ({ task_id: nieuweTaak.id, profile_id: profileId })));
  }

  revalidatePath("/werkzaamheden");
  return {};
}

export async function toggleTaskAction(taskId: string) {
  const supabase = await createClient();
  await supabase.rpc("toggle_task", { task_id: taskId });
  revalidatePath("/werkzaamheden");
}

export async function archiveTaskAction(taskId: string) {
  const supabase = await createClient();
  await supabase.from("tasks").update({ gearchiveerd: true }).eq("id", taskId);
  revalidatePath("/werkzaamheden");
}

export async function getTaakDetailsAction(taskId: string) {
  const supabase = await createClient();

  const [{ data: taak }, { data: bijlagen }, { data: shares }, { data: notities }] = await Promise.all([
    supabase.from("tasks").select("beschrijving, leverancier_id").eq("id", taskId).single(),
    supabase.from("task_bijlagen").select("id, file_path").eq("task_id", taskId),
    supabase.from("task_shares").select("profiles(full_name)").eq("task_id", taskId),
    supabase
      .from("task_notities")
      .select("id, tekst, created_at, profiles(full_name)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false }),
  ]);

  const bijlagenMetUrl = (bijlagen ?? []).map((b) => ({
    id: b.id,
    url: supabase.storage.from("werkzaamheden").getPublicUrl(b.file_path).data.publicUrl,
  }));

  const gedeeldMetNamen = (shares ?? []).map((s) => s.profiles?.full_name || "onbekend");

  const notitiesFormatted = (notities ?? []).map((n) => ({
    id: n.id,
    tekst: n.tekst,
    auteur: n.profiles?.full_name || "onbekend",
    wanneer: formatAmsterdam(n.created_at, "d MMM yyyy 'om' HH:mm"),
  }));

  return {
    beschrijving: taak?.beschrijving ?? null,
    leverancierId: taak?.leverancier_id ?? null,
    bijlagen: bijlagenMetUrl,
    gedeeldMetNamen,
    notities: notitiesFormatted,
  };
}

export async function updateBeschrijvingAction(taskId: string, beschrijving: string) {
  const supabase = await createClient();
  await supabase.from("tasks").update({ beschrijving: beschrijving || null }).eq("id", taskId);
  revalidatePath("/werkzaamheden");
}

export async function updateLeverancierAction(taskId: string, leverancierId: string) {
  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update({ leverancier_id: leverancierId || null })
    .eq("id", taskId);
  revalidatePath("/werkzaamheden");
}

export async function addNotitieAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const taskId = String(formData.get("task_id") ?? "");
  const tekst = String(formData.get("tekst") ?? "").trim();

  if (!taskId) return { error: "Ongeldige werkzaamheid." };
  if (!tekst) return { error: "Vul een notitie in." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Je bent niet ingelogd." };

  const { error } = await supabase
    .from("task_notities")
    .insert({ task_id: taskId, tekst, created_by: user.id });
  if (error) return { error: "Opslaan mislukt: " + error.message };

  return {};
}

export async function uploadBijlageAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const taskId = String(formData.get("task_id") ?? "");
  const file = formData.get("file");

  if (!taskId) return { error: "Ongeldige werkzaamheid." };
  if (!(file instanceof File) || file.size === 0) return { error: "Kies een bestand." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Je bent niet ingelogd." };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${taskId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("werkzaamheden")
    .upload(filePath, file);
  if (uploadError) return { error: "Upload mislukt: " + uploadError.message };

  const { error } = await supabase
    .from("task_bijlagen")
    .insert({ task_id: taskId, file_path: filePath, created_by: user.id });
  if (error) return { error: "Opslaan mislukt: " + error.message };

  revalidatePath("/werkzaamheden");
  return {};
}

export async function deleteBijlageAction(id: string) {
  const supabase = await createClient();
  await supabase.from("task_bijlagen").delete().eq("id", id);
  revalidatePath("/werkzaamheden");
}
