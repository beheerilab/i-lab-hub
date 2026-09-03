"use client";

import { useTransition } from "react";
import { deleteOrderItemAction } from "./actions";

export function OrderItemRow({
  id,
  itemNaam,
  aantal,
  notitie,
  link,
  toegevoegdDoorNaam,
  datum,
  magVerwijderen,
}: {
  id: string;
  itemNaam: string;
  aantal: number;
  notitie: string | null;
  link: string | null;
  toegevoegdDoorNaam: string;
  datum: string;
  magVerwijderen: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-start justify-between gap-4 border-b border-border px-1 py-3 last:border-none">
      <div className="min-w-0">
        <div className="font-medium">
          {itemNaam} <span className="text-muted">× {aantal}</span>
        </div>
        {notitie && <p className="mt-0.5 text-sm text-muted">{notitie}</p>}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block truncate text-sm text-accent underline"
          >
            {link}
          </a>
        )}
        <p className="mt-1 text-xs text-muted">
          Toegevoegd door {toegevoegdDoorNaam} op {datum}
        </p>
      </div>
      {magVerwijderen && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => deleteOrderItemAction(id))}
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm text-danger hover:bg-danger/10 disabled:opacity-50"
        >
          Verwijderen
        </button>
      )}
    </li>
  );
}
