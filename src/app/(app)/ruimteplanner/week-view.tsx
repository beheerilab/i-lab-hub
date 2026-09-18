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
    <div
      className="grid gap-2 overflow-x-auto"
      style={{ gridTemplateColumns: `160px repeat(${weekDays.length}, minmax(64px, 1fr))` }}
    >
      <div />
      {weekDays.map((day, i) => (
        <div key={day.toISOString()} className="pb-1 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-white/70">{WEEKDAGEN[i]}</div>
          <div className="text-sm font-bold text-white">{format(day, "d MMM", { locale: nl })}</div>
        </div>
      ))}

      {rooms.map((room) => (
        <div key={room.id} className="contents">
          <div className="flex items-center truncate rounded-l-lg border border-r-0 border-border bg-card px-3 py-2.5 text-sm font-semibold">
            {room.naam}
          </div>
          {weekDays.map((day, i) => {
            const datum = format(day, "yyyy-MM-dd");
            const aantal = reserveringen.filter((r) => r.labId === room.id && r.datum === datum).length;
            const isLast = i === weekDays.length - 1;
            return (
              <Link
                key={datum}
                href={`/ruimteplanner?modus=dag&datum=${datum}`}
                className={`flex min-h-11 items-center justify-center border border-border bg-card transition-colors hover:border-accent/40 ${
                  isLast ? "rounded-r-lg" : "border-r-0"
                }`}
              >
                {aantal > 0 ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-accent-hover">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {aantal}
                  </span>
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-border" />
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
