"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "ilab-lettergrootte";
const STANDAARD = 100;

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): number {
  const raw = localStorage.getItem(STORAGE_KEY);
  const n = raw ? Number(raw) : STANDAARD;
  return Number.isFinite(n) && n > 0 ? n : STANDAARD;
}

function getServerSnapshot(): number {
  return STANDAARD;
}

/** Persoonlijke lettergrootte-voorkeur (percentage), per apparaat onthouden via localStorage. */
export function useFontSchaal() {
  const schaal = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const zetSchaal = useCallback((nieuw: number) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(nieuw));
      window.dispatchEvent(new Event("storage"));
    } catch {
      // localStorage niet beschikbaar — voorkeur wordt dan niet onthouden.
    }
  }, []);

  return { schaal, zetSchaal };
}
