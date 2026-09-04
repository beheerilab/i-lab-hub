"use client";

import { useTransition } from "react";
import { deleteContactAction } from "./actions";

export function ContactCard({
  id,
  naam,
  categorie,
  telefoon,
  email,
  notities,
  magVerwijderen,
}: {
  id: string;
  naam: string;
  categorie: string | null;
  telefoon: string | null;
  email: string | null;
  notities: string | null;
  magVerwijderen: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{naam}</h3>
          {categorie && (
            <span className="mt-0.5 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent-hover">
              {categorie}
            </span>
          )}
        </div>
        {magVerwijderen && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => deleteContactAction(id))}
            className="shrink-0 text-sm text-danger hover:underline disabled:opacity-50"
          >
            Verwijderen
          </button>
        )}
      </div>
      {notities && <p className="mb-2 text-sm text-muted">{notities}</p>}
      <div className="flex flex-wrap gap-3">
        {telefoon && (
          <a href={`tel:${telefoon}`} className="text-sm text-accent underline">
            📞 {telefoon}
          </a>
        )}
        {email && (
          <a href={`mailto:${email}`} className="text-sm text-accent underline">
            ✉️ {email}
          </a>
        )}
      </div>
    </div>
  );
}
