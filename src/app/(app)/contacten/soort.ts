import type { ContactSoort } from "@/lib/supabase/database.types";

export const SOORT_OPTIES: ContactSoort[] = ["gemeente", "school", "bedrijfsleven", "leverancier", "uitvoerder"];

export const SOORT_LABELS: Record<ContactSoort, string> = {
  gemeente: "Gemeente",
  school: "School",
  bedrijfsleven: "Bedrijfsleven",
  leverancier: "Leverancier",
  uitvoerder: "Uitvoerder",
};
