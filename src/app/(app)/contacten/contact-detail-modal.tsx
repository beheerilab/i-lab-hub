"use client";

import type { ContactSoort } from "@/lib/supabase/database.types";
import { ContactDetail } from "./contact-detail";

const SOORT_LABELS: Record<string, string> = {
  leverancier: "Leverancier",
  uitvoerder: "Uitvoerder",
};

export function ContactDetailModal({
  contactId,
  naam,
  soort,
  adres,
  zoekwoorden,
  magVerwijderen,
  onClose,
}: {
  contactId: string;
  naam: string;
  soort: ContactSoort;
  adres: string | null;
  zoekwoorden: string[];
  magVerwijderen: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{naam}</h2>
            <span className="mt-0.5 inline-block rounded-full bg-accent-dark/10 px-2 py-0.5 text-xs text-accent-dark">
              {SOORT_LABELS[soort] ?? soort}
            </span>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground">
            ✕
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto pr-1">
          <ContactDetail
            contactId={contactId}
            adres={adres}
            soort={soort}
            zoekwoorden={zoekwoorden}
            magVerwijderen={magVerwijderen}
          />
        </div>
      </div>
    </div>
  );
}
