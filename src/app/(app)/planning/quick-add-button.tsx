"use client";

import { useState } from "react";
import { BookingModal } from "./booking-modal";
import type { Room, SelectedSlot } from "./types";

export function QuickAddButton({
  rooms,
  subjects,
  datum,
  vergrendelDocentNaam,
}: {
  rooms: Room[];
  subjects: { id: string; naam: string }[];
  datum: string;
  vergrendelDocentNaam?: string;
}) {
  const [slot, setSlot] = useState<SelectedSlot | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={rooms.length === 0}
        onClick={() =>
          setSlot({
            labId: rooms[0].id,
            labNaam: rooms[0].naam,
            datum,
            startTijd: "09:00",
            eindTijd: "10:00",
            booking: null,
            vrijeKeuze: true,
          })
        }
        className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        title="Nieuwe boeking inplannen"
      >
        + Nieuwe boeking
      </button>

      {slot && (
        <BookingModal
          slot={slot}
          subjects={subjects}
          rooms={rooms}
          onClose={() => setSlot(null)}
          onDuplicate={setSlot}
          vergrendelDocentNaam={vergrendelDocentNaam}
        />
      )}
    </>
  );
}
