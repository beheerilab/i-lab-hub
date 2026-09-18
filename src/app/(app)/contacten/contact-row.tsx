"use client";

import { useState, useTransition } from "react";
import {
  getContactHierarchieAction,
  updateContactSoortAction,
  updateZoekwoordenAction,
  deleteContactAction,
  type AfdelingMetPersonen,
} from "./actions";
import { AfdelingenBlok } from "./afdelingen-blok";
import { BijlagenBlok } from "./bijlagen-blok";
import { Select, Input } from "@/components/ui/field";
import { SOORT_LABELS } from "./soort";
import type { ContactSoort } from "@/lib/supabase/database.types";

type Contact = {
  id: string;
  naam: string;
  soort: ContactSoort;
  categorie: string | null;
  telefoon: string | null;
  email: string | null;
  adres: string | null;
  notities: string | null;
  zoekwoorden: string[];
};

export function ContactRow({ contact, magBeheren }: { contact: Contact; magBeheren: boolean }) {
  const [open, setOpen] = useState(false);
  const [afdelingen, setAfdelingen] = useState<AfdelingMetPersonen[] | null>(null);
  const [, startLoad] = useTransition();
  const [huidigSoort, setHuidigSoort] = useState(contact.soort);
  const [soortPending, startSoortTransition] = useTransition();
  const [zoekwoordenOpen, setZoekwoordenOpen] = useState(false);
  const [zoekwoordenPending, startZoekwoordenTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  function laadHierarchie() {
    startLoad(async () => setAfdelingen(await getContactHierarchieAction(contact.id)));
  }

  function toggle() {
    if (!open && afdelingen === null) laadHierarchie();
    setOpen((o) => !o);
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-black/[.02]"
      >
        <span className="w-4 shrink-0 text-muted">{open ? "▾" : "▸"}</span>
        <span className="min-w-0 flex-1 truncate text-base font-semibold">{contact.naam}</span>
        <span className="shrink-0 rounded-full bg-accent-dark/10 px-2.5 py-1 text-xs font-medium text-accent-dark">
          {SOORT_LABELS[contact.soort]}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-border bg-black/[.015] px-4 py-4 pl-11">
          <div className="flex flex-wrap items-center gap-4">
            {magBeheren && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">Soort:</span>
                <Select
                  value={huidigSoort}
                  disabled={soortPending}
                  onChange={(e) => {
                    const nieuw = e.target.value as ContactSoort;
                    setHuidigSoort(nieuw);
                    startSoortTransition(() => updateContactSoortAction(contact.id, nieuw));
                  }}
                  className="w-40 py-1.5 text-sm"
                >
                  {Object.entries(SOORT_LABELS).map(([waarde, label]) => (
                    <option key={waarde} value={waarde}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {contact.telefoon && (
              <a href={`tel:${contact.telefoon}`} className="text-sm text-accent underline">
                📞 {contact.telefoon}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="text-sm text-accent underline">
                ✉️ {contact.email}
              </a>
            )}
          </div>

          {contact.adres && (
            <p className="text-sm">
              <span className="text-muted">Adres: </span>
              {contact.adres}
            </p>
          )}
          {contact.notities && <p className="text-sm text-muted">{contact.notities}</p>}

          <div>
            <button
              type="button"
              onClick={() => setZoekwoordenOpen((o) => !o)}
              className="text-sm text-accent underline"
            >
              🔎 Zoekwoorden{contact.zoekwoorden.length > 0 ? ` (${contact.zoekwoorden.length})` : ""}
            </button>
            {zoekwoordenOpen && (
              <div className="mt-2 max-w-sm">
                <Input
                  defaultValue={contact.zoekwoorden.join(", ")}
                  placeholder="bijv. loodgieter, sanitair, riolering"
                  disabled={!magBeheren || zoekwoordenPending}
                  onBlur={(e) => {
                    if (!magBeheren) return;
                    startZoekwoordenTransition(() => updateZoekwoordenAction(contact.id, e.target.value));
                  }}
                  className="py-1.5 text-sm"
                />
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">Afdelingen</h4>
            {afdelingen === null ? (
              <p className="text-sm text-muted">Laden…</p>
            ) : (
              <AfdelingenBlok contactId={contact.id} afdelingen={afdelingen} onRefresh={laadHierarchie} />
            )}
          </div>

          <BijlagenBlok contactId={contact.id} />

          {magBeheren && (
            <div className="border-t border-border pt-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  if (
                    confirm(`"${contact.naam}" volledig verwijderen, inclusief alle afdelingen en contactpersonen?`)
                  ) {
                    startDeleteTransition(() => deleteContactAction(contact.id));
                  }
                }}
                className="text-sm text-danger hover:underline disabled:opacity-50"
              >
                Instantie verwijderen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
