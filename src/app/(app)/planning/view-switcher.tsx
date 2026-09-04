import Link from "next/link";
import { addDays, addMonths, format } from "date-fns";
import { nl } from "date-fns/locale";
import { huidigeDatumAmsterdam } from "@/lib/tijd";

type Modus = "dag" | "week" | "maand";

export function ViewSwitcher({ modus, datum }: { modus: Modus; datum: Date }) {
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

  const titel =
    modus === "maand"
      ? format(datum, "MMMM yyyy", { locale: nl })
      : format(datum, "EEEE d MMMM yyyy", { locale: nl });

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex gap-1 rounded-xl border border-border bg-white p-1">
        {(["dag", "week", "maand"] as const).map((m) => (
          <Link
            key={m}
            href={`/planning?modus=${m}&datum=${format(datum, "yyyy-MM-dd")}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              modus === m ? "bg-accent text-white" : "text-muted hover:bg-black/[.03]"
            }`}
          >
            {m}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/planning?modus=${modus}&datum=${format(vorige, "yyyy-MM-dd")}`}
          className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm hover:bg-black/[.03]"
        >
          ← Vorige
        </Link>
        <Link
          href={`/planning?modus=${modus}&datum=${vandaag}`}
          className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm hover:bg-black/[.03]"
        >
          Vandaag
        </Link>
        <Link
          href={`/planning?modus=${modus}&datum=${format(volgende, "yyyy-MM-dd")}`}
          className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm hover:bg-black/[.03]"
        >
          Volgende →
        </Link>
      </div>

      <span className="font-medium capitalize text-white">{titel}</span>
    </div>
  );
}
