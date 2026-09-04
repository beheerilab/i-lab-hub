"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { amsterdamNaarUtc } from "@/lib/tijd";

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

  if (!titel) return { error: "Vul een titel in." };
  if (!datum) return { error: "Kies een datum." };
  if (!toegewezenAan) return { error: "Kies aan wie de werkzaamheid is toegewezen." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Je bent niet ingelogd." };

  const { error } = await supabase.from("tasks").insert({
    titel,
    beschrijving: beschrijving || null,
    datum,
    toegewezen_aan: toegewezenAan,
    deadline_op: deadlineRaw ? amsterdamNaarUtc(deadlineRaw).toISOString() : null,
    created_by: user.id,
  });

  if (error) return { error: "Aanmaken mislukt: " + error.message };

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
