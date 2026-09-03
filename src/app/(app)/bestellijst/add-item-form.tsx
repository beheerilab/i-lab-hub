"use client";

import { useActionState, useRef, useEffect } from "react";
import { addOrderItemAction, type ActionState } from "./actions";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = {};

export function AddItemForm() {
  const [state, formAction] = useActionState(addOrderItemAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (wasSubmitting.current && !state.error) {
      formRef.current?.reset();
    }
    wasSubmitting.current = false;
  }, [state]);

  return (
    <Card className="mb-6">
      <h2 className="mb-4 text-lg font-semibold">Item toevoegen</h2>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={() => (wasSubmitting.current = true)}
        className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]"
      >
        <Field label="Naam item" htmlFor="item_naam">
          <Input id="item_naam" name="item_naam" required autoComplete="off" />
        </Field>
        <Field label="Aantal" htmlFor="aantal">
          <Input id="aantal" name="aantal" type="number" min={1} defaultValue={1} required />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notitie of link (optioneel)" htmlFor="notitie">
            <Textarea id="notitie" name="notitie" rows={2} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Link (optioneel)" htmlFor="link">
            <Input id="link" name="link" type="url" placeholder="https://…" />
          </Field>
        </div>
        {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
        <div className="sm:col-span-2">
          <SubmitButton size="lg">Toevoegen aan bestellijst</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
