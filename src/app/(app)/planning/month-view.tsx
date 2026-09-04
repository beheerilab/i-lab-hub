import Link from "next/link";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { nl } from "date-fns/locale";

const WEEKDAGEN = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

export function MonthView({
  maand,
  boekingenPerDag,
}: {
  maand: Date;
  boekingenPerDag: Map<string, number>;
}) {
  const start = startOfWeek(startOfMonth(maand), { weekStartsOn: 1 });
  const eind = endOfWeek(endOfMonth(maand), { weekStartsOn: 1 });
  const dagen = eachDayOfInterval({ start, end: eind });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAGEN.map((dag) => (
          <div key={dag} className="p-2 text-center text-sm font-medium text-muted">
            {dag}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dagen.map((dag) => {
          const key = format(dag, "yyyy-MM-dd");
          const aantal = boekingenPerDag.get(key) ?? 0;
          const inMaand = isSameMonth(dag, maand);

          return (
            <Link
              key={key}
              href={`/planning?modus=dag&datum=${key}`}
              className={`flex min-h-24 flex-col gap-1 border-b border-r border-border p-2 transition-colors hover:bg-accent/5 ${
                inMaand ? "bg-white" : "bg-black/[.02]"
              }`}
            >
              <span
                className={`text-sm ${isToday(dag) ? "flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white" : inMaand ? "text-foreground" : "text-muted"}`}
              >
                {format(dag, "d")}
              </span>
              {aantal > 0 && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent-hover">
                  {aantal} {aantal === 1 ? "boeking" : "boekingen"}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <p className="p-3 text-center text-xs text-muted">
        {format(maand, "MMMM yyyy", { locale: nl })} — klik op een dag voor het dagoverzicht
      </p>
    </div>
  );
}
