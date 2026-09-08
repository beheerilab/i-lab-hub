"use client";

import { useState, useTransition } from "react";
import { moveTaskToDayAction } from "./actions";
import { TaskItem } from "./task-item";
import type { TaskPrioriteit } from "@/lib/supabase/database.types";

export type KanbanTaak = {
  id: string;
  titel: string;
  datum: string;
  datumLabel: string;
  beschrijving: string | null;
  toegewezenAanNaam: string;
  status: "open" | "afgevinkt";
  deadlineLabel: string | null;
  prioriteit: TaskPrioriteit;
  magAfvinken: boolean;
  magArchiveren: boolean;
  magSlepen: boolean;
};

export function KanbanBoard({
  dagen,
  taken,
  contacts,
}: {
  dagen: { key: string; label: string }[];
  taken: Record<string, KanbanTaak[]>;
  contacts: { id: string; naam: string }[];
}) {
  const [, startTransition] = useTransition();
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [slependId, setSlependId] = useState<string | null>(null);

  function drop(dagKey: string) {
    setDragOverKey(null);
    if (!slependId) return;
    const id = slependId;
    setSlependId(null);
    startTransition(() => moveTaskToDayAction(id, dagKey));
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
      {dagen.map(({ key, label }) => {
        const dagTaken = taken[key] ?? [];
        return (
          <div
            key={key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverKey(key);
            }}
            onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
            onDrop={(e) => {
              e.preventDefault();
              drop(key);
            }}
            className={`min-h-[90px] rounded-xl p-1.5 transition-colors ${
              dragOverKey === key ? "bg-accent/10 ring-2 ring-accent/40" : ""
            }`}
          >
            <h3 className="mb-2 text-sm font-semibold text-muted">{label}</h3>
            <div className="space-y-2">
              {dagTaken.length === 0 ? (
                <p className="text-sm text-muted">Geen werkzaamheden</p>
              ) : (
                dagTaken.map((taak) => (
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
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
