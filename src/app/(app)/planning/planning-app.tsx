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

  return <div ref={ref} className="relative left-1/2 -mt-6 w-screen -translate-x-1/2 sm:-mt-8" />;
}
