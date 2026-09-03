"use client";

import { useTransition } from "react";
import { deleteMaterialAction } from "./actions";

export function MaterialCard({
  id,
  titel,
  beschrijving,
  vakNaam,
  onderwerpNaam,
  tags,
  link,
  fileUrl,
  magVerwijderen,
}: {
  id: string;
  titel: string;
  beschrijving: string | null;
  vakNaam: string;
  onderwerpNaam: string;
  tags: string[];
  link: string | null;
  fileUrl: string | null;
  magVerwijderen: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3 className="font-semibold">{titel}</h3>
        {magVerwijderen && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => deleteMaterialAction(id))}
            className="shrink-0 text-sm text-danger hover:underline disabled:opacity-50"
          >
            Verwijderen
          </button>
        )}
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5 text-xs">
        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent-hover">{vakNaam}</span>
        <span className="rounded-full bg-black/[.04] px-2 py-0.5 text-muted">{onderwerpNaam}</span>
        {tags.map((tag) => (
          <span key={tag} className="rounded-full bg-black/[.04] px-2 py-0.5 text-muted">
            #{tag}
          </span>
        ))}
      </div>
      {beschrijving && <p className="mb-2 text-sm text-muted">{beschrijving}</p>}
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-accent underline">
          Open link
        </a>
      )}
      {fileUrl && (
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent underline">
          Bestand downloaden
        </a>
      )}
    </div>
  );
}
