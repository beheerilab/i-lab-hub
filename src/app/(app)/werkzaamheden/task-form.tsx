"use client";

import { useActionState, useRef, useEffect } from "react";
import { createTaskAction, type ActionState } from "./actions";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = {};

export function TaskForm({
  members,
  standaardDatum,
}: {
  members: { id: string; full_name: string | null }[];
  standaardDatum: string;
}) {
  const [state, formAction] = useActionState(createTaskAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (wasSubmitting.current && !state.error) formRef.current?.reset();
    wasSubmitting.current = false;
  }, [state]);

  return (
    <Card className="mb-6">
      <h2 className="mb-4 text-lg font-semibold">Nieuwe werkzaamheid</h2>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={() => (wasSubmitting.current = true)}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <Field label="Titel" htmlFor="titel">
          <Input id="titel" name="titel" required />
        </Field>
        <Field label="Datum" htmlFor="datum">
          <Input id="datum" name="datum" type="date" defaultValue={standaardDatum} required />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Beschrijving (optioneel)" htmlFor="beschrijving">
            <Textarea id="beschrijving" name="beschrijving" rows={2} />
          </Field>
        </div>
        <Field label="Toegewezen aan" htmlFor="toegewezen_aan">
          <Select id="toegewezen_aan" name="toegewezen_aan" required defaultValue="">
            <option value="" disabled>
              Kies een teamlid
            </option>
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

        {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
        <div className="sm:col-span-2">
          <SubmitButton size="lg">Werkzaamheid aanmaken</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
