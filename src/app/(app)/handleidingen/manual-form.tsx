"use client";

import { useActionState, useRef, useEffect } from "react";
import { createManualAction, type ActionState } from "./actions";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = {};

export function ManualForm() {
  const [state, formAction] = useActionState(createManualAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (wasSubmitting.current && !state.error) formRef.current?.reset();
    wasSubmitting.current = false;
  }, [state]);

  return (
    <Card className="mb-6">
      <h2 className="mb-4 text-lg font-semibold">Handleiding toevoegen</h2>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={() => (wasSubmitting.current = true)}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <Field label="Apparaatnaam" htmlFor="apparaat_naam">
          <Input id="apparaat_naam" name="apparaat_naam" required />
        </Field>
        <Field label="Locatie in het lab" htmlFor="locatie">
          <Input id="locatie" name="locatie" placeholder="Bijv. Werkbank 2" />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Korte instructietekst" htmlFor="instructie_tekst">
            <Textarea id="instructie_tekst" name="instructie_tekst" rows={3} />
          </Field>
        </div>

        <Field label="Link naar instructievideo (optioneel)" htmlFor="video_link">
          <Input id="video_link" name="video_link" type="url" placeholder="https://…" />
        </Field>
        <Field label="Of upload een PDF (optioneel)" htmlFor="file">
          <input
            id="file"
            name="file"
            type="file"
            accept="application/pdf"
            className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-white"
          />
        </Field>

        {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
        <div className="sm:col-span-2">
          <SubmitButton size="lg">Handleiding toevoegen</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
