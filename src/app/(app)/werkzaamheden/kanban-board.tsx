"use client";

import { useState, useTransition } from "react";
import { moveTaskToDayAction, moveTaskToBacklogAction } from "./actions";
import { TaskItem } from "./task-item";
import type { TaskPrioriteit } from "@/lib/supabase/database.types";

export type KanbanTaak = {
  id: string;
  titel: string;
  datum: string | null;
  datumLabel: string | null;
  beschrijving: string | null;
  toegewezenAanNaam: string;
  status: "open" | "afgevinkt";
  deadlineLabel: string | null;
  prioriteit: TaskPrioriteit;
  magAfvinken: boolean;
  magArchiveren: boolean;
  magSlepen: boolean;
};

const PRIORITEIT_KOLOMMEN: { prioriteit: TaskPrioriteit; label: string }[] = [
  { prioriteit: "hoog", label: "🔴 Hoog" },
  { prioriteit: "normaal", label: "Normaal" },
  { prioriteit: "laag", label: "🔵 Laag" },
];

export function KanbanBoard({
  dagen,
  dagTaken,
  backlogTaken,
  contacts,
}: {
  dagen: { key: string; label: string; isVandaag: boolean }[];
  dagTaken: Record<string, KanbanTaak[]>;
  backlogTaken: Record<TaskPrioriteit, KanbanTaak[]>;
  contacts: { id: string; naam: string }[];
}) {
  const [, startTransition] = useTransition();
  const [slependId, setSlependId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  function dropOpDag(dagKey: string) {
    setDragOverKey(null);
    if (!slependId) return;
    const id = slependId;
    setSlependId(null);
    startTransition(() => moveTaskToDayAction(id, dagKey));
  }

  function dropOpPrioriteit(prioriteit: TaskPrioriteit) {
    setDragOverKey(null);
    if (!slependId) return;
    const id = slependId;
    setSlependId(null);
    startTransition(() => moveTaskToBacklogAction(id, prioriteit));
  }

  function Kaarten({ taken }: { taken: KanbanTaak[] }) {
    if (taken.length === 0) return <p className="text-sm text-muted">Geen werkzaamheden</p>;
    return (
      <div className="space-y-2">
        {taken.map((taak) => (
          <TaskItem
            key={taak.id}
            id={taak.id}
            titel={taak.titel}
            datum={taak.datum}
            datumLabel={taak.datumLabel}
            beschrijving={taak.beschrijving}
            toegewezenAanNaam={taak.toegewezenAanNaam}
            status={taak.status}
            deadlineLabel={taak.deadlineLabel}
            prioriteit={taak.prioriteit}
            magAfvinken={taak.magAfvinken}
            magArchiveren={taak.magArchiveren}
            contacts={contacts}
            draggable={taak.magSlepen}
            onDragStart={() => setSlependId(taak.id)}
            onDragEnd={() => setSlependId(null)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row">
        {dagen.map(({ key, label, isVandaag }) => (
          <div
            key={key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverKey(key);
            }}
            onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
            onDrop={(e) => {
              e.preventDefault();
              dropOpDag(key);
            }}
            className={`min-h-[90px] min-w-0 rounded-xl p-1.5 transition-colors sm:flex-1 ${
              isVandaag ? "sm:flex-[1.6]" : ""
            } ${dragOverKey === key ? "bg-accent/10 ring-2 ring-accent/40" : ""}`}
          >
            <h3
              className={`mb-2 text-sm font-semibold ${isVandaag ? "text-accent-hover" : "text-muted"}`}
            >
              {label}
              {isVandaag ? " · vandaag" : ""}
            </h3>
            <Kaarten taken={dagTaken[key] ?? []} />
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold">Jouw werkzaamheden</h2>
        <p className="mb-3 text-sm text-muted">
          Verzamellijst op prioriteit — sleep een klus naar een dag hierboven om ze in te
          plannen, of terug hierheen als het deze week niet lukt.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PRIORITEIT_KOLOMMEN.map(({ prioriteit, label }) => (
            <div
              key={prioriteit}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverKey(prioriteit);
              }}
              onDragLeave={() => setDragOverKey((k) => (k === prioriteit ? null : k))}
              onDrop={(e) => {
                e.preventDefault();
                dropOpPrioriteit(prioriteit);
              }}
              className={`min-h-[90px] rounded-xl p-1.5 transition-colors ${
                dragOverKey === prioriteit ? "bg-accent/10 ring-2 ring-accent/40" : ""
              }`}
            >
              <h3 className="mb-2 text-sm font-semibold text-muted">{label}</h3>
              <Kaarten taken={backlogTaken[prioriteit] ?? []} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
