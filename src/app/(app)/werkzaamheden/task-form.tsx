"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { createTaskAction, type ActionState } from "./actions";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = {};

export function TaskForm({
  members,
  huidigeGebruikerId,
}: {
  members: { id: string; full_name: string | null }[];
  huidigeGebruikerId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createTaskAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (wasSubmitting.current && !state.error) {
      formRef.current?.reset();
      setOpen(false);
    }
    wasSubmitting.current = false;
  }, [state]);

  return (
    <Card className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 className="text-lg font-semibold">+ Nieuw item</h2>
        <span className="text-muted">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <form
          ref={formRef}
          action={formAction}
          onSubmit={() => (wasSubmitting.current = true)}
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Field label="Titel" htmlFor="titel">
            <Input id="titel" name="titel" required autoFocus />
          </Field>
          <div>
            <Field label="Datum (optioneel)" htmlFor="datum">
              <Input id="datum" name="datum" type="date" />
            </Field>
            <p className="mt-1 text-xs text-muted">Leeg = komt in de prioriteitenlijst hieronder.</p>
          </div>
          <div className="sm:col-span-2">
            <Field label="Beschrijving (optioneel)" htmlFor="beschrijving">
              <Textarea id="beschrijving" name="beschrijving" rows={2} />
            </Field>
          </div>
          <Field label="Toegewezen aan" htmlFor="toegewezen_aan">
            <Select id="toegewezen_aan" name="toegewezen_aan" required defaultValue={huidigeGebruikerId}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || "Naamloos"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Deadline (optioneel)" htmlFor="deadline_op">
            <Input id="deadline_op" name="deadline_op" type="datetime-local" />
          </Field>
          <Field label="Prioriteit" htmlFor="prioriteit">
            <Select id="prioriteit" name="prioriteit" defaultValue="normaal">
              <option value="hoog">🔴 Hoog</option>
              <option value="normaal">Normaal</option>
              <option value="laag">🔵 Laag</option>
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <p className="mb-1.5 block text-sm font-medium">Delen met (optioneel)</p>
            <p className="mb-2 text-xs text-muted">
              Standaard zie jij, de toegewezen collega en de beheerder dit item. Vink extra
              collega&apos;s aan om het ook met hen te delen.
            </p>
            <div className="flex flex-wrap gap-3">
              {members
                .filter((m) => m.id !== huidigeGebruikerId)
                .map((m) => (
                  <label key={m.id} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" name="gedeeld_met" value={m.id} className="h-4 w-4 accent-accent" />
                    {m.full_name || "Naamloos"}
                  </label>
                ))}
            </div>
          </div>

          {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
          <div className="sm:col-span-2">
            <SubmitButton size="lg">Item aanmaken</SubmitButton>
          </div>
        </form>
      )}
    </Card>
  );
}
