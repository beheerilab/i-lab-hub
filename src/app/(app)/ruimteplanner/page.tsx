import { requireGeenDocent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { huidigeDatumAmsterdam } from "@/lib/tijd";
import { PlannerNav } from "./planner-nav";
import { QuickAddReserveringButton } from "./quick-add-button";
import { DagView } from "./dag-view";
import { WeekView } from "./week-view";
import { MaandView } from "./maand-view";
import { RuimteSidebar } from "./ruimte-sidebar";
import type { Reservering, RuimteplannerRoom } from "./types";

type Modus = "dag" | "week" | "maand";

export default async function RuimteplannerPage({
  searchParams,
}: {
  searchParams: Promise<{ modus?: string; datum?: string }>;
}) {
  await requireGeenDocent();
  const { modus: modusParam, datum: datumParam } = await searchParams;
  const supabase = await createClient();

  const modus: Modus = modusParam === "week" || modusParam === "maand" ? modusParam : "dag";
  const datum = datumParam ? parseISO(datumParam) : huidigeDatumAmsterdam();

  const { data: roomsData } = await supabase
    .from("labs")
    .select("id, naam")
    .eq("actief", true)
    .order("volgorde");
  const rooms: RuimteplannerRoom[] = roomsData ?? [];

  let bereikStart: Date;
  let bereikEind: Date;
  if (modus === "dag") {
    bereikStart = datum;
    bereikEind = datum;
  } else if (modus === "week") {
    bereikStart = startOfWeek(datum, { weekStartsOn: 1 });
    bereikEind = endOfWeek(bereikStart, { weekStartsOn: 1 });
  } else {
    bereikStart = startOfWeek(startOfMonth(datum), { weekStartsOn: 1 });
    bereikEind = endOfWeek(endOfMonth(datum), { weekStartsOn: 1 });
  }

  const { data: bookingsData } = await supabase
    .from("bookings")
    .select("id, lab_id, datum, start_tijd, eind_tijd, docent, aantal_leerlingen, labs(naam)")
    .gte("datum", format(bereikStart, "yyyy-MM-dd"))
    .lte("datum", format(bereikEind, "yyyy-MM-dd"))
    .order("start_tijd");

  const reserveringen: Reservering[] = (bookingsData ?? []).map((b) => ({
    id: b.id,
    labId: b.lab_id,
    labNaam: b.labs?.naam ?? "",
    datum: b.datum,
    startTijd: b.start_tijd,
    eindTijd: b.eind_tijd,
    gastnaam: b.docent,
    aantalGasten: b.aantal_leerlingen,
  }));

  const vandaagStr = format(huidigeDatumAmsterdam(), "yyyy-MM-dd");
  const tellingenVandaag: Record<string, number> =
    vandaagStr >= format(bereikStart, "yyyy-MM-dd") && vandaagStr <= format(bereikEind, "yyyy-MM-dd")
      ? reserveringen
          .filter((r) => r.datum === vandaagStr)
          .reduce<Record<string, number>>((map, r) => {
            map[r.labId] = (map[r.labId] ?? 0) + 1;
            return map;
          }, {})
      : {};

  const { data: vandaagApart } =
    vandaagStr < format(bereikStart, "yyyy-MM-dd") || vandaagStr > format(bereikEind, "yyyy-MM-dd")
      ? await supabase.from("bookings").select("lab_id").eq("datum", vandaagStr)
      : { data: null };
  for (const b of vandaagApart ?? []) {
    tellingenVandaag[b.lab_id] = (tellingenVandaag[b.lab_id] ?? 0) + 1;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Ruimteplanner</h1>
          <p className="text-white/80">{rooms.length} ruimtes · overzicht van reserveringen</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PlannerNav modus={modus} datum={datum} />
          <QuickAddReserveringButton rooms={rooms} datum={format(datum, "yyyy-MM-dd")} />
        </div>
      </div>

      {rooms.length === 0 ? (
        <p className="text-white">Er zijn nog geen actieve ruimtes ingesteld.</p>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <RuimteSidebar rooms={rooms} tellingenVandaag={tellingenVandaag} />
          <div className="min-w-0 flex-1">
            {modus === "dag" ? (
              <DagView rooms={rooms} datum={format(datum, "yyyy-MM-dd")} reserveringen={reserveringen} />
            ) : modus === "week" ? (
              <WeekView
                rooms={rooms}
                weekDays={Array.from({ length: 7 }, (_, i) => addDays(bereikStart, i))}
                reserveringen={reserveringen}
              />
            ) : (
              <MaandView
                maand={datum}
                reserveringenPerDag={reserveringen.reduce((map, r) => {
                  map.set(r.datum, (map.get(r.datum) ?? 0) + 1);
                  return map;
                }, new Map<string, number>())}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
