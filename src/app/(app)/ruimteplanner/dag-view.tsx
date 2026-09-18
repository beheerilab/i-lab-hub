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
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted">
          Geen reserveringen op deze dag.
        </div>
      ) : (
        <div className="space-y-2">
          {gesorteerd.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setGeselecteerd(r)}
              className="flex w-full items-center gap-5 rounded-2xl border border-border bg-card px-5 py-3.5 text-left shadow-sm transition-colors hover:border-accent/40"
            >
              <span className="w-[70px] shrink-0 text-sm font-bold text-accent-hover">
                {r.startTijd.slice(0, 5)}–{r.eindTijd.slice(0, 5)}
              </span>
              <span className="h-8 w-px shrink-0 self-stretch bg-border" />
              <span className="w-32 shrink-0 truncate text-sm font-semibold text-muted">{r.labNaam}</span>
              <span className="min-w-0 flex-1 truncate text-base font-semibold">{r.gastnaam}</span>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent/10 px-3.5 py-1.5 text-sm font-bold text-accent-hover">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
                  <path
                    d="M16 14c2.2 0 4 1.8 4 4v2H4v-2c0-2.2 1.8-4 4-4h8Z"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  />
                  <circle cx="12" cy="7" r="3.2" stroke="currentColor" strokeWidth={1.8} />
                </svg>
                {r.aantalGasten}
              </span>
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
