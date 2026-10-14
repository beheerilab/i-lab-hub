"use client";

import { useState } from "react";
import { SnelleReserveringModal } from "./snelle-reservering-modal";
import type { Room } from "./types";

export function SnelleReserveringButton({ rooms, datum }: { rooms: Room[]; datum: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={rooms.length === 0}
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:border-accent hover:text-accent-hover disabled:opacity-50"
        title="Snel een gast/bezoeker inplannen"
      >
        + Snelle reservering
      </button>

      {open && <SnelleReserveringModal rooms={rooms} datum={datum} onClose={() => setOpen(false)} />}
    </>
  );
}
