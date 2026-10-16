"use client";

import { useEffect, useRef } from "react";
import type { WerkData } from "@/lib/werkzaamheden";
import { WERKZAAMHEDEN_MARKUP } from "./werkzaamheden-markup";
import { mountWerkzaamheden } from "./werkzaamheden-engine";
import "./werkzaamheden.css";

/**
 * De werkzaamheden (V2) draaien direct in de hub-pagina, niet in een iframe:
 * alleen de pagina zelf scrolt en pop-ups staan altijd goed in beeld.
 */
export function WerkzaamhedenApp({ initial }: { initial: WerkData }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.innerHTML = WERKZAAMHEDEN_MARKUP;
    const stop = mountWerkzaamheden(root, JSON.parse(JSON.stringify(initial)) as WerkData);
    return () => {
      stop();
      root.innerHTML = "";
    };
  }, [initial]);

  // Volle schermbreedte zonder transform, zodat position:fixed (pop-ups, toast) aan het scherm vast blijft.
  return <div ref={ref} className="-mt-6 sm:-mt-8" style={{ width: "100vw", marginLeft: "calc(50% - 50vw)" }} />;
}
