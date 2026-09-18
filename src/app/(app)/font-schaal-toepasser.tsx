"use client";

import { useEffect } from "react";
import { useFontSchaal } from "@/lib/font-schaal";

/** Past de opgeslagen lettergrootte-voorkeur toe op de hele pagina. Rendert zelf niets. */
export function FontSchaalToepasser() {
  const { schaal } = useFontSchaal();

  useEffect(() => {
    document.documentElement.style.fontSize = `${schaal}%`;
  }, [schaal]);

  return null;
}
