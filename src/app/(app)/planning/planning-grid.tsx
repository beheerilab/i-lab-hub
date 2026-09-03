"use client";

import { useState } from "react";
import { BookingModal, type SelectedCell } from "./booking-modal";
import type { ActiviteitType } from "@/lib/supabase/database.types";

export type Booking = {
  id: string;
  lab_id: string;
  start_uur: number;
  vak: string;
  klas_groep: string;
  type_activiteit: ActiviteitType;
  aantal_leerlingen: number;
};

const ACTIVITEIT_LABELS: Record<ActiviteitType, string> = {
  les: "Les",
  project: "Project",
  vrij_gebruik: "Vrij gebruik",
  extern_bezoek: "Extern bezoek",
};

const ACTIVITEIT_KLEUREN: Record<ActiviteitType, string> = {
  les: "bg-accent/10 text-accent-hover border-accent/20",
  project: "bg-amber-100 text-amber-800 border-amber-200",
  vrij_gebruik: "bg-black/[.04] text-muted border-border",
  extern_bezoek: "bg-purple-100 text-purple-800 border-purple-200",
};

const UREN = [9, 10, 11, 12, 13, 14];

export function PlanningGrid({
  labs,
  datum,
  bookings,
}: {
  labs: { id: string; naam: string }[];
  datum: string;
  bookings: Booking[];
}) {
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  const bookingFor = (labId: string, uur: number) =>
    bookings.find((b) => b.lab_id === labId && b.start_uur === uur);

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-24 border-b border-border p-2 text-left text-muted">Tijd</th>
              {labs.map((lab) => (
                <th key={lab.id} className="border-b border-border p-2 text-left">
                  {lab.naam}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {UREN.map((uur) => (
              <tr key={uur}>
                <td className="border-b border-border p-2 align-top text-muted">
                  {uur}:00–{uur + 1}:00
                </td>
                {labs.map((lab) => {
                  const booking = bookingFor(lab.id, uur);
                  return (
                    <td key={lab.id} className="border-b border-border p-1.5 align-top">
                      {booking ? (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCell({
                              labId: lab.id,
                              labNaam: lab.naam,
                              uur,
                              booking,
                            })
                          }
                          className={`w-full rounded-lg border p-2 text-left transition-colors hover:opacity-80 ${ACTIVITEIT_KLEUREN[booking.type_activiteit]}`}
                        >
                          <div className="font-medium">{booking.vak}</div>
                          <div className="text-xs">
                            {booking.klas_groep} · {ACTIVITEIT_LABELS[booking.type_activiteit]}
                          </div>
                          <div className="text-xs">{booking.aantal_leerlingen} leerlingen</div>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCell({ labId: lab.id, labNaam: lab.naam, uur, booking: null })
                          }
                          className="flex h-full min-h-16 w-full items-center justify-center rounded-lg border border-dashed border-border text-muted transition-colors hover:border-accent hover:text-accent"
                        >
                          + Boeken
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCell && (
        <BookingModal
          cell={selectedCell}
          datum={datum}
          onClose={() => setSelectedCell(null)}
        />
      )}
    </>
  );
}
