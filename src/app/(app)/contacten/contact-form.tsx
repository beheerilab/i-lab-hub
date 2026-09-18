"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { createContactAction, type ActionState } from "./actions";
import { SOORT_LABELS, SOORT_OPTIES } from "./soort";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ContactSoort } from "@/lib/supabase/database.types";

const initialState: ActionState = {};

export function ContactForm() {
  const [open, setOpen] = useState(false);
  const [soort, setSoort] = useState<ContactSoort>("leverancier");
  const [zoekwoordenOpen, setZoekwoordenOpen] = useState(false);
  const [state, formAction] = useActionState(createContactAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (wasSubmitting.current && !state.error) {
      formRef.current?.reset();
      setOpen(false);
      setZoekwoordenOpen(false);
      setSoort("leverancier");
    }
    wasSubmitting.current = false;
  }, [state]);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="shrink-0">
        + Nieuw contact
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Nieuw contact</h2>
                <p className="text-sm text-muted">
                  Alleen de instantie zelf — contactpersonen voeg je er straks aan toe.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form
              ref={formRef}
              action={formAction}
              onSubmit={() => (wasSubmitting.current = true)}
              className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
            >
              <input type="hidden" name="soort" value={soort} />
              <div>
                <p className="mb-1.5 text-sm font-medium">Doelgroep</p>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                  {SOORT_OPTIES.map((optie) => (
                    <button
                      key={optie}
                      type="button"
                      onClick={() => setSoort(optie)}
                      className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                        soort === optie
                          ? "border-accent bg-accent text-white"
                          : "border-border text-muted hover:bg-black/[.03]"
                      }`}
                    >
                      {SOORT_LABELS[optie]}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Naam" htmlFor="naam">
                <Input id="naam" name="naam" required autoFocus />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Categorie (optioneel)" htmlFor="categorie">
                  <Input id="categorie" name="categorie" placeholder="Bijv. Kantoorbenodigdheden" />
                </Field>
                <Field label="Adres (optioneel)" htmlFor="adres">
                  <Input id="adres" name="adres" />
                </Field>
                <Field label="Telefoonnummer (optioneel)" htmlFor="telefoon">
                  <Input id="telefoon" name="telefoon" type="tel" />
                </Field>
                <Field label="E-mailadres (optioneel)" htmlFor="email">
                  <Input id="email" name="email" type="email" />
                </Field>
              </div>
              <Field label="Waarvoor / notities (optioneel)" htmlFor="notities">
                <Textarea id="notities" name="notities" rows={2} />
              </Field>

              <div>
                <button
                  type="button"
                  onClick={() => setZoekwoordenOpen((o) => !o)}
                  className="text-sm text-accent underline"
                >
                  {zoekwoordenOpen ? "Zoekwoorden verbergen" : "🔎 Zoekwoorden toevoegen (optioneel)"}
                </button>
                {zoekwoordenOpen && (
                  <div className="mt-2">
                    <Field label="Zoekwoorden (komma-gescheiden)" htmlFor="zoekwoorden">
                      <Input
                        id="zoekwoorden"
                        name="zoekwoorden"
                        placeholder="bijv. loodgieter, sanitair, riolering"
                      />
                    </Field>
                  </div>
                )}
              </div>

              {state.error && <p className="text-sm text-danger">{state.error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Annuleren
                </Button>
                <SubmitButton>Contact toevoegen</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
