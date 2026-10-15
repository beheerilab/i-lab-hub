"use client";

import { useEffect, useRef } from "react";
import type { PlanningData } from "@/lib/planning";
import { PLANNING_MARKUP } from "./planning-markup";
import { mountPlanning } from "./planning-engine";
import "./planning.css";

/**
 * De planning (V2.5) draait direct in de hub-pagina, niet in een iframe: de
 * hele pagina scrolt mee en pop-ups staan altijd goed in beeld.
 */
export function PlanningApp({ initial }: { initial: PlanningData }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.innerHTML = PLANNING_MARKUP;
    const stop = mountPlanning(root, JSON.parse(JSON.stringify(initial)) as PlanningData);
    return () => {
      stop();
      root.innerHTML = "";
    };
  }, [initial]);

  // Volle schermbreedte zonder transform, zodat position:fixed (toast) aan het scherm vast blijft.
  return <div ref={ref} className="-mt-6 sm:-mt-8" style={{ width: "100vw", marginLeft: "calc(50% - 50vw)" }} />;
}
