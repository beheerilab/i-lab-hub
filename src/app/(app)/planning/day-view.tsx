"use client";

import { useRef, useState } from "react";
import { BookingModal } from "./booking-modal";
import {
  ACTIVITEIT_KLEUREN,
  DAG_EIND_UUR,
  DAG_START_UUR,
  type Booking,
  type Room,
  type SelectedSlot,
} from "./types";

const TOTAAL_MINUTEN = (DAG_EIND_UUR - DAG_START_UUR) * 60;
const UREN = Array.from({ length: DAG_EIND_UUR - DAG_START_UUR + 1 }, (_, i) => DAG_START_UUR + i);

function tijdNaarMinuten(tijd: string) {
  const [u, m] = tijd.split(":").map(Number);
  return u * 60 + m;
}

function minutenNaarTijd(minuten: number) {
  const u = Math.floor(minuten / 60);
  const m = minuten % 60;
  return `${String(u).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function rondAf(minuten: number, stap = 15) {
  return Math.round(minuten / stap) * stap;
}

export function DayView({ rooms, datum, bookings }: { rooms: Room[]; datum: string; bookings: Booking[] }) {
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const trackRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function handleTrackClick(room: Room, e: React.MouseEvent<HTMLDivElement>) {
    const track = trackRefs.current[room.id];
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const fractie = (e.clientX - rect.left) / rect.width;
    const startMin = rondAf(DAG_START_UUR * 60 + fractie * TOTAAL_MINUTEN);
    const eindMin = Math.min(startMin + 60, DAG_EIND_UUR * 60);
    setSelectedSlot({
      labId: room.id,
      labNaam: room.naam,
      datum,
      startTijd: minutenNaarTijd(startMin),
      eindTijd: minutenNaarTijd(eindMin),
      booking: null,
    });
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <div className="min-w-[720px]">
          <div className="flex border-b border-border">
            <div className="w-40 shrink-0 p-2 text-sm font-medium text-muted">Ruimte</div>
            <div className="relative flex flex-1">
              {UREN.map((uur) => (
                <div
                  key={uur}
                  className="flex-1 border-l border-border p-2 text-xs text-muted first:border-l-0"
                >
                  {uur}:00
                </div>
              ))}
            </div>
          </div>

          {rooms.map((room) => {
            const roomBookings = bookings.filter((b) => b.lab_id === room.id);
            return (
              <div key={room.id} className="flex border-b border-border last:border-none">
                <div className="w-40 shrink-0 truncate p-2 text-sm font-medium">{room.naam}</div>
                <div
                  ref={(el) => {
                    trackRefs.current[room.id] = el;
                  }}
                  onClick={(e) => handleTrackClick(room, e)}
                  className="relative h-14 flex-1 cursor-pointer"
                >
                  {UREN.slice(1, -1).map((uur, i) => (
                    <div
                      key={uur}
                      className="pointer-events-none absolute inset-y-0 border-l border-border"
                      style={{ left: `${((i + 1) / (UREN.length - 1)) * 100}%` }}
                    />
                  ))}
                  {roomBookings.map((booking) => {
                    const startMin = Math.max(
                      tijdNaarMinuten(booking.start_tijd.slice(0, 5)),
                      DAG_START_UUR * 60,
                    );
                    const eindMin = Math.min(
                      tijdNaarMinuten(booking.eind_tijd.slice(0, 5)),
                      DAG_EIND_UUR * 60,
                    );
                    const left = ((startMin - DAG_START_UUR * 60) / TOTAAL_MINUTEN) * 100;
                    const width = ((eindMin - startMin) / TOTAAL_MINUTEN) * 100;

                    return (
                      <button
                        key={booking.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSlot({
                            labId: room.id,
                            labNaam: room.naam,
                            datum,
                            startTijd: booking.start_tijd.slice(0, 5),
                            eindTijd: booking.eind_tijd.slice(0, 5),
                            booking,
                          });
                        }}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        className={`absolute inset-y-1 overflow-hidden rounded-md border px-2 py-1 text-left text-xs leading-tight hover:opacity-80 ${ACTIVITEIT_KLEUREN[booking.type_activiteit]}`}
                      >
                        <div className="truncate font-medium">
                          {booking.start_tijd.slice(0, 5)}–{booking.eind_tijd.slice(0, 5)} {booking.vak}
                        </div>
                        <div className="truncate">{booking.school}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedSlot && <BookingModal slot={selectedSlot} onClose={() => setSelectedSlot(null)} />}
    </>
  );
}
