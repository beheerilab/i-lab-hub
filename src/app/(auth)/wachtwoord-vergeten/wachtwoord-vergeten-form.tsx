"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, type ActionState } from "./actions";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = {};

export function WachtwoordVergetenForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialState);

  return (
    <Card>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold">Wachtwoord vergeten</h1>
        <p className="mt-1 text-sm text-muted">
          Vul je e-mailadres in, dan sturen we je een link om een nieuw wachtwoord in te
          stellen.
        </p>
      </div>

      {state.success ? (
        <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent-hover">
          Check je mailbox — als dit e-mailadres bekend is, ontvang je binnen enkele minuten
          een link.
        </p>
      ) : (
        <form action={formAction} className="space-y-4">
          <Field label="E-mailadres" htmlFor="email">
            <Input id="email" name="email" type="email" required autoFocus />
          </Field>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <SubmitButton size="lg" className="w-full">
            Verstuur herstellink
          </SubmitButton>
        </form>
      )}
    </Card>
  );
}
