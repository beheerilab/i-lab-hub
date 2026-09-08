"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// Naam bewust anders dan de oude sleutel: de betekenis van de opgeslagen set
// is omgedraaid (nu "geïsoleerde ruimtes" i.p.v. "zichtbare ruimtes"), dus
// een oude waarde uit localStorage zou anders verkeerd geïnterpreteerd worden.
const STORAGE_KEY = "ilab-planning-geisoleerde-ruimtes";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

function getServerSnapshot(): string {
  return "";
}

/**
 * Leeg (niets geïsoleerd) betekent: toon alle ruimtes. Klikken op een ruimte
 * isoleert die (en eventueel meerdere) — precies andersom dan "verbergen".
 */
export function useRoomFilter(alleRoomIds: string[]) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const alleRoomIdsKey = alleRoomIds.join(",");

  const actief = useMemo(() => {
    if (!raw) return new Set<string>();
    try {
      const opgeslagen: string[] = JSON.parse(raw);
      return new Set(opgeslagen.filter((id) => alleRoomIds.includes(id)));
    } catch {
      return new Set<string>();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, alleRoomIdsKey]);

  const schrijf = useCallback((ids: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
      window.dispatchEvent(new Event("storage"));
    } catch {
      // localStorage niet beschikbaar — voorkeur wordt dan niet onthouden.
    }
  }, []);

  const toggle = useCallback(
    (id: string) => {
      const next = new Set(actief);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      schrijf(next);
    },
    [actief, schrijf],
  );

  const reset = useCallback(() => schrijf(new Set()), [schrijf]);

  return { actief, toggle, reset };
}
