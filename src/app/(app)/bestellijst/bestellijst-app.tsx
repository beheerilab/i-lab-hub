"use client";

import { useEffect, useRef } from "react";
import { BESTELLIJST_MARKUP } from "./bestellijst-markup";
import { mountBestellijst, type BestellijstHub } from "./bestellijst-engine";
import "./bestellijst.css";

/**
 * De bestellijst (V2) draait direct in de hub-pagina, niet in een iframe:
 * alleen de pagina zelf scrolt en pop-ups staan altijd goed in beeld.
 */
export function BestellijstApp({ initial }: { initial: BestellijstHub }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    // Elke start krijgt een eigen element: zo blijven er geen dubbele luisteraars
    // achter als React (in ontwikkelmodus) het onderdeel twee keer start.
    const root = document.createElement("div");
    root.innerHTML = BESTELLIJST_MARKUP;
    host.appendChild(root);
    const stop = mountBestellijst(root, JSON.parse(JSON.stringify(initial)) as BestellijstHub);
    return () => {
      stop();
      root.remove();
    };
  }, [initial]);

  // Volle schermbreedte zonder transform: position:fixed (pop-ups, balk onderaan) blijft zo aan het scherm vast.
  return <div ref={ref} className="-mt-6 sm:-mt-8" style={{ width: "100vw", marginLeft: "calc(50% - 50vw)" }} />;
}
