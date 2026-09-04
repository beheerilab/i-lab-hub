"use client";

import { useActionState, useMemo, useRef, useState, useEffect } from "react";
import { createMaterialAction, type ActionState } from "./actions";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = {};

export function MaterialForm({
  subjects,
  topics,
}: {
  subjects: { id: string; naam: string }[];
  topics: { id: string; naam: string; subject_id: string }[];
}) {
  const [state, formAction] = useActionState(createMaterialAction, initialState);
  const [subjectId, setSubjectId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const wasSubmitting = useRef(false);

  const filteredTopics = useMemo(
    () => topics.filter((t) => t.subject_id === subjectId),
    [topics, subjectId],
  );

  useEffect(() => {
    if (wasSubmitting.current && !state.error) {
      formRef.current?.reset();
      setSubjectId("");
    }
    wasSubmitting.current = false;
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={() => (wasSubmitting.current = true)}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <Field label="Titel" htmlFor="titel">
        <Input id="titel" name="titel" required />
      </Field>
      <Field label="Tags (komma-gescheiden)" htmlFor="tags">
        <Input id="tags" name="tags" placeholder="bijv. arduino, sensoren" />
      </Field>

      <Field label="Vak" htmlFor="subject_id">
        <Select
          id="subject_id"
          name="subject_id"
          required
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
        >
          <option value="" disabled>
            Kies een vak
          </option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.naam}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Onderwerp" htmlFor="topic_id">
        <Select id="topic_id" name="topic_id" required disabled={!subjectId} defaultValue="">
          <option value="" disabled>
            {subjectId ? "Kies een onderwerp" : "Kies eerst een vak"}
          </option>
          {filteredTopics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.naam}
            </option>
          ))}
        </Select>
      </Field>

      <div className="sm:col-span-2">
        <Field label="Beschrijving (optioneel)" htmlFor="beschrijving">
          <Textarea id="beschrijving" name="beschrijving" rows={2} />
        </Field>
      </div>

      <Field label="Link (bijv. Google Drive)" htmlFor="link">
        <Input id="link" name="link" type="text" placeholder="https://…" />
      </Field>
      <Field label="Of upload een bestand" htmlFor="file">
        <input
          id="file"
          name="file"
          type="file"
          className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-white"
        />
      </Field>

      {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2">
        <SubmitButton size="lg">Materiaal toevoegen</SubmitButton>
      </div>
    </form>
  );
}
