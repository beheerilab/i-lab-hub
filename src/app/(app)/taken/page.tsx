import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { TaskForm } from "./task-form";
import { TaskItem } from "./task-item";
import { WeekNav } from "./week-nav";

const WEEKDAGEN = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag"];

export default async function TakenPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const referenceDate = week ? parseISO(week) : new Date();
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 4);
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name");

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
      <h1 className="mb-1 text-2xl font-semibold">Taken</h1>
      <p className="mb-6 text-muted">Openstaande en afgevinkte taken per week.</p>

      {profile.role === "admin" && <TaskForm members={members ?? []} />}

      <Card className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Jouw open taken</h2>
        {!ownOpenTasks || ownOpenTasks.length === 0 ? (
          <p className="text-muted">Je hebt geen openstaande taken.</p>
        ) : (
          <div className="space-y-2">
            {ownOpenTasks.map((task) => (
              <TaskItem
                key={task.id}
                id={task.id}
                titel={`${task.titel} — ${format(new Date(task.datum), "d MMM", { locale: nl })}`}
                beschrijving={task.beschrijving}
                toegewezenAanNaam={task.profiles?.full_name || "onbekend"}
                status={task.status}
                magAfvinken={true}
                magArchiveren={false}
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
                  <p className="text-sm text-muted">Geen taken</p>
                ) : (
                  dayTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      id={task.id}
                      titel={task.titel}
                      beschrijving={task.beschrijving}
                      toegewezenAanNaam={task.profiles?.full_name || "onbekend"}
                      status={task.status}
                      magAfvinken={profile.role === "admin" || task.toegewezen_aan === userId}
                      magArchiveren={profile.role === "admin"}
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
