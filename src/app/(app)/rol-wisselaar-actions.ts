"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { PREVIEW_ROL_COOKIE, PREVIEWBARE_ROLLEN } from "@/lib/preview-rol";
import type { Role } from "@/lib/supabase/database.types";

/** Leeg ("") zet de preview weer uit — terug naar de echte rol van de beheerder. */
export async function setPreviewRolAction(rol: Role | "") {
  const { echteRol } = await requireProfile();
  if (echteRol !== "admin") return;

  const cookieStore = await cookies();
  if (!rol || !PREVIEWBARE_ROLLEN.includes(rol)) {
    cookieStore.delete(PREVIEW_ROL_COOKIE);
  } else {
    cookieStore.set(PREVIEW_ROL_COOKIE, rol, { path: "/", maxAge: 60 * 60 * 24 });
  }

  revalidatePath("/", "layout");
}
