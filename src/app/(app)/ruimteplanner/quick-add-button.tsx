"use client";

import { useState } from "react";
import { ReserveringModal } from "./reservering-modal";
import type { RuimteplannerRoom } from "./types";

export function QuickAddReserveringButton({
  rooms,
  datum,
}: {
  rooms: RuimteplannerRoom[];
  datum: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={rooms.length === 0}
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        + Reservering
      </button>
      {open && <ReserveringModal rooms={rooms} datum={datum} reservering={null} onClose={() => setOpen(false)} />}
    </>
  );
}
