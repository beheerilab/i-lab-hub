"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "ilab-planning-actieve-ruimtes";

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

export function useRoomFilter(alleRoomIds: string[]) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const alleRoomIdsKey = alleRoomIds.join(",");

  const actief = useMemo(() => {
    if (!raw) return new Set(alleRoomIds);
    try {
      const opgeslagen: string[] = JSON.parse(raw);
      const gefilterd = opgeslagen.filter((id) => alleRoomIds.includes(id));
      return gefilterd.length > 0 ? new Set(gefilterd) : new Set(alleRoomIds);
    } catch {
      return new Set(alleRoomIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, alleRoomIdsKey]);

  const toggle = useCallback(
    (id: string) => {
      const next = new Set(actief);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
        window.dispatchEvent(new Event("storage"));
      } catch {
        // localStorage niet beschikbaar — voorkeur wordt dan niet onthouden.
      }
    },
    [actief],
  );

  return { actief, toggle };
}
