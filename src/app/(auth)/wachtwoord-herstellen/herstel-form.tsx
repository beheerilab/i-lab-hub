"use client";

import { useActionState } from "react";
import { herstelWachtwoordAction, type ActionState } from "./actions";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = {};

export function HerstelForm() {
  const [state, formAction] = useActionState(herstelWachtwoordAction, initialState);

  return (
    <Card>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold">Nieuw wachtwoord</h1>
        <p className="mt-1 text-sm text-muted">Stel een nieuw wachtwoord in voor je account.</p>
      </div>

      <form action={formAction} className="space-y-4">
        <Field label="Nieuw wachtwoord" htmlFor="wachtwoord">
          <Input id="wachtwoord" name="wachtwoord" type="password" minLength={6} required autoFocus />
        </Field>
        <Field label="Bevestig nieuw wachtwoord" htmlFor="wachtwoord_bevestig">
          <Input
            id="wachtwoord_bevestig"
            name="wachtwoord_bevestig"
            type="password"
            minLength={6}
            required
          />
        </Field>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <SubmitButton size="lg" className="w-full">
          Wachtwoord instellen
        </SubmitButton>
      </form>
    </Card>
  );
}
