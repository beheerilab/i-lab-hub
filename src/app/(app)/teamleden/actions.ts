"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import type { Role } from "@/lib/supabase/database.types";

export async function setRoleAction(profileId: string, role: Role) {
  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", profileId);
  revalidatePath("/teamleden");
}

export async function revokeAccessAction(profileId: string) {
  const supabase = await createClient();
  await supabase.from("profiles").delete().eq("id", profileId);
  revalidatePath("/teamleden");
}

export type ResetWachtwoordState = { error?: string; succes?: boolean };

export async function resetPasswordAction(
  _prevState: ResetWachtwoordState,
  formData: FormData,
): Promise<ResetWachtwoordState> {
  await requireAdmin();

  const profileId = String(formData.get("profile_id") ?? "");
  const wachtwoord = String(formData.get("wachtwoord") ?? "");

  if (!profileId) return { error: "Ongeldig teamlid." };
  if (wachtwoord.length < 8) return { error: "Wachtwoord moet minstens 8 tekens zijn." };

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Wachtwoord-reset is nog niet geconfigureerd (ontbrekende service-sleutel)." };
  }

  const { error } = await admin.auth.admin.updateUserById(profileId, { password: wachtwoord });
  if (error) return { error: "Wijzigen mislukt: " + error.message };

  return { succes: true };
}
