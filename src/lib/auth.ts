import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Haalt de ingelogde gebruiker + profiel op. Stuurt naar /login als er geen
 * sessie is (de middleware doet dit al, dit is de laatste terugval).
 */
export async function requireProfile(): Promise<{
  userId: string;
  email: string | null;
  profile: Profile;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  return { userId: user.id, email: user.email ?? null, profile };
}

export async function requireAdmin() {
  const result = await requireProfile();
  if (result.profile.role !== "admin") {
    redirect("/dashboard");
  }
  return result;
}
