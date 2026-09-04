"use client";

import { useActionState } from "react";
import { updatePasswordAction, type ActionState } from "./actions";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = {};

export function WachtwoordForm() {
  const [state, formAction] = useActionState(updatePasswordAction, initialState);

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <Field label="Nieuw wachtwoord" htmlFor="wachtwoord">
        <Input id="wachtwoord" name="wachtwoord" type="password" minLength={6} required />
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
      {state.success && (
        <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent-hover">
          Wachtwoord gewijzigd.
        </p>
      )}
      <SubmitButton size="lg">Wachtwoord wijzigen</SubmitButton>
    </form>
  );
}
