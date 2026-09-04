"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
