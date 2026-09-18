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
        className="shrink-0 rounded-lg border border-white/40 px-3 py-2 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50"
        title="Snel een gast/bezoeker inplannen"
      >
        + Snelle reservering
      </button>

      {open && <SnelleReserveringModal rooms={rooms} datum={datum} onClose={() => setOpen(false)} />}
    </>
  );
}
