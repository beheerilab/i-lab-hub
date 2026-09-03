"use client";

import { useActionState, useEffect, useTransition } from "react";
import { saveBookingAction, deleteBookingAction, type ActionState } from "./actions";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import type { Booking } from "./planning-grid";

export type SelectedCell = {
  labId: string;
  labNaam: string;
  uur: number;
  booking: Booking | null;
};

const initialState: ActionState = {};

export function BookingModal({
  cell,
  datum,
  onClose,
}: {
  cell: SelectedCell;
  datum: string;
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
    if (!cell.booking) return;
    if (!confirm("Deze boeking verwijderen?")) return;
    startDeleteTransition(async () => {
      await deleteBookingAction(cell.booking!.id);
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
        <h2 className="mb-1 text-lg font-semibold">
          {cell.labNaam} · {cell.uur}:00–{cell.uur + 1}:00
        </h2>
        <p className="mb-4 text-sm text-muted">
          {cell.booking ? "Boeking bewerken" : "Nieuwe boeking"}
        </p>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={cell.booking?.id ?? ""} />
          <input type="hidden" name="lab_id" value={cell.labId} />
          <input type="hidden" name="datum" value={datum} />
          <input type="hidden" name="start_uur" value={cell.uur} />

          <Field label="Vak" htmlFor="vak">
            <Input id="vak" name="vak" defaultValue={cell.booking?.vak} required autoFocus />
          </Field>
          <Field label="Klas / groep" htmlFor="klas_groep">
            <Input
              id="klas_groep"
              name="klas_groep"
              defaultValue={cell.booking?.klas_groep}
              required
            />
          </Field>
          <Field label="Type activiteit" htmlFor="type_activiteit">
            <Select
              id="type_activiteit"
              name="type_activiteit"
              defaultValue={cell.booking?.type_activiteit ?? "les"}
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
              defaultValue={cell.booking?.aantal_leerlingen ?? 0}
              required
            />
          </Field>

          {state.error && <p className="text-sm text-danger">{state.error}</p>}

          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="flex gap-2">
              <SubmitButton>{cell.booking ? "Opslaan" : "Boeken"}</SubmitButton>
              <Button type="button" variant="secondary" onClick={onClose}>
                Annuleren
              </Button>
            </div>
            {cell.booking && (
              <Button
                type="button"
                variant="danger"
                disabled={isDeleting}
                onClick={handleDelete}
              >
                {isDeleting ? "Bezig…" : "Verwijderen"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
