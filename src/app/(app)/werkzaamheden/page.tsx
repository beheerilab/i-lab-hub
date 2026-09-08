import { requireGeenDocent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, format, startOfWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { huidigeDatumAmsterdam, formatAmsterdam } from "@/lib/tijd";
import { TaskForm } from "./task-form";
import { WeekNav } from "./week-nav";
import { KanbanBoard, type KanbanTaak } from "./kanban-board";
import { rolOverAchterstalligeTakenAction } from "./actions";
import type { Database, TaskPrioriteit } from "@/lib/supabase/database.types";

const WEEKDAGEN = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag"];
const PRIORITEIT_GEWICHT: Record<TaskPrioriteit, number> = { hoog: 0, normaal: 1, laag: 2 };

type TaskMetToegewezene = Database["public"]["Tables"]["tasks"]["Row"] & {
  profiles: { full_name: string | null } | null;
};

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
  const { userId, profile } = await requireGeenDocent();
  const supabase = await createClient();

  // Achterstallige (nog open, niet-gearchiveerde) werkzaamheden schuiven
  // automatisch door naar vandaag i.p.v. stilzwijgend "in het verleden" te
  // blijven staan.
  await rolOverAchterstalligeTakenAction();

  const vandaag = huidigeDatumAmsterdam();
  const vandaagStr = format(vandaag, "yyyy-MM-dd");
  const referenceDate = week ? new Date(`${week}T00:00:00`) : vandaag;
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 4);
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name");

  const { data: contacts } = await supabase.from("contacts").select("id, naam").order("naam");

  const { data: backlogTasksRaw } = await supabase
    .from("tasks")
    .select("*, profiles!tasks_toegewezen_aan_fkey(full_name)")
    .eq("toegewezen_aan", userId)
    .is("datum", null)
    .eq("status", "open")
    .eq("gearchiveerd", false)
    .order("created_at", { ascending: true });

  const { data: weekTasks } = await supabase
    .from("tasks")
    .select("*, profiles!tasks_toegewezen_aan_fkey(full_name)")
    .eq("gearchiveerd", false)
    .gte("datum", format(weekStart, "yyyy-MM-dd"))
    .lte("datum", format(weekEnd, "yyyy-MM-dd"))
    .order("datum", { ascending: true });

  const dagen = weekDays.map((day, i) => {
    const key = format(day, "yyyy-MM-dd");
    return {
      key,
      label: `${WEEKDAGEN[i]} ${format(day, "d MMM", { locale: nl })}`,
      isVandaag: key === vandaagStr,
    };
  });

  function naarKanbanTaak(task: TaskMetToegewezene): KanbanTaak {
    return {
      id: task.id,
      titel: task.titel,
      datum: task.datum,
      datumLabel: task.datum
        ? format(new Date(`${task.datum}T00:00:00`), "d MMMM yyyy", { locale: nl })
        : null,
      beschrijving: task.beschrijving,
      toegewezenAanNaam: task.profiles?.full_name || "onbekend",
      status: task.status,
      deadlineLabel: deadlineLabel(task.deadline_op),
      prioriteit: task.prioriteit,
      magAfvinken: profile.role === "admin" || task.toegewezen_aan === userId,
      magArchiveren: profile.role === "admin" || task.created_by === userId,
      magSlepen:
        profile.role === "admin" || task.created_by === userId || task.toegewezen_aan === userId,
    };
  }

  const dagTaken: Record<string, KanbanTaak[]> = Object.fromEntries(dagen.map((d) => [d.key, []]));
  for (const task of (weekTasks ?? []) as TaskMetToegewezene[]) {
    if (!task.datum || !dagTaken[task.datum]) continue;
    dagTaken[task.datum].push(naarKanbanTaak(task));
  }
  for (const dag of dagen) {
    dagTaken[dag.key].sort(
      (a, b) => PRIORITEIT_GEWICHT[a.prioriteit] - PRIORITEIT_GEWICHT[b.prioriteit],
    );
  }

  const backlogTaken: Record<TaskPrioriteit, KanbanTaak[]> = { hoog: [], normaal: [], laag: [] };
  for (const task of (backlogTasksRaw ?? []) as TaskMetToegewezene[]) {
    backlogTaken[task.prioriteit].push(naarKanbanTaak(task));
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-white">Werkzaamheden</h1>
      <p className="mb-6 text-white/80">Openstaande en afgevinkte werkzaamheden per week.</p>

      <TaskForm members={members ?? []} huidigeGebruikerId={userId} />

      <h2 className="mb-1 text-lg font-semibold">Weekoverzicht</h2>
      <p className="mb-3 text-sm text-muted">
        Sleep een werkzaamheid naar een andere dag, of terug naar de prioriteitenlijst
        hieronder als het deze week niet lukt.
      </p>
      <WeekNav
        weekStart={weekStart}
        weekEnd={weekEnd}
        prevWeekParam={format(addDays(weekStart, -7), "yyyy-MM-dd")}
        nextWeekParam={format(addDays(weekStart, 7), "yyyy-MM-dd")}
      />

      <KanbanBoard dagen={dagen} dagTaken={dagTaken} backlogTaken={backlogTaken} contacts={contacts ?? []} />
    </div>
  );
}
