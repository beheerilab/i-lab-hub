"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function claimAdminAction() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_admin");

  if (error) {
    return { error: "Kon geen beheerder worden: " + error.message };
  }

  revalidatePath("/dashboard");
  return {};
}
