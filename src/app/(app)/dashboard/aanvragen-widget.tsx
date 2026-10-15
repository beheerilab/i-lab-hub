import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { differenceInCalendarDays, format } from "date-fns";
import { nl } from "date-fns/locale";
import { huidigeDatumAmsterdam } from "@/lib/tijd";

/** Openstaande lesaanvragen uit de Planning, voor de crew. */
export async function AanvragenWidget() {
  const supabase = await createClient();
  const vandaag = huidigeDatumAmsterdam();

  const { data: rijen } = await supabase
    .from("bookings")
    .select("id, datum, start_tijd, eind_tijd, vak, docent, school, series_id, created_at, labs(naam)")
    .eq("status", "pending")
    .order("datum")
    .order("start_tijd");

  // Een reeks telt als één aanvraag.
  const gezien = new Set<string>();
  const aanvragen = (rijen ?? []).filter((r) => {
    const sleutel = r.series_id ?? r.id;
    if (gezien.has(sleutel)) return false;
    gezien.add(sleutel);
    return true;
  });
  if (aanvragen.length === 0) return null;

  const reeksGrootte = new Map<string, number>();
  (rijen ?? []).forEach((r) => {
    if (r.series_id) reeksGrootte.set(r.series_id, (reeksGrootte.get(r.series_id) ?? 0) + 1);
  });

  return (
    <Card className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">🗓️ Open lesaanvragen ({aanvragen.length})</h2>
        <Link href="/planning" className="text-sm font-medium text-accent-hover hover:underline">
          Naar planning →
        </Link>
      </div>
      <ul className="space-y-1.5">
        {aanvragen.slice(0, 6).map((a) => {
          const dagen = differenceInCalendarDays(new Date(`${a.datum}T00:00`), vandaag);
          const reeks = a.series_id ? reeksGrootte.get(a.series_id) ?? 1 : 1;
          return (
            <li key={a.id}>
              <Link
                href={`/planning?dag=${a.datum}&open=${a.id}`}
                className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-black/[.04]"
              >
              <span className="min-w-0 truncate">
                <span className="font-medium">{a.vak}</span>
                <span className="text-muted">
                  {" "}
                  · {a.labs?.naam ?? "?"} · {a.docent}
                  {reeks > 1 ? ` · reeks ${reeks}×` : ""}
                </span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  dagen <= 2 ? "bg-amber-100 text-amber-800" : "bg-black/[.05] text-muted"
                }`}
              >
                {format(new Date(`${a.datum}T00:00`), "EEE d MMM", { locale: nl })} · {a.start_tijd.slice(0, 5)}
              </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {aanvragen.length > 6 && <p className="mt-3 text-xs text-muted">+ {aanvragen.length - 6} meer</p>}
    </Card>
  );
}
