import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { huidigeDatumAmsterdam } from "@/lib/tijd";
import { ViewSwitcher } from "./view-switcher";
import { RoomManager } from "./room-manager";
import { QuickAddButton } from "./quick-add-button";
import { DayView } from "./day-view";
import { WeekView } from "./week-view";
import { MonthView } from "./month-view";
import type { Booking } from "./types";

type Modus = "dag" | "week" | "maand";

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ modus?: string; datum?: string }>;
}) {
  const { modus: modusParam, datum: datumParam } = await searchParams;
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const isDocent = profile.role === "docent";

  const modus: Modus =
    modusParam === "week" || modusParam === "maand" ? modusParam : "dag";
  const datum = datumParam ? parseISO(datumParam) : huidigeDatumAmsterdam();

  const { data: rooms } = await supabase
    .from("labs")
    .select("id, naam, volgorde, actief, docent_boekbaar, leerlingen_toegestaan")
    .order("volgorde");

  const { data: subjects } = await supabase.from("subjects").select("id, naam").order("naam");

  const actieveRooms = (rooms ?? []).filter((r) => r.actief);
  const boekbareRooms = isDocent ? actieveRooms.filter((r) => r.docent_boekbaar) : undefined;
  const vergrendelDocentNaam = isDocent ? profile.full_name ?? "" : undefined;

  let bereikStart: Date;
  let bereikEind: Date;
  if (modus === "dag") {
    bereikStart = datum;
    bereikEind = datum;
  } else if (modus === "week") {
    bereikStart = startOfWeek(datum, { weekStartsOn: 1 });
    bereikEind = addDays(bereikStart, 4);
  } else {
    bereikStart = startOfWeek(startOfMonth(datum), { weekStartsOn: 1 });
    bereikEind = endOfWeek(endOfMonth(datum), { weekStartsOn: 1 });
  }

  const boekingenSelectie =
    "id, lab_id, datum, start_tijd, eind_tijd, vak, school, docent, type_activiteit, type_activiteit_anders, categorie, aantal_leerlingen, bijzonderheden";

  const { data: bookingsData } = isDocent
    ? await supabase
        .from("bookings_docent_view")
        .select(boekingenSelectie)
        .gte("datum", format(bereikStart, "yyyy-MM-dd"))
        .lte("datum", format(bereikEind, "yyyy-MM-dd"))
    : await supabase
        .from("bookings")
        .select(boekingenSelectie)
        .gte("datum", format(bereikStart, "yyyy-MM-dd"))
        .lte("datum", format(bereikEind, "yyyy-MM-dd"));

  const bookings: Booking[] = bookingsData ?? [];

  return (
    <div>
      <div className="mb-1 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">Planning</h1>
        <QuickAddButton
          rooms={boekbareRooms ?? actieveRooms}
          subjects={subjects ?? []}
          datum={format(datum, "yyyy-MM-dd")}
          vergrendelDocentNaam={vergrendelDocentNaam}
        />
      </div>
      <p className="mb-6 text-white/80">Ruimtegebruik inplannen — dag, week of maand.</p>

      <ViewSwitcher modus={modus} datum={datum} />

      {actieveRooms.length === 0 ? (
        <p className="text-white">Er zijn nog geen actieve ruimtes ingesteld.</p>
      ) : modus === "dag" ? (
        <DayView
          rooms={actieveRooms}
          boekbareRooms={boekbareRooms}
          datum={format(datum, "yyyy-MM-dd")}
          bookings={bookings}
          subjects={subjects ?? []}
          vergrendelDocentNaam={vergrendelDocentNaam}
        />
      ) : modus === "week" ? (
        <WeekView
          rooms={actieveRooms}
          boekbareRooms={boekbareRooms}
          weekDays={Array.from({ length: 5 }, (_, i) => addDays(bereikStart, i))}
          bookings={bookings}
          subjects={subjects ?? []}
          vergrendelDocentNaam={vergrendelDocentNaam}
        />
      ) : (
        <MonthView
          maand={datum}
          boekingenPerDag={bookings.reduce((map, b) => {
            map.set(b.datum, (map.get(b.datum) ?? 0) + 1);
            return map;
          }, new Map<string, number>())}
        />
      )}

      {profile.role === "admin" && <RoomManager rooms={rooms ?? []} />}
    </div>
  );
}
