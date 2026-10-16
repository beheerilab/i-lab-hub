import type { WerkData } from "@/lib/werkzaamheden";

/** Start de werkzaamheden in `root`; geeft een functie terug die alles weer opruimt. */
export function mountWerkzaamheden(root: HTMLElement, hub: WerkData): () => void;
