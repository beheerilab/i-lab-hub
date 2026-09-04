"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { createContactAction, type ActionState } from "./actions";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = {};

export function ContactForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createContactAction, initialState);
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
        <h2 className="text-lg font-semibold">+ Contact toevoegen</h2>
        <span className="text-muted">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <form
          ref={formRef}
          action={formAction}
          onSubmit={() => (wasSubmitting.current = true)}
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Field label="Naam" htmlFor="naam">
            <Input id="naam" name="naam" required autoFocus />
          </Field>
          <Field label="Soort" htmlFor="soort">
            <Select id="soort" name="soort" defaultValue="leverancier" required>
              <option value="leverancier">Leverancier</option>
              <option value="uitvoerder">Uitvoerder</option>
            </Select>
          </Field>
          <Field label="Categorie (optioneel)" htmlFor="categorie">
            <Input id="categorie" name="categorie" placeholder="Bijv. Kantoorbenodigdheden, Loodgieter" />
          </Field>
          <Field label="Telefoonnummer (optioneel)" htmlFor="telefoon">
            <Input id="telefoon" name="telefoon" type="tel" />
          </Field>
          <Field label="E-mailadres (optioneel)" htmlFor="email">
            <Input id="email" name="email" type="email" />
          </Field>
          <Field label="Adres (optioneel)" htmlFor="adres">
            <Input id="adres" name="adres" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Waarvoor / notities (optioneel)" htmlFor="notities">
              <Textarea id="notities" name="notities" rows={2} />
            </Field>
          </div>

          {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
          <div className="sm:col-span-2">
            <SubmitButton size="lg">Contact toevoegen</SubmitButton>
          </div>
        </form>
      )}
    </Card>
  );
}
