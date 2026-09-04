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

  const modus: Modus =
    modusParam === "week" || modusParam === "maand" ? modusParam : "dag";
  const datum = datumParam ? parseISO(datumParam) : huidigeDatumAmsterdam();

  const { data: rooms } = await supabase
    .from("labs")
    .select("id, naam, volgorde, actief")
    .order("volgorde");

  const actieveRooms = (rooms ?? []).filter((r) => r.actief);

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

  const { data: bookingsData } = await supabase
    .from("bookings")
    .select(
      "id, lab_id, datum, start_tijd, eind_tijd, vak, school, docent, type_activiteit, aantal_leerlingen, bijzonderheden",
    )
    .gte("datum", format(bereikStart, "yyyy-MM-dd"))
    .lte("datum", format(bereikEind, "yyyy-MM-dd"));

  const bookings: Booking[] = bookingsData ?? [];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-white">Planning</h1>
      <p className="mb-6 text-white/80">Ruimtegebruik inplannen — dag, week of maand.</p>

      {profile.role === "admin" && <RoomManager rooms={rooms ?? []} />}

      <ViewSwitcher modus={modus} datum={datum} />

      {actieveRooms.length === 0 ? (
        <p className="text-white">Er zijn nog geen actieve ruimtes ingesteld.</p>
      ) : modus === "dag" ? (
        <DayView rooms={actieveRooms} datum={format(datum, "yyyy-MM-dd")} bookings={bookings} />
      ) : modus === "week" ? (
        <WeekView
          rooms={actieveRooms}
          weekDays={Array.from({ length: 5 }, (_, i) => addDays(bereikStart, i))}
          bookings={bookings}
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
    </div>
  );
}
