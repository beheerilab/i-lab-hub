import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { huidigeDatumAmsterdam } from "@/lib/tijd";
import { Card } from "@/components/ui/card";
import { sorteerTaken, timing, laadPersonen } from "@/lib/werkzaamheden";
import { UitklapLijst } from "./uitklap-lijst";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

/** Overzicht van de openstaande werkzaamheden voor de crew: te laat, deze week, nu voorbereiden. */
export async function WerkzaamhedenWidget() {
  const supabase = await createClient();
  const vandaag = huidigeDatumAmsterdam();

  const { data } = await supabase
    .from("werkzaamheden")
    .select("id, title, due, lead_days, status, prio, who, cat")
    .neq("status", "klaar");
  const open = data ?? [];
  if (open.length === 0) return null;

  const tm = (t: (typeof open)[number]) => timing(t, vandaag);
  const late = open.filter((t) => tm(t).k === "late");
  const week = open.filter((t) => ["today", "soon"].includes(tm(t).k));
  const signaal = open.filter((t) => tm(t).k === "signal");
  const aandacht = sorteerTaken([...late, ...week, ...signaal], vandaag);
  if (aandacht.length === 0) return null;

  const personen = await laadPersonen(supabase);
  const naam = (who: string) => (who === "samen" ? "Samen" : personen.find((p) => p.id === who)?.name ?? "Niet toegewezen");

  return (
    <Card className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">🛠️ Werkzaamheden</h2>
        <Link href="/werkzaamheden" className="text-sm font-medium text-accent-hover hover:underline">
          Naar werkzaamheden →
        </Link>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-black/[.03] px-2 py-2">
          <div className="text-xl font-bold text-danger">{late.length}</div>
          <div className="text-xs text-muted">te laat</div>
        </div>
        <div className="rounded-lg bg-black/[.03] px-2 py-2">
          <div className="text-xl font-bold text-amber-700">{week.length}</div>
          <div className="text-xs text-muted">deze week</div>
        </div>
        <div className="rounded-lg bg-black/[.03] px-2 py-2">
          <div className="text-xl font-bold text-accent-hover">{signaal.length}</div>
          <div className="text-xs text-muted">voorbereiden</div>
        </div>
      </div>
      <UitklapLijst
        aantal={5}
        kinderen={aandacht.map((t) => {
          const k = tm(t).k;
          return (
            <li key={t.id}>
              <Link
                href={`/werkzaamheden?open=${t.id}`}
                className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-black/[.04]"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium">{t.title}</span>
                  <span className="text-muted"> · {naam(t.who)}</span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    k === "late"
                      ? "bg-danger/10 text-danger"
                      : k === "signal"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-black/[.05] text-muted"
                  }`}
                >
                  {k === "signal"
                    ? "voorbereiden"
                    : t.due
                      ? format(new Date(`${t.due}T00:00`), "EEE d MMM", { locale: nl })
                      : ""}
                </span>
              </Link>
            </li>
          );
        })}
      />
    </Card>
  );
}
