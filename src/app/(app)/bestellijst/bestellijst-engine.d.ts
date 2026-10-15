import type { BestellijstData } from "@/lib/bestellijst";

export type BestellijstHub = BestellijstData & {
  me: { naam: string; rol: "beheerder" | "collega" };
};

/** Start de bestellijst in `root`; geeft een functie terug die alles weer opruimt. */
export function mountBestellijst(root: HTMLElement, hub: BestellijstHub): () => void;
