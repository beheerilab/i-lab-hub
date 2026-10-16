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
    const host = ref.current;
    if (!host) return;
    // Elke start krijgt een eigen element: zo blijven er geen dubbele luisteraars
    // achter als React (in ontwikkelmodus) het onderdeel twee keer start.
    const root = document.createElement("div");
    root.innerHTML = PLANNING_MARKUP;
    host.appendChild(root);
    const stop = mountPlanning(root, JSON.parse(JSON.stringify(initial)) as PlanningData);
    return () => {
      stop();
      root.remove();
    };
  }, [initial]);

  // Volle schermbreedte zonder transform, zodat position:fixed (toast) aan het scherm vast blijft.
  return <div ref={ref} className="-mt-6 sm:-mt-8" style={{ width: "100vw", marginLeft: "calc(50% - 50vw)" }} />;
}
