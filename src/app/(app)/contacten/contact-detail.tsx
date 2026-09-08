"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  getContactDetailsAction,
  addContactpersoonAction,
  deleteContactpersoonAction,
  uploadContactBijlageAction,
  deleteContactBijlageAction,
  updateContactSoortAction,
  updateZoekwoordenAction,
  deleteContactAction,
  type ActionState,
} from "./actions";
import type { ContactSoort } from "@/lib/supabase/database.types";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

type Details = {
  personen: { id: string; naam: string; functie: string | null; telefoon: string | null; email: string | null }[];
  bijlagen: { id: string; type: string; url: string }[];
};

const BIJLAGE_LABELS: Record<string, string> = {
  visitekaartje: "Visitekaartje",
  contract: "Contract",
  overig: "Overig",
};

const initial: ActionState = {};

export function ContactDetail({
  contactId,
  adres,
  soort,
  zoekwoorden,
  magVerwijderen,
}: {
  contactId: string;
  adres: string | null;
  soort: ContactSoort;
  zoekwoorden: string[];
  magVerwijderen: boolean;
}) {
  const [details, setDetails] = useState<Details | null>(null);
  const [, startLoad] = useTransition();
  const [isDeletingId, setDeletingId] = useState<string | null>(null);
  const [isDeletingContact, startDeleteContactTransition] = useTransition();
  const [huidigSoort, setHuidigSoort] = useState(soort);
  const [soortPending, startSoortTransition] = useTransition();
  const [zoekwoordenOpen, setZoekwoordenOpen] = useState(false);
  const [zoekwoordenPending, startZoekwoordenTransition] = useTransition();

  const [persoonState, persoonAction] = useActionState(addContactpersoonAction, initial);
  const persoonFormRef = useRef<HTMLFormElement>(null);
  const persoonSubmitting = useRef(false);

  const [uploadState, uploadAction] = useActionState(uploadContactBijlageAction, initial);
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const uploadSubmitting = useRef(false);

  function laadDetails() {
    startLoad(async () => {
      setDetails(await getContactDetailsAction(contactId));
    });
  }

  useEffect(() => {
    laadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  useEffect(() => {
    if (persoonSubmitting.current && !persoonState.error) {
      persoonFormRef.current?.reset();
      laadDetails();
    }
    persoonSubmitting.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persoonState]);

  useEffect(() => {
    if (uploadSubmitting.current && !uploadState.error) {
      uploadFormRef.current?.reset();
      laadDetails();
    }
    uploadSubmitting.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadState]);

  function verwijderPersoon(id: string) {
    setDeletingId(id);
    startLoad(async () => {
      await deleteContactpersoonAction(id);
      await laadDetails();
      setDeletingId(null);
    });
  }

  function verwijderBijlage(id: string) {
    setDeletingId(id);
    startLoad(async () => {
      await deleteContactBijlageAction(id);
      await laadDetails();
      setDeletingId(null);
    });
  }

  return (
    <div className="mt-3 space-y-4 border-t border-border pt-3">
      {magVerwijderen && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Soort:</span>
          <Select
            value={huidigSoort}
            disabled={soortPending}
            onChange={(e) => {
              const nieuw = e.target.value as ContactSoort;
              setHuidigSoort(nieuw);
              startSoortTransition(() => updateContactSoortAction(contactId, nieuw));
            }}
            className="w-40 py-1.5 text-sm"
          >
            <option value="leverancier">Leverancier</option>
            <option value="uitvoerder">Uitvoerder</option>
          </Select>
        </div>
      )}

      {adres && (
        <p className="text-sm">
          <span className="text-muted">Adres: </span>
          {adres}
        </p>
      )}

      <div>
        <button
          type="button"
          onClick={() => setZoekwoordenOpen((o) => !o)}
          className="text-sm text-accent underline"
        >
          🔎 Zoekwoorden{zoekwoorden.length > 0 ? ` (${zoekwoorden.length})` : ""}
        </button>
        {zoekwoordenOpen && (
          <div className="mt-2">
            <Input
              defaultValue={zoekwoorden.join(", ")}
              placeholder="bijv. loodgieter, sanitair, riolering"
              disabled={!magVerwijderen || zoekwoordenPending}
              onBlur={(e) => {
                if (!magVerwijderen) return;
                startZoekwoordenTransition(() => updateZoekwoordenAction(contactId, e.target.value));
              }}
              className="py-1.5 text-sm"
            />
            <p className="mt-1 text-xs text-muted">Komma-gescheiden — hiermee is dit contact ook op andere termen te vinden.</p>
          </div>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold">Contactpersonen</h4>
        {details && details.personen.length > 0 && (
          <ul className="mb-2 space-y-1.5">
            {details.personen.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span>
                  {p.naam}
                  {p.functie && <span className="text-muted"> — {p.functie}</span>}
                  {p.telefoon && (
                    <>
                      {" · "}
                      <a href={`tel:${p.telefoon}`} className="text-accent underline">
                        {p.telefoon}
                      </a>
                    </>
                  )}
                </span>
                <button
                  type="button"
                  disabled={isDeletingId === p.id}
                  onClick={() => verwijderPersoon(p.id)}
                  className="text-xs text-danger hover:underline disabled:opacity-50"
                >
                  Verwijderen
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          ref={persoonFormRef}
          action={persoonAction}
          onSubmit={() => (persoonSubmitting.current = true)}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="contact_id" value={contactId} />
          <div className="w-32">
            <Field label="Naam" htmlFor={`persoon_naam_${contactId}`}>
              <Input id={`persoon_naam_${contactId}`} name="naam" required className="py-1.5 text-sm" />
            </Field>
          </div>
          <div className="w-28">
            <Field label="Functie" htmlFor={`persoon_functie_${contactId}`}>
              <Input id={`persoon_functie_${contactId}`} name="functie" className="py-1.5 text-sm" />
            </Field>
          </div>
          <div className="w-32">
            <Field label="Telefoon" htmlFor={`persoon_tel_${contactId}`}>
              <Input id={`persoon_tel_${contactId}`} name="telefoon" type="tel" className="py-1.5 text-sm" />
            </Field>
          </div>
          <SubmitButton className="mb-0 py-1.5 text-sm">Toevoegen</SubmitButton>
        </form>
        {persoonState.error && <p className="mt-1 text-xs text-danger">{persoonState.error}</p>}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold">Visitekaartje / contract</h4>
        {details && details.bijlagen.length > 0 && (
          <ul className="mb-2 space-y-1.5">
            {details.bijlagen.map((b) => (
              <li key={b.id} className="flex items-center justify-between text-sm">
                <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                  {BIJLAGE_LABELS[b.type] ?? b.type}
                </a>
                <button
                  type="button"
                  disabled={isDeletingId === b.id}
                  onClick={() => verwijderBijlage(b.id)}
                  className="text-xs text-danger hover:underline disabled:opacity-50"
                >
                  Verwijderen
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          ref={uploadFormRef}
          action={uploadAction}
          onSubmit={() => (uploadSubmitting.current = true)}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="contact_id" value={contactId} />
          <Select name="type" defaultValue="visitekaartje" className="w-40 py-1.5 text-sm">
            <option value="visitekaartje">Visitekaartje</option>
            <option value="contract">Contract</option>
            <option value="overig">Overig</option>
          </Select>
          <input
            type="file"
            name="file"
            className="text-xs text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-accent file:px-2.5 file:py-1.5 file:text-xs file:text-white"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-black/[.04]"
          >
            Uploaden
          </button>
        </form>
        {uploadState.error && <p className="mt-1 text-xs text-danger">{uploadState.error}</p>}
      </div>

      {magVerwijderen && (
        <div className="border-t border-border pt-3">
          <button
            type="button"
            disabled={isDeletingContact}
            onClick={() => {
              if (confirm("Dit contact volledig verwijderen?")) {
                startDeleteContactTransition(() => deleteContactAction(contactId));
              }
            }}
            className="text-sm text-danger hover:underline disabled:opacity-50"
          >
            Contact verwijderen
          </button>
        </div>
      )}
    </div>
  );
}
