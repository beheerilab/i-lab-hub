import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { huidigeDatumAmsterdam } from "@/lib/tijd";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { ACTIVITEIT_KLEUREN, ACTIVITEIT_LABELS } from "../planning/types";
import { sorteerTaken, timing } from "@/lib/werkzaamheden";

export async function VandaagWidget({ userId, isDocent }: { userId: string; isDocent: boolean }) {
  const supabase = await createClient();
  const vandaag = format(huidigeDatumAmsterdam(), "yyyy-MM-dd");

  // Een docent ziet hier alleen de eigen les(sen) — geen "dichte" reservering
  // van anderen nodig op een samenvattend dashboard-kaartje.
  let bookingsQuery = supabase
    .from("bookings")
    .select("id, start_tijd, eind_tijd, vak, type_activiteit, labs(naam)")
    .eq("datum", vandaag)
    .in("status", isDocent ? ["pending", "confirmed"] : ["confirmed"])
    .order("start_tijd");
  if (isDocent) bookingsQuery = bookingsQuery.or(`created_by.eq.${userId},docent_id.eq.${userId}`);

  const [{ data: bookings }, { data: taken }] = await Promise.all([
    bookingsQuery,
    isDocent
      ? Promise.resolve({ data: [] as { id: string; title: string; due: string | null; lead_days: number; status: string; prio: string }[] })
      : supabase
          .from("werkzaamheden")
          .select("id, title, due, lead_days, status, prio")
          .in("who", [userId, "samen"])
          .neq("status", "klaar"),
  ]);
  const vandaagDatum = huidigeDatumAmsterdam();
  // Jouw taken waarvan de deadline verstreken is of binnen 7 dagen valt.
  const tasks = sorteerTaken(
    (taken ?? []).filter((t) => ["late", "today", "soon"].includes(timing(t, vandaagDatum).k)),
    vandaagDatum,
  );

  return (
    <Card className="mb-6">
      <h2 className="mb-1 text-lg font-semibold">
        Vandaag — {format(huidigeDatumAmsterdam(), "EEEE d MMMM", { locale: nl })}
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted">Planning vandaag</h3>
          {!bookings || bookings.length === 0 ? (
            <p className="text-sm text-muted">Geen lessen of evenementen gepland vandaag.</p>
          ) : (
            <ul className="space-y-1.5">
              {bookings.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/planning?dag=${vandaag}&open=${b.id}`}
                    className={`block rounded-lg border px-2.5 py-1.5 text-sm transition-shadow hover:shadow-md ${ACTIVITEIT_KLEUREN[b.type_activiteit]}`}
                  >
                    <span className="font-medium">
                      {b.start_tijd.slice(0, 5)}–{b.eind_tijd.slice(0, 5)} {b.vak}
                    </span>
                    <span className="ml-1 opacity-80">
                      · {b.labs?.naam || "onbekend"} · {ACTIVITEIT_LABELS[b.type_activiteit]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        {!isDocent && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted">Jouw werkzaamheden (deze week)</h3>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted">Niets dat nu aandacht vraagt.</p>
            ) : (
              <ul className="space-y-1.5">
                {tasks.slice(0, 6).map((t) => {
                  const tm = timing(t, vandaagDatum);
                  return (
                    <li key={t.id}>
                      <Link
                        href={`/werkzaamheden?open=${t.id}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-black/[.02] px-2.5 py-1.5 text-sm transition-colors hover:bg-black/[.05]"
                      >
                        <span className="min-w-0 truncate">{t.title}</span>
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs ${
                            tm.k === "late" ? "bg-danger/10 text-danger" : "bg-black/[.05] text-muted"
                          }`}
                        >
                          {tm.k === "late" ? "te laat" : tm.k === "today" ? "vandaag" : "deze week"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link href="/werkzaamheden" className="mt-2 inline-block text-sm text-accent underline">
              Naar werkzaamheden →
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}
