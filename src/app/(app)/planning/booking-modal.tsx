"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { saveBookingAction, deleteBookingAction, type ActionState } from "./actions";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import {
  ACTIVITEIT_LABELS,
  BIJEENKOMST_TYPE_OPTIES,
  LES_TYPE_OPTIES,
  type SelectedSlot,
} from "./types";
import type { ActiviteitType, BoekingCategorie } from "@/lib/supabase/database.types";

const initialState: ActionState = {};

export function BookingModal({
  slot,
  subjects,
  onClose,
}: {
  slot: SelectedSlot;
  subjects: { id: string; naam: string }[];
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(saveBookingAction, initialState);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [categorie, setCategorie] = useState<BoekingCategorie>(
    slot.booking?.categorie ?? "les",
  );
  const [typeActiviteit, setTypeActiviteit] = useState<ActiviteitType>(
    slot.booking?.type_activiteit ?? "les",
  );

  const isLes = categorie === "les";
  const typeOpties = isLes ? LES_TYPE_OPTIES : BIJEENKOMST_TYPE_OPTIES;
  const huidigVak = slot.booking?.vak;
  const vakOpties =
    huidigVak && !subjects.some((s) => s.naam === huidigVak)
      ? [{ id: "huidig", naam: huidigVak }, ...subjects]
      : subjects;

  useEffect(() => {
    if (state === initialState) return;
    if (!state.error) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleDelete() {
    if (!slot.booking) return;
    if (!confirm("Deze boeking verwijderen?")) return;
    startDeleteTransition(async () => {
      await deleteBookingAction(slot.booking!.id);
      onClose();
    });
  }

  function wijzigCategorie(nieuw: BoekingCategorie) {
    setCategorie(nieuw);
    setTypeActiviteit(nieuw === "les" ? "les" : "evenement");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-semibold">{slot.labNaam}</h2>
        <p className="mb-4 text-sm text-muted">
          {slot.booking ? "Boeking bewerken" : "Nieuwe boeking"}
        </p>

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-border p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => wijzigCategorie("les")}
            className={`rounded-md py-2 transition-colors ${
              isLes ? "bg-accent text-white" : "text-muted"
            }`}
          >
            Les
          </button>
          <button
            type="button"
            onClick={() => wijzigCategorie("bijeenkomst")}
            className={`rounded-md py-2 transition-colors ${
              !isLes ? "bg-accent text-white" : "text-muted"
            }`}
          >
            Vergadering/evenement
          </button>
        </div>

        <form action={formAction} className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <input type="hidden" name="id" value={slot.booking?.id ?? ""} />
          <input type="hidden" name="lab_id" value={slot.labId} />
          <input type="hidden" name="datum" value={slot.datum} />
          <input type="hidden" name="categorie" value={categorie} />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Begintijd" htmlFor="start_tijd">
              <Input
                id="start_tijd"
                name="start_tijd"
                type="time"
                step={300}
                defaultValue={slot.booking?.start_tijd.slice(0, 5) ?? slot.startTijd}
                required
              />
            </Field>
            <Field label="Eindtijd" htmlFor="eind_tijd">
              <Input
                id="eind_tijd"
                name="eind_tijd"
                type="time"
                step={300}
                defaultValue={slot.booking?.eind_tijd.slice(0, 5) ?? slot.eindTijd}
                required
              />
            </Field>
          </div>

          {isLes ? (
            <Field label="Vak/les" htmlFor="vak">
              <Select id="vak" name="vak" defaultValue={slot.booking?.vak ?? ""} required>
                <option value="" disabled>
                  Kies een vak
                </option>
                {vakOpties.map((s) => (
                  <option key={s.id} value={s.naam}>
                    {s.naam}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Onderwerp / naam bijeenkomst" htmlFor="vak">
              <Input id="vak" name="vak" defaultValue={slot.booking?.vak} required autoFocus />
            </Field>
          )}

          <Field label={isLes ? "School" : "Organisatie"} htmlFor="school">
            <Input id="school" name="school" defaultValue={slot.booking?.school} required />
          </Field>
          <Field label={isLes ? "Docent" : "Aanvrager"} htmlFor="docent">
            <Input id="docent" name="docent" defaultValue={slot.booking?.docent} required />
          </Field>
          <Field label={isLes ? "Type activiteit" : "Soort bijeenkomst"} htmlFor="type_activiteit">
            <Select
              id="type_activiteit"
              name="type_activiteit"
              value={typeActiviteit}
              onChange={(e) => setTypeActiviteit(e.target.value as ActiviteitType)}
              required
            >
              {typeOpties.map((optie) => (
                <option key={optie} value={optie}>
                  {ACTIVITEIT_LABELS[optie]}
                </option>
              ))}
            </Select>
          </Field>
          {!isLes && typeActiviteit === "anders" && (
            <Field label="Wat voor soort bijeenkomst?" htmlFor="type_activiteit_anders">
              <Input
                id="type_activiteit_anders"
                name="type_activiteit_anders"
                defaultValue={slot.booking?.type_activiteit_anders ?? ""}
                required
              />
            </Field>
          )}
          <Field label={isLes ? "Aantal leerlingen" : "Aantal gasten"} htmlFor="aantal_leerlingen">
            <Input
              id="aantal_leerlingen"
              name="aantal_leerlingen"
              type="number"
              min={0}
              defaultValue={slot.booking?.aantal_leerlingen ?? 0}
              required
            />
          </Field>
          <Field label="Bijzonderheden (optioneel)" htmlFor="bijzonderheden">
            <Textarea
              id="bijzonderheden"
              name="bijzonderheden"
              rows={2}
              defaultValue={slot.booking?.bijzonderheden ?? ""}
            />
          </Field>

          {state.error && <p className="text-sm text-danger">{state.error}</p>}

          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="flex gap-2">
              <SubmitButton>{slot.booking ? "Opslaan" : "Boeken"}</SubmitButton>
              <Button type="button" variant="secondary" onClick={onClose}>
                Annuleren
              </Button>
            </div>
            {slot.booking && (
              <Button type="button" variant="danger" disabled={isDeleting} onClick={handleDelete}>
                {isDeleting ? "Bezig…" : "Verwijderen"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
