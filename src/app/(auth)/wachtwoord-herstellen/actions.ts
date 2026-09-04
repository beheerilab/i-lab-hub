"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string };

export async function herstelWachtwoordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const wachtwoord = String(formData.get("wachtwoord") ?? "");
  const bevestig = String(formData.get("wachtwoord_bevestig") ?? "");

  if (wachtwoord.length < 6) return { error: "Wachtwoord moet minstens 6 tekens zijn." };
  if (wachtwoord !== bevestig) return { error: "De wachtwoorden komen niet overeen." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: wachtwoord });

  if (error) {
    return {
      error:
        "Wijzigen mislukt: de link is mogelijk verlopen. Vraag een nieuwe aan via 'Wachtwoord vergeten'.",
    };
  }

  redirect("/dashboard");
}
