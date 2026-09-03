"use client";

import { useTransition } from "react";
import { deleteManualAction } from "./actions";

export function ManualCard({
  id,
  apparaatNaam,
  locatie,
  instructieTekst,
  videoLink,
  fileUrl,
  magVerwijderen,
}: {
  id: string;
  apparaatNaam: string;
  locatie: string | null;
  instructieTekst: string | null;
  videoLink: string | null;
  fileUrl: string | null;
  magVerwijderen: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3 className="font-semibold">{apparaatNaam}</h3>
        {magVerwijderen && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => deleteManualAction(id))}
            className="shrink-0 text-sm text-danger hover:underline disabled:opacity-50"
          >
            Verwijderen
          </button>
        )}
      </div>
      {locatie && <p className="mb-1 text-sm text-muted">📍 {locatie}</p>}
      {instructieTekst && <p className="mb-2 text-sm">{instructieTekst}</p>}
      <div className="flex flex-wrap gap-3">
        {videoLink && (
          <a href={videoLink} target="_blank" rel="noopener noreferrer" className="text-sm text-accent underline">
            Instructievideo
          </a>
        )}
        {fileUrl && (
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent underline">
            PDF openen
          </a>
        )}
      </div>
    </div>
  );
}
