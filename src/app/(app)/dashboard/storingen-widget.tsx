import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { UitklapLijst } from "./uitklap-lijst";

/** Open storingen (nieuw of in behandeling), voor de beheerder. */
export async function StoringenWidget() {
  const supabase = await createClient();

  const { data: rijen } = await supabase
    .from("storingen")
    .select("id, machine_code, item_nr, ernst, omschrijving, status, gemeld_op, gemeld_door, machines(naam)")
    .in("status", ["nieuw", "in_behandeling"])
    .order("gemeld_op", { ascending: false })
    .limit(50);

  const open = rijen ?? [];
  if (open.length === 0) return null;

  const nieuw = open.filter((s) => s.status === "nieuw").length;
  // Defect eerst, daarna nieuwste.
  const gesorteerd = [...open].sort(
    (a, b) =>
      Number(b.ernst === "defect") - Number(a.ernst === "defect") || b.gemeld_op.localeCompare(a.gemeld_op),
  );

  return (
    <Card className="mb-6 border-danger/30">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          🚨 Open storingen ({open.length})
          {nieuw > 0 && (
            <span className="ml-2 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
              {nieuw} nieuw
            </span>
          )}
        </h2>
        <Link href="/storingen" className="text-sm font-medium text-accent-hover hover:underline">
          Naar storingen →
        </Link>
      </div>
      <UitklapLijst
        aantal={6}
        kinderen={gesorteerd.map((s) => (
          <li key={s.id}>
            <Link
              href={`/storingen?machine=${encodeURIComponent(s.machine_code)}`}
              className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-black/[.04]"
            >
            <span className="min-w-0 truncate">
              <span className="font-medium">{s.machines?.naam ?? s.machine_code}</span>
              {s.item_nr ? <span className="text-muted"> · nr. {s.item_nr}</span> : null}
              <span className="text-muted"> — {s.omschrijving}</span>
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                s.ernst === "defect" ? "bg-danger/10 text-danger" : "bg-amber-100 text-amber-800"
              }`}
            >
              {s.ernst === "defect" ? "Werkt niet" : "Gedeeltelijk"}
            </span>
            </Link>
          </li>
        ))}
      />
    </Card>
  );
}
