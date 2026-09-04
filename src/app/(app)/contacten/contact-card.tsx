"use client";

import { useState } from "react";
import type { ContactSoort } from "@/lib/supabase/database.types";
import { ContactDetailModal } from "./contact-detail-modal";

const SOORT_LABELS: Record<string, string> = {
  leverancier: "Leverancier",
  uitvoerder: "Uitvoerder",
};

export function ContactCard({
  id,
  naam,
  soort,
  categorie,
  telefoon,
  email,
  notities,
  adres,
  magVerwijderen,
}: {
  id: string;
  naam: string;
  soort: ContactSoort;
  categorie: string | null;
  telefoon: string | null;
  email: string | null;
  notities: string | null;
  adres: string | null;
  magVerwijderen: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <button type="button" onClick={() => setOpen(true)} className="w-full text-left">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">{naam}</h3>
            <div className="mt-0.5 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-accent-dark/10 px-2 py-0.5 text-xs text-accent-dark">
                {SOORT_LABELS[soort] ?? soort}
              </span>
              {categorie && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent-hover">
                  {categorie}
                </span>
              )}
            </div>
          </div>
          <span className="text-muted" title="Meer details">›</span>
        </div>
        {notities && <p className="mb-1 text-sm text-muted">{notities}</p>}
      </button>
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
      {open && (
        <ContactDetailModal
          contactId={id}
          naam={naam}
          soort={soort}
          adres={adres}
          magVerwijderen={magVerwijderen}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
