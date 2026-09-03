import Link from "next/link";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const WEEKDAGEN = ["Ma", "Di", "Wo", "Do", "Vr"];

export function DayTabs({
  weekDays,
  activeDatum,
  weekParam,
}: {
  weekDays: Date[];
  activeDatum: string;
  weekParam: string;
}) {
  return (
    <div className="mb-4 inline-flex flex-wrap gap-1 rounded-xl border border-border bg-white p-1">
      {weekDays.map((day, i) => {
        const key = format(day, "yyyy-MM-dd");
        const isActive = key === activeDatum;
        return (
          <Link
            key={key}
            href={`/planning?week=${weekParam}&dag=${key}`}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? "bg-accent text-white" : "text-muted hover:bg-black/[.03]"
            }`}
          >
            {WEEKDAGEN[i]} {format(day, "d MMM", { locale: nl })}
          </Link>
        );
      })}
    </div>
  );
}
