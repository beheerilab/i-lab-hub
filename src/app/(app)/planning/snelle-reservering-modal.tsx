"use client";

import { useActionState, useEffect, useState } from "react";
import { saveBookingAction, type ActionState } from "./actions";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Room } from "./types";

const initialState: ActionState = {};

export function SnelleReserveringModal({
  rooms,
  datum,
  onClose,
}: {
  rooms: Room[];
  datum: string;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(saveBookingAction, initialState);
  const [gastnaam, setGastnaam] = useState("");

  useEffect(() => {
    if (state === initialState) return;
    if (!state.error) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-semibold">Snelle reservering</h2>
        <p className="mb-4 text-sm text-muted">
          Voor een gast/bezoeker die kort een ruimte nodig heeft — vul later eventueel meer
          details in via de boeking zelf.
        </p>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="categorie" value="bijeenkomst" />
          <input type="hidden" name="type_activiteit" value="evenement" />
          <input type="hidden" name="vak" value={gastnaam} />
          <input type="hidden" name="school" value={gastnaam} />
          <input type="hidden" name="docent" value={gastnaam} />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Ruimte" htmlFor="lab_id">
              <Select id="lab_id" name="lab_id" defaultValue={rooms[0]?.id} required>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.naam}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Datum" htmlFor="snel_datum">
              <Input id="snel_datum" name="datum" type="date" defaultValue={datum} required />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Begintijd" htmlFor="snel_start">
              <Input id="snel_start" name="start_tijd" type="time" step={300} defaultValue="09:00" required />
            </Field>
            <Field label="Eindtijd" htmlFor="snel_eind">
              <Input id="snel_eind" name="eind_tijd" type="time" step={300} defaultValue="10:00" required />
            </Field>
          </div>

          <Field label="Naam gast" htmlFor="gastnaam">
            <Input
              id="gastnaam"
              value={gastnaam}
              onChange={(e) => setGastnaam(e.target.value)}
              required
              autoFocus
            />
          </Field>

          <Field label="Aantal gasten" htmlFor="aantal_leerlingen">
            <Input id="aantal_leerlingen" name="aantal_leerlingen" type="number" min={0} defaultValue={1} required />
          </Field>

          {state.error && <p className="text-sm text-danger">{state.error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuleren
            </Button>
            <SubmitButton>Reserveren</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
