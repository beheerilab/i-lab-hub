"use client";

import { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { BookingModal } from "./booking-modal";
import { ACTIVITEIT_KLEUREN, type Booking, type Room, type SelectedSlot } from "./types";

const WEEKDAGEN = ["Ma", "Di", "Wo", "Do", "Vr"];

export function WeekView({
  rooms,
  weekDays,
  bookings,
}: {
  rooms: Room[];
  weekDays: Date[];
  bookings: Booking[];
}) {
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
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
            {rooms.map((room) => (
              <tr key={room.id}>
                <td className="border-b border-border p-2 align-top font-medium">{room.naam}</td>
                {weekDays.map((day) => {
                  const datum = format(day, "yyyy-MM-dd");
                  const dagBoekingen = bookings
                    .filter((b) => b.lab_id === room.id && b.datum === datum)
                    .sort((a, b) => a.start_tijd.localeCompare(b.start_tijd));

                  return (
                    <td key={datum} className="border-b border-border p-1.5 align-top">
                      <div className="space-y-1">
                        {dagBoekingen.map((booking) => (
                          <button
                            key={booking.id}
                            type="button"
                            onClick={() =>
                              setSelectedSlot({
                                labId: room.id,
                                labNaam: room.naam,
                                datum,
                                startTijd: booking.start_tijd.slice(0, 5),
                                eindTijd: booking.eind_tijd.slice(0, 5),
                                booking,
                              })
                            }
                            className={`w-full rounded-md border px-1.5 py-1 text-left text-xs leading-tight hover:opacity-80 ${ACTIVITEIT_KLEUREN[booking.type_activiteit]}`}
                          >
                            <div className="truncate font-medium">
                              {booking.start_tijd.slice(0, 5)} {booking.vak}
                            </div>
                            <div className="truncate">{booking.school}</div>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedSlot({
                              labId: room.id,
                              labNaam: room.naam,
                              datum,
                              startTijd: "09:00",
                              eindTijd: "10:00",
                              booking: null,
                            })
                          }
                          className="w-full rounded-md border border-dashed border-border py-1 text-xs text-muted hover:border-accent hover:text-accent"
                        >
                          + Boeken
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSlot && <BookingModal slot={selectedSlot} onClose={() => setSelectedSlot(null)} />}
    </>
  );
}
