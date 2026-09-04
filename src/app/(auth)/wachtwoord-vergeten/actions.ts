"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; success?: boolean };

export async function requestPasswordResetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Vul je e-mailadres in." };

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/wachtwoord-herstellen`,
  });

  // Altijd hetzelfde succesbericht, ook als het e-mailadres niet bestaat —
  // zo kan niemand via deze pagina uitvinden welke e-mailadressen bekend zijn.
  return { success: true };
}
