"use client";

import { useActionState, useEffect, useTransition } from "react";
import { saveBookingAction, deleteBookingAction, type ActionState } from "./actions";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import type { SelectedSlot } from "./types";

const initialState: ActionState = {};

export function BookingModal({
  slot,
  onClose,
}: {
  slot: SelectedSlot;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(saveBookingAction, initialState);
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (state === initialState) return;
    if (!state.error) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleDelete() {
    if (!slot.booking) return;
    if (!confirm("Deze boeking verwijderen?")) return;
    startDeleteTransition(async () => {
      await deleteBookingAction(slot.booking!.id);
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-semibold">{slot.labNaam}</h2>
        <p className="mb-4 text-sm text-muted">
          {slot.booking ? "Boeking bewerken" : "Nieuwe boeking"}
        </p>

        <form action={formAction} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <input type="hidden" name="id" value={slot.booking?.id ?? ""} />
          <input type="hidden" name="lab_id" value={slot.labId} />
          <input type="hidden" name="datum" value={slot.datum} />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Begintijd" htmlFor="start_tijd">
              <Input
                id="start_tijd"
                name="start_tijd"
                type="time"
                step={300}
                defaultValue={slot.booking?.start_tijd.slice(0, 5) ?? slot.startTijd}
                required
              />
            </Field>
            <Field label="Eindtijd" htmlFor="eind_tijd">
              <Input
                id="eind_tijd"
                name="eind_tijd"
                type="time"
                step={300}
                defaultValue={slot.booking?.eind_tijd.slice(0, 5) ?? slot.eindTijd}
                required
              />
            </Field>
          </div>

          <Field label="Vak / les" htmlFor="vak">
            <Input id="vak" name="vak" defaultValue={slot.booking?.vak} required autoFocus />
          </Field>
          <Field label="School" htmlFor="school">
            <Input id="school" name="school" defaultValue={slot.booking?.school} required />
          </Field>
          <Field label="Docent / wie plant het in" htmlFor="docent">
            <Input id="docent" name="docent" defaultValue={slot.booking?.docent} required />
          </Field>
          <Field label="Type activiteit" htmlFor="type_activiteit">
            <Select
              id="type_activiteit"
              name="type_activiteit"
              defaultValue={slot.booking?.type_activiteit ?? "les"}
              required
            >
              <option value="les">Les</option>
              <option value="project">Project</option>
              <option value="vrij_gebruik">Vrij gebruik</option>
              <option value="extern_bezoek">Extern bezoek</option>
            </Select>
          </Field>
          <Field label="Aantal leerlingen" htmlFor="aantal_leerlingen">
            <Input
              id="aantal_leerlingen"
              name="aantal_leerlingen"
              type="number"
              min={0}
              defaultValue={slot.booking?.aantal_leerlingen ?? 0}
              required
            />
          </Field>
          <Field label="Bijzonderheden (optioneel)" htmlFor="bijzonderheden">
            <Textarea
              id="bijzonderheden"
              name="bijzonderheden"
              rows={2}
              defaultValue={slot.booking?.bijzonderheden ?? ""}
            />
          </Field>

          {state.error && <p className="text-sm text-danger">{state.error}</p>}

          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="flex gap-2">
              <SubmitButton>{slot.booking ? "Opslaan" : "Boeken"}</SubmitButton>
              <Button type="button" variant="secondary" onClick={onClose}>
                Annuleren
              </Button>
            </div>
            {slot.booking && (
              <Button type="button" variant="danger" disabled={isDeleting} onClick={handleDelete}>
                {isDeleting ? "Bezig…" : "Verwijderen"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
