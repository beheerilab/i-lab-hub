import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, format, startOfWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { huidigeDatumAmsterdam, formatAmsterdam } from "@/lib/tijd";
import { Card } from "@/components/ui/card";
import { TaskForm } from "./task-form";
import { TaskItem } from "./task-item";
import { WeekNav } from "./week-nav";

const WEEKDAGEN = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag"];

function deadlineLabel(deadlineOp: string | null): string | null {
  if (!deadlineOp) return null;
  const vandaag = formatAmsterdam(new Date(), "yyyy-MM-dd");
  const deadlineDag = formatAmsterdam(deadlineOp, "yyyy-MM-dd");
  if (deadlineDag === vandaag) return `vandaag ${formatAmsterdam(deadlineOp, "HH:mm")}`;
  return formatAmsterdam(deadlineOp, "d MMM HH:mm");
}

export default async function WerkzaamhedenPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const vandaag = huidigeDatumAmsterdam();
  const referenceDate = week ? new Date(`${week}T00:00:00`) : vandaag;
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 4);
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name");

  const { data: contacts } = await supabase.from("contacts").select("id, naam").order("naam");

  const { data: ownOpenTasks } = await supabase
    .from("tasks")
    .select("*, profiles!tasks_toegewezen_aan_fkey(full_name)")
    .eq("toegewezen_aan", userId)
    .eq("status", "open")
    .eq("gearchiveerd", false)
    .order("datum", { ascending: true });

  const { data: weekTasks } = await supabase
    .from("tasks")
    .select("*, profiles!tasks_toegewezen_aan_fkey(full_name)")
    .eq("gearchiveerd", false)
    .gte("datum", format(weekStart, "yyyy-MM-dd"))
    .lte("datum", format(weekEnd, "yyyy-MM-dd"))
    .order("datum", { ascending: true });

  const tasksByDay = new Map<string, typeof weekTasks>();
  for (const day of weekDays) {
    tasksByDay.set(format(day, "yyyy-MM-dd"), []);
  }
  for (const task of weekTasks ?? []) {
    const list = tasksByDay.get(task.datum);
    if (list) list.push(task);
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-white">Werkzaamheden</h1>
      <p className="mb-6 text-white/80">Openstaande en afgevinkte werkzaamheden per week.</p>

      <TaskForm
        members={members ?? []}
        standaardDatum={format(vandaag, "yyyy-MM-dd")}
        huidigeGebruikerId={userId}
      />

      <Card className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Jouw open werkzaamheden</h2>
        {!ownOpenTasks || ownOpenTasks.length === 0 ? (
          <p className="text-muted">Je hebt geen openstaande werkzaamheden.</p>
        ) : (
          <div className="space-y-2">
            {ownOpenTasks.map((task) => (
              <TaskItem
                key={task.id}
                id={task.id}
                titel={`${task.titel} — ${format(new Date(`${task.datum}T00:00:00`), "d MMM", { locale: nl })}`}
                datum={task.datum}
                datumLabel={format(new Date(`${task.datum}T00:00:00`), "d MMMM yyyy", { locale: nl })}
                beschrijving={task.beschrijving}
                toegewezenAanNaam={task.profiles?.full_name || "onbekend"}
                status={task.status}
                deadlineLabel={deadlineLabel(task.deadline_op)}
                magAfvinken={true}
                magArchiveren={false}
                contacts={contacts ?? []}
              />
            ))}
          </div>
        )}
      </Card>

      <h2 className="mb-3 text-lg font-semibold">Weekoverzicht</h2>
      <WeekNav
        weekStart={weekStart}
        weekEnd={weekEnd}
        prevWeekParam={format(addDays(weekStart, -7), "yyyy-MM-dd")}
        nextWeekParam={format(addDays(weekStart, 7), "yyyy-MM-dd")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        {weekDays.map((day, i) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDay.get(key) ?? [];
          return (
            <div key={key}>
              <h3 className="mb-2 text-sm font-semibold text-muted">
                {WEEKDAGEN[i]} {format(day, "d MMM", { locale: nl })}
              </h3>
              <div className="space-y-2">
                {dayTasks.length === 0 ? (
                  <p className="text-sm text-muted">Geen werkzaamheden</p>
                ) : (
                  dayTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      id={task.id}
                      titel={task.titel}
                      datum={task.datum}
                      datumLabel={format(day, "d MMMM yyyy", { locale: nl })}
                      beschrijving={task.beschrijving}
                      toegewezenAanNaam={task.profiles?.full_name || "onbekend"}
                      status={task.status}
                      deadlineLabel={deadlineLabel(task.deadline_op)}
                      magAfvinken={profile.role === "admin" || task.toegewezen_aan === userId}
                      magArchiveren={profile.role === "admin" || task.created_by === userId}
                      contacts={contacts ?? []}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
