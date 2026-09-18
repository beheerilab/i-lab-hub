import Link from "next/link";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { Reservering, RuimteplannerRoom } from "./types";

const WEEKDAGEN = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

export function WeekView({
  rooms,
  weekDays,
  reserveringen,
}: {
  rooms: RuimteplannerRoom[];
  weekDays: Date[];
  reserveringen: Reservering[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-40 border-b border-border p-2 text-left text-muted">Ruimte</th>
            {weekDays.map((day, i) => (
              <th key={day.toISOString()} className="border-b border-l border-border p-2 text-left">
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
                const aantal = reserveringen.filter((r) => r.labId === room.id && r.datum === datum).length;
                return (
                  <td key={datum} className="border-b border-l border-border p-1.5 text-center align-middle">
                    <Link
                      href={`/ruimteplanner?modus=dag&datum=${datum}`}
                      className={`inline-flex min-w-8 items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                        aantal > 0
                          ? "bg-accent/10 text-accent-hover hover:bg-accent/20"
                          : "text-muted hover:bg-black/[.03]"
                      }`}
                    >
                      {aantal > 0 && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                      {aantal > 0 ? aantal : "—"}
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
