import Link from "next/link";
import { addDays, addMonths, endOfWeek, format, startOfWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { huidigeDatumAmsterdam } from "@/lib/tijd";

type Modus = "dag" | "week" | "maand";

export function PlannerNav({ modus, datum }: { modus: Modus; datum: Date }) {
  const vandaag = format(huidigeDatumAmsterdam(), "yyyy-MM-dd");

  let vorige: Date;
  let volgende: Date;
  if (modus === "dag") {
    vorige = addDays(datum, -1);
    volgende = addDays(datum, 1);
  } else if (modus === "week") {
    vorige = addDays(datum, -7);
    volgende = addDays(datum, 7);
  } else {
    vorige = addMonths(datum, -1);
    volgende = addMonths(datum, 1);
  }

  let titel: string;
  if (modus === "maand") {
    titel = format(datum, "MMMM yyyy", { locale: nl });
  } else if (modus === "week") {
    const weekStart = startOfWeek(datum, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(datum, { weekStartsOn: 1 });
    titel = `${format(weekStart, "d MMM", { locale: nl })} – ${format(weekEnd, "d MMM yyyy", { locale: nl })}`;
  } else {
    titel = format(datum, "EEEE d MMMM yyyy", { locale: nl });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/ruimteplanner?modus=${modus}&datum=${vandaag}`}
        className="shrink-0 rounded-lg border border-border bg-white px-3 py-1.5 text-sm hover:bg-black/[.03]"
      >
        Vandaag
      </Link>

      <div className="flex items-center gap-1.5">
        <Link
          href={`/ruimteplanner?modus=${modus}&datum=${format(vorige, "yyyy-MM-dd")}`}
          className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-sm hover:bg-black/[.03]"
          aria-label="Vorige periode"
        >
          ←
        </Link>
        <span className="min-w-40 text-center text-sm font-medium capitalize text-white">{titel}</span>
        <Link
          href={`/ruimteplanner?modus=${modus}&datum=${format(volgende, "yyyy-MM-dd")}`}
          className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-sm hover:bg-black/[.03]"
          aria-label="Volgende periode"
        >
          →
        </Link>
      </div>

      <div className="inline-flex gap-1 rounded-xl border border-border bg-white p-1">
        {(["dag", "week", "maand"] as const).map((m) => (
          <Link
            key={m}
            href={`/ruimteplanner?modus=${m}&datum=${format(datum, "yyyy-MM-dd")}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              modus === m ? "bg-accent text-white" : "text-muted hover:bg-black/[.03]"
            }`}
          >
            {m}
          </Link>
        ))}
      </div>
    </div>
  );
}
