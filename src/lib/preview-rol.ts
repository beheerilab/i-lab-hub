import type { Role } from "./supabase/database.types";

/** Alleen een echte beheerder mag deze cookie zetten (zie requireProfile/setPreviewRolAction). */
export const PREVIEW_ROL_COOKIE = "ilab-preview-rol";

/** Beheerder zelf "previewen" heeft geen zin — dat is toch al wat ze zijn. */
export const PREVIEWBARE_ROLLEN: Role[] = ["lid", "docent"];
