"use client";

import { useActionState, useRef, useEffect } from "react";
import { createTaskAction, type ActionState } from "./actions";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = {};

export function TaskForm({
  members,
}: {
  members: { id: string; full_name: string | null }[];
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
      <h2 className="mb-4 text-lg font-semibold">Nieuwe taak</h2>
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
          <Input id="datum" name="datum" type="date" required />
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

        {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
        <div className="sm:col-span-2">
          <SubmitButton size="lg">Taak aanmaken</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
