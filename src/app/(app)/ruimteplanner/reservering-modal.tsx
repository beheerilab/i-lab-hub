"use client";

import { useActionState, useEffect, useTransition } from "react";
import {
  createReserveringAction,
  updateReserveringAction,
  deleteReserveringAction,
  type ActionState,
} from "./actions";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Reservering, RuimteplannerRoom } from "./types";

const initialState: ActionState = {};

export function ReserveringModal({
  rooms,
  datum,
  reservering,
  onClose,
}: {
  rooms: RuimteplannerRoom[];
  /** Standaarddatum voor een nieuwe reservering (de datum die nu bekeken wordt). */
  datum: string;
  reservering: Reservering | null;
  onClose: () => void;
}) {
  const isBestaand = Boolean(reservering);
  const [state, formAction] = useActionState(
    isBestaand ? updateReserveringAction : createReserveringAction,
    initialState,
  );
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (state === initialState) return;
    if (!state.error) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleDelete() {
    if (!reservering) return;
    if (!confirm(`Reservering van "${reservering.gastnaam}" verwijderen?`)) return;
    startDeleteTransition(async () => {
      await deleteReserveringAction(reservering.id);
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
        <h2 className="mb-4 text-lg font-semibold">
          {isBestaand ? "Reservering bewerken" : "Nieuwe reservering"}
        </h2>

        <form action={formAction} className="space-y-4">
          {isBestaand && <input type="hidden" name="id" value={reservering!.id} />}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Ruimte" htmlFor="lab_id">
              <Select id="lab_id" name="lab_id" defaultValue={reservering?.labId ?? rooms[0]?.id} required>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.naam}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Datum" htmlFor="datum">
              <Input
                id="datum"
                name="datum"
                type="date"
                defaultValue={reservering?.datum ?? datum}
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Begintijd" htmlFor="start_tijd">
              <Input
                id="start_tijd"
                name="start_tijd"
                type="time"
                step={300}
                defaultValue={reservering?.startTijd.slice(0, 5) ?? "09:00"}
                required
              />
            </Field>
            <Field label="Eindtijd" htmlFor="eind_tijd">
              <Input
                id="eind_tijd"
                name="eind_tijd"
                type="time"
                step={300}
                defaultValue={reservering?.eindTijd.slice(0, 5) ?? "10:00"}
                required
              />
            </Field>
          </div>

          <Field label="Gastnaam" htmlFor="gastnaam">
            <Input id="gastnaam" name="gastnaam" defaultValue={reservering?.gastnaam ?? ""} required autoFocus />
          </Field>

          <Field label="Aantal gasten" htmlFor="aantal_gasten">
            <Input
              id="aantal_gasten"
              name="aantal_gasten"
              type="number"
              min={0}
              defaultValue={reservering?.aantalGasten ?? 1}
              required
            />
          </Field>

          {state.error && <p className="text-sm text-danger">{state.error}</p>}

          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="flex gap-2">
              <SubmitButton>{isBestaand ? "Opslaan" : "Reserveren"}</SubmitButton>
              <Button type="button" variant="secondary" onClick={onClose}>
                Annuleren
              </Button>
            </div>
            {isBestaand && (
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
