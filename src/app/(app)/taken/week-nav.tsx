import Link from "next/link";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export function WeekNav({
  weekStart,
  weekEnd,
  prevWeekParam,
  nextWeekParam,
}: {
  weekStart: Date;
  weekEnd: Date;
  prevWeekParam: string;
  nextWeekParam: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <Link
        href={`/taken?week=${prevWeekParam}`}
        className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm hover:bg-black/[.03]"
      >
        ← Vorige week
      </Link>
      <span className="font-medium">
        {format(weekStart, "d MMM", { locale: nl })} – {format(weekEnd, "d MMM yyyy", { locale: nl })}
      </span>
      <Link
        href={`/taken?week=${nextWeekParam}`}
        className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm hover:bg-black/[.03]"
      >
        Volgende week →
      </Link>
    </div>
  );
}
