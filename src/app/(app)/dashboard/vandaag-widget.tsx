import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { huidigeDatumAmsterdam, formatAmsterdam } from "@/lib/tijd";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { ACTIVITEIT_KLEUREN, ACTIVITEIT_LABELS } from "../planning/types";

export async function VandaagWidget({ userId, isDocent }: { userId: string; isDocent: boolean }) {
  const supabase = await createClient();
  const vandaag = format(huidigeDatumAmsterdam(), "yyyy-MM-dd");

  // Een docent ziet hier alleen de eigen les(sen) — geen "dichte" reservering
  // van anderen nodig op een samenvattend dashboard-kaartje.
  let bookingsQuery = supabase
    .from("bookings")
    .select("id, start_tijd, eind_tijd, vak, type_activiteit, labs(naam)")
    .eq("datum", vandaag)
    .order("start_tijd");
  if (isDocent) bookingsQuery = bookingsQuery.eq("created_by", userId);

  const [{ data: bookings }, { data: tasks }] = await Promise.all([
    bookingsQuery,
    supabase
      .from("tasks")
      .select("id, titel, deadline_op")
      .eq("toegewezen_aan", userId)
      .eq("datum", vandaag)
      .eq("status", "open")
      .eq("gearchiveerd", false)
      .order("created_at"),
  ]);

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
                <li
                  key={b.id}
                  className={`rounded-lg border px-2.5 py-1.5 text-sm ${ACTIVITEIT_KLEUREN[b.type_activiteit]}`}
                >
                  <span className="font-medium">
                    {b.start_tijd.slice(0, 5)}–{b.eind_tijd.slice(0, 5)} {b.vak}
                  </span>
                  <span className="ml-1 opacity-80">
                    · {b.labs?.naam || "onbekend"} · {ACTIVITEIT_LABELS[b.type_activiteit]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted">Jouw werkzaamheden vandaag</h3>
          {!tasks || tasks.length === 0 ? (
            <p className="text-sm text-muted">Geen werkzaamheden voor vandaag.</p>
          ) : (
            <ul className="space-y-1.5">
              {tasks.map((t) => (
                <li key={t.id} className="rounded-lg border border-border bg-black/[.02] px-2.5 py-1.5 text-sm">
                  {t.titel}
                  {t.deadline_op && (
                    <span className="ml-1.5 rounded-full bg-danger/10 px-1.5 py-0.5 text-xs text-danger">
                      ⏰ {formatAmsterdam(t.deadline_op, "HH:mm")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link href="/werkzaamheden" className="mt-2 inline-block text-sm text-accent underline">
            Naar werkzaamheden →
          </Link>
        </div>
      </div>
    </Card>
  );
}
