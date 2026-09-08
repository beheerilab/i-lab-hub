"use client";

import { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { BookingModal } from "./booking-modal";
import { RoomFilter } from "./room-filter";
import { useRoomFilter } from "./use-room-filter";
import { ACTIVITEIT_KLEUREN, type Booking, type Room, type SelectedSlot } from "./types";

const WEEKDAGEN = ["Ma", "Di", "Wo", "Do", "Vr"];

export function WeekView({
  rooms,
  weekDays,
  bookings,
  subjects,
}: {
  rooms: Room[];
  weekDays: Date[];
  bookings: Booking[];
  subjects: { id: string; naam: string }[];
}) {
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const { actief, toggle } = useRoomFilter(rooms.map((r) => r.id));
  const zichtbareRooms = rooms.filter((r) => actief.has(r.id));

  function openNieuw(room: Room, datum: string) {
    setSelectedSlot({
      labId: room.id,
      labNaam: room.naam,
      datum,
      startTijd: "09:00",
      eindTijd: "10:00",
      booking: null,
    });
  }

  return (
    <>
      <div className="mb-2 flex items-start justify-between gap-3">
        <RoomFilter rooms={rooms} actief={actief} onToggle={toggle} />
        <button
          type="button"
          onClick={() => window.print()}
          className="shrink-0 rounded-lg border border-white/40 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/15 print:hidden"
        >
          🖨️ Printen
        </button>
      </div>
      <div className="print-area overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-40 border-b border-border p-2 text-left text-muted">Ruimte</th>
              {weekDays.map((day, i) => (
                <th key={day.toISOString()} className="border-b border-border p-2 text-left">
                  {WEEKDAGEN[i]} {format(day, "d MMM", { locale: nl })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zichtbareRooms.map((room) => (
              <tr key={room.id}>
                <td className="border-b border-border p-2 align-top font-medium">{room.naam}</td>
                {weekDays.map((day) => {
                  const datum = format(day, "yyyy-MM-dd");
                  const dagBoekingen = bookings
                    .filter((b) => b.lab_id === room.id && b.datum === datum)
                    .sort((a, b) => a.start_tijd.localeCompare(b.start_tijd));

                  return (
                    <td
                      key={datum}
                      onClick={() => openNieuw(room, datum)}
                      className="cursor-pointer border-b border-border p-1.5 align-top transition-colors hover:bg-accent/5"
                    >
                      <div className="space-y-1">
                        {dagBoekingen.map((booking) => (
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
                            className={`w-full rounded-md border px-1.5 py-1 text-left text-xs leading-tight hover:opacity-80 ${ACTIVITEIT_KLEUREN[booking.type_activiteit]}`}
                          >
                            <div className="truncate font-medium">
                              {booking.start_tijd.slice(0, 5)} {booking.vak}
                            </div>
                            <div className="truncate">{booking.school}</div>
                          </button>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSlot && (
        <BookingModal
          slot={selectedSlot}
          subjects={subjects}
          rooms={rooms}
          onClose={() => setSelectedSlot(null)}
          onDuplicate={setSelectedSlot}
        />
      )}
    </>
  );
}
