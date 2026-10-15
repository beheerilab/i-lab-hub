import type { PlanningData } from "@/lib/planning";

/** Start de planning in `root`; geeft een functie terug die alles weer opruimt. */
export function mountPlanning(root: HTMLElement, hub: PlanningData): () => void;
