"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { huidigeDatumAmsterdam } from "@/lib/tijd";
import {
  getPersoonDetailAction,
  updatePersoonAction,
  addContactmomentAction,
  deleteContactmomentAction,
  uploadBijlageAction,
  deleteContactBijlageAction,
  deleteContactpersoonAction,
  type PersoonDetail,
  type ActionState,
} from "./actions";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

const initial: ActionState = {};

export function PersoonDetailModal({ persoonId, onClose }: { persoonId: string; onClose: () => void }) {
  const [details, setDetails] = useState<PersoonDetail | null>(null);
  const [, startLoad] = useTransition();
  const [saveState, saveAction] = useActionState(updatePersoonAction, initial);
  const [momentState, momentAction] = useActionState(addContactmomentAction, initial);
  const momentFormRef = useRef<HTMLFormElement>(null);
  const momentSubmitting = useRef(false);
  const [uploadState, uploadAction] = useActionState(uploadBijlageAction, initial);
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const uploadSubmitting = useRef(false);
  const [isDeletingPersoon, startDeleteTransition] = useTransition();
  const eersteLoad = useRef(true);

  function laad() {
    startLoad(async () => setDetails(await getPersoonDetailAction(persoonId)));
  }

  useEffect(() => {
    laad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persoonId]);

  useEffect(() => {
    if (eersteLoad.current) {
      eersteLoad.current = false;
      return;
    }
    if (!saveState.error) laad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveState]);

  useEffect(() => {
    if (momentSubmitting.current && !momentState.error) {
      momentFormRef.current?.reset();
      laad();
    }
    momentSubmitting.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momentState]);

  useEffect(() => {
    if (uploadSubmitting.current && !uploadState.error) {
      uploadFormRef.current?.reset();
      laad();
    }
    uploadSubmitting.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadState]);

  function verwijderMoment(id: string) {
    startLoad(async () => {
      await deleteContactmomentAction(id);
      await laad();
    });
  }
  function verwijderBijlage(id: string) {
    startLoad(async () => {
      await deleteContactBijlageAction(id);
      await laad();
    });
  }
  function verwijderPersoon() {
    if (!confirm(`"${details?.naam}" verwijderen?`)) return;
    startDeleteTransition(async () => {
      await deleteContactpersoonAction(persoonId);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{details?.naam ?? "…"}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground">
            ✕
          </button>
        </div>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
          <form action={saveAction} className="grid grid-cols-2 gap-3">
            <input type="hidden" name="id" value={persoonId} />
            <div className="col-span-2">
              <Field label="Naam" htmlFor="naam">
                <Input id="naam" name="naam" defaultValue={details?.naam ?? ""} required />
              </Field>
            </div>
            <Field label="Titel" htmlFor="titel">
              <Input id="titel" name="titel" defaultValue={details?.titel ?? ""} />
            </Field>
            <Field label="Geboortedatum" htmlFor="geboortedatum">
              <Input id="geboortedatum" name="geboortedatum" type="date" defaultValue={details?.geboortedatum ?? ""} />
            </Field>
            <Field label="E-mailadres" htmlFor="email">
              <Input id="email" name="email" type="email" defaultValue={details?.email ?? ""} />
            </Field>
            <Field label="Telefoonnummer" htmlFor="telefoon">
              <Input id="telefoon" name="telefoon" type="tel" defaultValue={details?.telefoon ?? ""} />
            </Field>
            {saveState.error && <p className="col-span-2 text-sm text-danger">{saveState.error}</p>}
            <div className="col-span-2">
              <SubmitButton className="py-1.5 text-sm">Opslaan</SubmitButton>
            </div>
          </form>

          <div>
            <h4 className="mb-2 text-sm font-semibold">Visitekaartje</h4>
            {details && details.bijlagen.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {details.bijlagen.map((b) => (
                  <div key={b.id} className="group relative">
                    <a href={b.url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={b.url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                    </a>
                    <button
                      type="button"
                      onClick={() => verwijderBijlage(b.id)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                      title="Verwijderen"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <form
              ref={uploadFormRef}
              action={uploadAction}
              onSubmit={() => (uploadSubmitting.current = true)}
              className="flex items-center gap-2"
            >
              <input type="hidden" name="contactpersoon_id" value={persoonId} />
              <input type="hidden" name="type" value="visitekaartje" />
              <input
                type="file"
                name="file"
                accept="image/*"
                className="text-xs text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-accent file:px-2.5 file:py-1.5 file:text-xs file:text-white"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-black/[.04]"
              >
                Toevoegen
              </button>
            </form>
            {uploadState.error && <p className="mt-1 text-xs text-danger">{uploadState.error}</p>}
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">Contactmomenten</h4>
            <form
              ref={momentFormRef}
              action={momentAction}
              onSubmit={() => (momentSubmitting.current = true)}
              className="mb-3 space-y-2"
            >
              <input type="hidden" name="contactpersoon_id" value={persoonId} />
              <div className="flex gap-2">
                <Input
                  name="datum"
                  type="date"
                  defaultValue={format(huidigeDatumAmsterdam(), "yyyy-MM-dd")}
                  className="w-40 py-1.5 text-sm"
                />
                <SubmitButton className="py-1.5 text-sm">Toevoegen</SubmitButton>
              </div>
              <Textarea name="notitie" rows={2} placeholder="Waar ging het contact over?" />
            </form>
            {momentState.error && <p className="mb-2 text-xs text-danger">{momentState.error}</p>}
            {details && details.momenten.length > 0 ? (
              <ul className="space-y-2">
                {details.momenten.map((m) => (
                  <li key={m.id} className="rounded-lg bg-black/[.03] p-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">
                        {format(new Date(`${m.datum}T00:00:00`), "d MMMM yyyy", { locale: nl })}
                      </p>
                      <button
                        type="button"
                        onClick={() => verwijderMoment(m.id)}
                        className="shrink-0 text-xs text-danger hover:underline"
                      >
                        Verwijderen
                      </button>
                    </div>
                    <p className="mt-0.5">{m.notitie}</p>
                    <p className="mt-0.5 text-xs text-muted">door {m.auteur}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nog geen contactmomenten.</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Sluiten
          </Button>
          <Button type="button" variant="danger" disabled={isDeletingPersoon} onClick={verwijderPersoon}>
            {isDeletingPersoon ? "Bezig…" : "Contactpersoon verwijderen"}
          </Button>
        </div>
      </div>
    </div>
  );
}
