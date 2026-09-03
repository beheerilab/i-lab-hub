import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { DayTabs } from "./day-tabs";
import { PlanningWeekNav } from "./week-nav";
import { PlanningGrid } from "./planning-grid";

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; dag?: string }>;
}) {
  const { week, dag } = await searchParams;
  await requireProfile();
  const supabase = await createClient();

  const referenceDate = week ? parseISO(week) : new Date();
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 4);
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  const weekDayKeys = weekDays.map((d) => format(d, "yyyy-MM-dd"));

  const activeDatum = dag && weekDayKeys.includes(dag) ? dag : weekDayKeys[0];

  const { data: labs } = await supabase
    .from("labs")
    .select("id, naam")
    .eq("actief", true)
    .order("volgorde");

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, lab_id, start_uur, vak, klas_groep, type_activiteit, aantal_leerlingen")
    .eq("datum", activeDatum);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Planning</h1>
      <p className="mb-6 text-muted">Labgebruik inplannen, per week en per lab.</p>

      <PlanningWeekNav
        weekStart={weekStart}
        weekEnd={weekEnd}
        prevWeekParam={format(addDays(weekStart, -7), "yyyy-MM-dd")}
        nextWeekParam={format(addDays(weekStart, 7), "yyyy-MM-dd")}
      />
      <DayTabs
        weekDays={weekDays}
        activeDatum={activeDatum}
        weekParam={format(weekStart, "yyyy-MM-dd")}
      />

      {!labs || labs.length === 0 ? (
        <p className="text-muted">Er zijn nog geen labs ingesteld.</p>
      ) : (
        <PlanningGrid labs={labs} datum={activeDatum} bookings={bookings ?? []} />
      )}
    </div>
  );
}
