"use client";

import { useActionState, useEffect, useTransition } from "react";
import { updateSleutelAction, deleteSleutelAction, type ActionState } from "./actions";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/database.types";

type Sleutel = Database["public"]["Tables"]["sleutels"]["Row"];

const initialState: ActionState = {};

export function SleutelDetailModal({
  sleutel,
  magBeheren,
  onClose,
}: {
  sleutel: Sleutel;
  magBeheren: boolean;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(updateSleutelAction, initialState);
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (state === initialState) return;
    if (!state.error) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleDelete() {
    if (!confirm(`"${sleutel.naam}" verwijderen uit het sleuteloverzicht?`)) return;
    startDeleteTransition(async () => {
      await deleteSleutelAction(sleutel.id);
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{sleutel.naam}</h2>
            {sleutel.tagnummer && (
              <p className="text-sm text-muted">Tag {sleutel.tagnummer}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground">
            ✕
          </button>
        </div>

        <form
          action={formAction}
          className="max-h-[65vh] space-y-4 overflow-y-auto pr-1"
        >
          <input type="hidden" name="id" value={sleutel.id} />

          <Field label="Naam" htmlFor="naam">
            <Input id="naam" name="naam" defaultValue={sleutel.naam} disabled={!magBeheren} required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Functie" htmlFor="functie">
              <Input id="functie" name="functie" defaultValue={sleutel.functie ?? ""} disabled={!magBeheren} />
            </Field>
            <Field label="Sleutelnummer" htmlFor="sleutelnummer">
              <Input
                id="sleutelnummer"
                name="sleutelnummer"
                defaultValue={sleutel.sleutelnummer ?? ""}
                disabled={!magBeheren}
              />
            </Field>
          </div>
          <Field label="Tagnummer" htmlFor="tagnummer">
            <Input
              id="tagnummer"
              name="tagnummer"
              defaultValue={sleutel.tagnummer ?? ""}
              placeholder="Vaak gelijk aan het sleutelnummer"
              disabled={!magBeheren}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Telefoonnummer" htmlFor="telefoon">
              <Input id="telefoon" name="telefoon" type="tel" defaultValue={sleutel.telefoon ?? ""} disabled={!magBeheren} />
            </Field>
            <Field label="E-mailadres" htmlFor="email">
              <Input id="email" name="email" type="email" defaultValue={sleutel.email ?? ""} disabled={!magBeheren} />
            </Field>
          </div>
          <Field label="Adres" htmlFor="adres">
            <Input id="adres" name="adres" defaultValue={sleutel.adres ?? ""} disabled={!magBeheren} />
          </Field>
          <Field label="Opmerkingen" htmlFor="opmerkingen">
            <Textarea
              id="opmerkingen"
              name="opmerkingen"
              rows={2}
              defaultValue={sleutel.opmerkingen ?? ""}
              disabled={!magBeheren}
            />
          </Field>

          {state.error && <p className="text-sm text-danger">{state.error}</p>}

          {magBeheren && (
            <div className="flex items-center justify-between gap-2 pt-2">
              <SubmitButton>Wijzigingen opslaan</SubmitButton>
              <Button type="button" variant="danger" disabled={isDeleting} onClick={handleDelete}>
                {isDeleting ? "Bezig…" : "Verwijderen"}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
