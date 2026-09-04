"use client";

import { useState, useTransition } from "react";
import { markItemOrderedAction } from "./actions";
import { Select } from "@/components/ui/field";

export function MarkOrderedControl({
  itemId,
  contacts,
}: {
  itemId: string;
  contacts: { id: string; naam: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [leverancierId, setLeverancierId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-black/[.04]"
      >
        Markeer als besteld
      </button>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <Select
          value={leverancierId}
          onChange={(e) => setLeverancierId(e.target.value)}
          className="max-w-40 py-1.5 text-sm"
        >
          <option value="">Kies leverancier</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.naam}
            </option>
          ))}
        </Select>
        <button
          type="button"
          disabled={isPending || !leverancierId}
          onClick={() =>
            startTransition(async () => {
              const result = await markItemOrderedAction(itemId, leverancierId);
              if (result.error) setError(result.error);
              else setOpen(false);
            })
          }
          className="rounded-lg bg-accent px-2.5 py-1.5 text-sm text-white hover:bg-accent-hover disabled:opacity-50"
        >
          Bevestig
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-black/[.04]"
        >
          Annuleer
        </button>
      </div>
      {contacts.length === 0 && (
        <p className="text-xs text-danger">Voeg eerst een leverancier toe bij Contacten.</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
