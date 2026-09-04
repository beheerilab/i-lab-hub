import type { ActiviteitType } from "@/lib/supabase/database.types";

export type Room = { id: string; naam: string; volgorde: number; actief: boolean };

export type Booking = {
  id: string;
  lab_id: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  vak: string;
  school: string;
  docent: string;
  type_activiteit: ActiviteitType;
  aantal_leerlingen: number;
  bijzonderheden: string | null;
};

export type SelectedSlot = {
  labId: string;
  labNaam: string;
  datum: string;
  startTijd: string;
  eindTijd: string;
  booking: Booking | null;
};

export const ACTIVITEIT_LABELS: Record<ActiviteitType, string> = {
  les: "Les",
  project: "Project",
  vrij_gebruik: "Vrij gebruik",
  extern_bezoek: "Extern bezoek",
};

export const ACTIVITEIT_KLEUREN: Record<ActiviteitType, string> = {
  les: "bg-accent/15 text-accent-dark border-accent/30",
  project: "bg-amber-100 text-amber-800 border-amber-200",
  vrij_gebruik: "bg-black/[.04] text-muted border-border",
  extern_bezoek: "bg-purple-100 text-purple-800 border-purple-200",
};

export const DAG_START_UUR = 8;
export const DAG_EIND_UUR = 18;
