"use client";

import { useActionState, useState } from "react";
import { resetPasswordAction, type ResetWachtwoordState } from "./actions";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ResetWachtwoordState = {};

function genereerWachtwoord() {
  return Math.random().toString(36).slice(-5) + Math.random().toString(36).slice(-5);
}

export function ResetPasswordModal({
  profileId,
  naam,
  onClose,
}: {
  profileId: string;
  naam: string;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);
  const [wachtwoord, setWachtwoord] = useState("");

  if (state.succes) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="mb-2 text-lg font-semibold">Wachtwoord gewijzigd</h2>
          <p className="mb-4 text-sm text-muted">
            Het nieuwe wachtwoord van {naam} is:
            <br />
            <span className="font-mono text-base font-semibold text-foreground">{wachtwoord}</span>
            <br />
            Geef dit persoonlijk door — het wordt hierna nergens meer getoond.
          </p>
          <Button type="button" onClick={onClose}>
            Sluiten
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-semibold">Wachtwoord resetten</h2>
        <p className="mb-4 text-sm text-muted">Stel een nieuw wachtwoord in voor {naam}.</p>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="profile_id" value={profileId} />
          <Field label="Nieuw wachtwoord (min. 8 tekens)" htmlFor="wachtwoord">
            <div className="flex gap-2">
              <Input
                id="wachtwoord"
                name="wachtwoord"
                type="text"
                minLength={8}
                required
                autoFocus
                value={wachtwoord}
                onChange={(e) => setWachtwoord(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setWachtwoord(genereerWachtwoord())}
                className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-black/[.04]"
              >
                Genereer
              </button>
            </div>
          </Field>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuleren
            </Button>
            <SubmitButton>Opslaan</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
