"use client";

import { useState, useTransition } from "react";
import {
  toggleBinnenAction,
  setFactuurAangevraagdAction,
  setFactuurOpgeslagenAction,
  deleteOrderItemAction,
} from "./actions";

export function HistorieRow({
  id,
  itemNaam,
  aantal,
  leverancierNaam,
  besteldOp,
  factuurnaam,
  binnen,
  factuurAangevraagd,
  factuurOpgeslagen,
  magBeheren,
}: {
  id: string;
  itemNaam: string;
  aantal: number;
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

  function kopieerFactuurnaam() {
    navigator.clipboard.writeText(factuurnaam).then(() => {
      setGekopieerd(true);
      setTimeout(() => setGekopieerd(false), 1500);
    });
  }

  return (
    <li className="flex flex-col gap-2 border-b border-border py-3 last:border-none sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="font-medium">
          {itemNaam} <span className="text-muted">× {aantal}</span>
        </div>
        <p className="text-sm text-muted">
          {leverancierNaam} · besteld op {besteldOp}
        </p>
        <button
          type="button"
          onClick={kopieerFactuurnaam}
          className="mt-0.5 truncate text-left text-sm text-accent underline"
          title="Klik om te kopiëren"
        >
          {gekopieerd ? "Gekopieerd ✓" : factuurnaam}
        </button>
      </div>
      <div className="flex shrink-0 flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={binnen}
            disabled={!magBeheren || isPending}
            onChange={(e) => startTransition(() => toggleBinnenAction(id, e.target.checked))}
            className="h-4 w-4 accent-accent disabled:opacity-40"
          />
          Binnen
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={factuurAangevraagd}
            disabled={!magBeheren || isPending}
            onChange={(e) =>
              startTransition(() => setFactuurAangevraagdAction(id, e.target.checked))
            }
            className="h-4 w-4 accent-accent disabled:opacity-40"
          />
          Factuur aangevraagd
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={factuurOpgeslagen}
            disabled={!magBeheren || isPending}
            onChange={(e) =>
              startTransition(() => setFactuurOpgeslagenAction(id, e.target.checked))
            }
            className="h-4 w-4 accent-accent disabled:opacity-40"
          />
          Factuur opgeslagen
        </label>
        {magBeheren && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm(`"${itemNaam}" verwijderen uit de historie?`)) {
                startTransition(() => deleteOrderItemAction(id));
              }
            }}
            className="text-danger hover:underline disabled:opacity-50"
          >
            Verwijderen
          </button>
        )}
      </div>
    </li>
  );
}
