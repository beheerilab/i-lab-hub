"use client";

import { useState } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { SleutelDetailModal } from "./sleutel-detail-modal";

type Sleutel = Database["public"]["Tables"]["sleutels"]["Row"];

export function SleutelRow({ sleutel, magBeheren }: { sleutel: Sleutel; magBeheren: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 border-b border-border px-1 py-3 text-left last:border-none hover:bg-black/[.02]"
      >
        <span className="w-16 shrink-0 truncate rounded-full bg-accent-dark/10 px-2 py-0.5 text-center text-xs font-medium text-accent-dark">
          {sleutel.sleutelnummer || "—"}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{sleutel.naam}</span>
        {sleutel.functie && (
          <span className="shrink-0 truncate text-sm text-muted">{sleutel.functie}</span>
        )}
      </button>

      {open && (
        <SleutelDetailModal sleutel={sleutel} magBeheren={magBeheren} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
