"use client";

import { useState, useTransition } from "react";
import { toggleTaskAction, archiveTaskAction } from "./actions";
import { TaskDetailModal } from "./task-detail-modal";

export function TaskItem({
  id,
  titel,
  datum,
  datumLabel,
  beschrijving,
  toegewezenAanNaam,
  status,
  deadlineLabel,
  magAfvinken,
  magArchiveren,
  contacts,
}: {
  id: string;
  titel: string;
  datum: string;
  datumLabel: string;
  beschrijving: string | null;
  toegewezenAanNaam: string;
  status: "open" | "afgevinkt";
  deadlineLabel?: string | null;
  magAfvinken: boolean;
  magArchiveren: boolean;
  contacts: { id: string; naam: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [openDetail, setOpenDetail] = useState(false);
  const afgevinkt = status === "afgevinkt";

  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={afgevinkt}
          disabled={!magAfvinken || isPending}
          onChange={() => startTransition(() => toggleTaskAction(id))}
          className="mt-1 h-5 w-5 shrink-0 accent-accent disabled:opacity-40"
        />
        <button
          type="button"
          onClick={() => setOpenDetail(true)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className={`font-medium ${afgevinkt ? "text-muted line-through" : ""}`}>{titel}</div>
            {deadlineLabel && !afgevinkt && (
              <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">
                ⏰ {deadlineLabel}
              </span>
            )}
          </div>
          {beschrijving && (
            <p className={`text-sm text-muted ${afgevinkt ? "line-through" : ""}`}>{beschrijving}</p>
          )}
          <p className="mt-0.5 text-xs text-muted">Toegewezen aan {toegewezenAanNaam}</p>
        </button>
        {magArchiveren && afgevinkt && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => archiveTaskAction(id))}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-black/[.04] disabled:opacity-50"
          >
            Archiveer
          </button>
        )}
      </div>
      {openDetail && (
        <TaskDetailModal
          taskId={id}
          titel={titel}
          datum={datum}
          datumLabel={datumLabel}
          deadlineLabel={deadlineLabel ?? null}
          toegewezenAanNaam={toegewezenAanNaam}
          contacts={contacts}
          onClose={() => setOpenDetail(false)}
        />
      )}
    </div>
  );
}
