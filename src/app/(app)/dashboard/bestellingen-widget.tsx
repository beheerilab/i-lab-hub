import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { huidigeDatumAmsterdam } from "@/lib/tijd";
import { Card } from "@/components/ui/card";
import { differenceInCalendarDays, format } from "date-fns";
import { nl } from "date-fns/locale";

const MAX_ZICHTBAAR = 6;
const DAGEN_SPOED = 3;

/** Wat er nog besteld moet worden (uit de Bestellijst), op volgorde van urgentie. */
export async function BestellingenWidget() {
  const supabase = await createClient();
  const vandaag = huidigeDatumAmsterdam();

  const { data: rijen } = await supabase
    .from("bestel_items")
    .select("id, status, data, created_at")
    .in("status", ["aangevraagd", "besteld"]);

  const open = (rijen ?? []).filter((r) => r.status === "aangevraagd");
  const onderweg = (rijen ?? []).length - open.length;
  if (open.length === 0) return null;

  const items = open
    .map((r) => {
      const nodigOp = typeof r.data.nodigOp === "string" && r.data.nodigOp ? r.data.nodigOp : null;
      const dagen = nodigOp ? differenceInCalendarDays(new Date(`${nodigOp}T00:00`), vandaag) : null;
      const spoed = r.data.spoed === true;
      const urgentie = dagen !== null && dagen < 0 ? 0 : spoed || (dagen !== null && dagen <= DAGEN_SPOED) ? 1 : 2;
      return {
        id: r.id,
        omschrijving: String(r.data.omschrijving ?? "Aanvraag"),
        aantal: r.data.aantal ? `${r.data.aantal} ${r.data.eenheid ?? ""}`.trim() : "",
        aanvrager: typeof r.data.aanvrager === "string" ? r.data.aanvrager : "",
        nodigOp,
        dagen,
        urgentie,
        created: r.created_at,
      };
    })
    .sort(
      (a, b) =>
        a.urgentie - b.urgentie ||
        (a.nodigOp ?? "9999").localeCompare(b.nodigOp ?? "9999") ||
        a.created.localeCompare(b.created),
    );

  const teLaat = items.filter((i) => i.urgentie === 0).length;

  return (
    <Card className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">📦 Nog te bestellen ({items.length})</h2>
        <Link href="/bestellijst" className="text-sm font-medium text-accent-hover hover:underline">
          Naar bestellijst →
        </Link>
      </div>
      <ul className="space-y-1.5">
        {items.slice(0, MAX_ZICHTBAAR).map((i) => (
          <li key={i.id}>
            <Link
              href={`/bestellijst?open=${i.id}`}
              className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-black/[.04]"
            >
            <span className="min-w-0 truncate">
              <span className="font-medium">{i.omschrijving}</span>
              {i.aantal && <span className="text-muted"> · {i.aantal}</span>}
              {i.aanvrager && <span className="text-muted"> · {i.aanvrager}</span>}
            </span>
            {i.nodigOp && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  i.urgentie === 0
                    ? "bg-danger/10 text-danger"
                    : i.urgentie === 1
                      ? "bg-amber-100 text-amber-800"
                      : "bg-black/[.05] text-muted"
                }`}
              >
                {i.urgentie === 0
                  ? "Te laat"
                  : i.dagen === 0
                    ? "Vandaag nodig"
                    : `Nodig ${format(new Date(`${i.nodigOp}T00:00`), "d MMM", { locale: nl })}`}
              </span>
            )}
            </Link>
          </li>
        ))}
      </ul>
      {(items.length > MAX_ZICHTBAAR || onderweg > 0 || teLaat > 0) && (
        <p className="mt-3 text-xs text-muted">
          {items.length > MAX_ZICHTBAAR && `+ ${items.length - MAX_ZICHTBAAR} meer · `}
          {teLaat > 0 && `${teLaat} te laat · `}
          {onderweg > 0 && `${onderweg} onderweg`}
        </p>
      )}
    </Card>
  );
}
