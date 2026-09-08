import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Database, Role } from "@/lib/supabase/database.types";
import { PREVIEW_ROL_COOKIE, PREVIEWBARE_ROLLEN } from "@/lib/preview-rol";

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
 *
 * Een echte beheerder kan via een cookie een andere rol "previewen" (zie
 * rol-wisselaar-actions.ts) — `profile.role` reflecteert dan die rol, zodat
 * de hele app (alle pagina's/queries branchen toch al op `profile.role`)
 * automatisch precies laat zien wat die rol te zien krijgt. `echteRol` blijft
 * de echte databaserol, voor de banner/terugknop. Dit raakt nooit RLS: de
 * database blijft de echte rol van de beheerder zien.
 */
export async function requireProfile(): Promise<{
  userId: string;
  email: string | null;
  profile: Profile;
  echteRol: Role;
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

  const echteRol = profile.role;
  const cookieStore = await cookies();
  const previewRol = cookieStore.get(PREVIEW_ROL_COOKIE)?.value as Role | undefined;
  const previewActief = echteRol === "admin" && !!previewRol && PREVIEWBARE_ROLLEN.includes(previewRol);

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: previewActief ? { ...profile, role: previewRol! } : profile,
    echteRol,
  };
}

export async function requireAdmin() {
  const result = await requireProfile();
  if (result.profile.role !== "admin") {
    redirect("/dashboard");
  }
  return result;
}
