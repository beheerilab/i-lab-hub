"use client";

import { useState, useTransition } from "react";
import {
  toggleBinnenAction,
  setFactuurAangevraagdAction,
  setFactuurOpgeslagenAction,
  archiveOrderItemAction,
} from "./actions";

export function BestelStatusControl({
  id,
  leverancierNaam,
  besteldOp,
  factuurnaam,
  binnen,
  factuurAangevraagd,
  factuurOpgeslagen,
  magBeheren,
}: {
  id: string;
  leverancierNaam: string;
  besteldOp: string;
  factuurnaam: string;
  binnen: boolean;
  factuurAangevraagd: boolean;
  factuurOpgeslagen: boolean;
  magBeheren: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [gekopieerd, setGekopieerd] = useState(false);
  const alleDrieAfgevinkt = binnen && factuurAangevraagd && factuurOpgeslagen;

  function kopieerFactuurnaam() {
    navigator.clipboard.writeText(factuurnaam).then(() => {
      setGekopieerd(true);
      setTimeout(() => setGekopieerd(false), 1500);
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <p className="text-xs text-muted">
        {leverancierNaam} · besteld op {besteldOp}
      </p>
      {factuurnaam && (
        <button
          type="button"
          onClick={kopieerFactuurnaam}
          className="max-w-52 truncate text-xs text-accent underline"
          title="Klik om te kopiëren"
        >
          {gekopieerd ? "Gekopieerd ✓" : factuurnaam}
        </button>
      )}
      <div className="flex flex-wrap justify-end gap-2.5 text-xs">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={binnen}
            disabled={!magBeheren || isPending}
            onChange={(e) => startTransition(() => toggleBinnenAction(id, e.target.checked))}
            className="h-3.5 w-3.5 accent-accent disabled:opacity-40"
          />
          Binnen
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={factuurAangevraagd}
            disabled={!magBeheren || isPending}
            onChange={(e) =>
              startTransition(() => setFactuurAangevraagdAction(id, e.target.checked))
            }
            className="h-3.5 w-3.5 accent-accent disabled:opacity-40"
          />
          Factuur aangevraagd
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={factuurOpgeslagen}
            disabled={!magBeheren || isPending}
            onChange={(e) =>
              startTransition(() => setFactuurOpgeslagenAction(id, e.target.checked))
            }
            className="h-3.5 w-3.5 accent-accent disabled:opacity-40"
          />
          Factuur opgeslagen
        </label>
      </div>
      {magBeheren && (
        <button
          type="button"
          disabled={!alleDrieAfgevinkt || isPending}
          onClick={() => startTransition(() => archiveOrderItemAction(id))}
          className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-40"
          title={alleDrieAfgevinkt ? undefined : "Vink eerst alle drie de vakjes aan"}
        >
          Archiveren
        </button>
      )}
    </div>
  );
}
