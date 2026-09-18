"use client";

import { useState } from "react";
import { ReserveringModal } from "./reservering-modal";
import type { Reservering, RuimteplannerRoom } from "./types";

export function DagView({
  rooms,
  datum,
  reserveringen,
}: {
  rooms: RuimteplannerRoom[];
  datum: string;
  reserveringen: Reservering[];
}) {
  const [geselecteerd, setGeselecteerd] = useState<Reservering | null>(null);
  const gesorteerd = [...reserveringen].sort((a, b) => a.startTijd.localeCompare(b.startTijd));

  return (
    <>
      {gesorteerd.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-10 text-center text-muted">
          Geen reserveringen op deze dag.
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
          {gesorteerd.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setGeselecteerd(r)}
              className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-accent/5"
            >
              <span className="w-28 shrink-0 font-medium text-accent-hover">
                {r.startTijd.slice(0, 5)}–{r.eindTijd.slice(0, 5)}
              </span>
              <span className="w-44 shrink-0 truncate font-medium">{r.labNaam}</span>
              <span className="min-w-0 flex-1 truncate">{r.gastnaam}</span>
              <span className="shrink-0 text-sm text-muted">👤 {r.aantalGasten}</span>
            </button>
          ))}
        </div>
      )}

      {geselecteerd && (
        <ReserveringModal
          rooms={rooms}
          datum={datum}
          reservering={geselecteerd}
          onClose={() => setGeselecteerd(null)}
        />
      )}
    </>
  );
}
