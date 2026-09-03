"use client";

import { useActionState, useRef, useEffect } from "react";
import { createSubjectAction, createTopicAction, type ActionState } from "./actions";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = {};

export function SubjectTopicForm({
  subjects,
}: {
  subjects: { id: string; naam: string }[];
}) {
  const [subjectState, subjectFormAction] = useActionState(createSubjectAction, initialState);
  const [topicState, topicFormAction] = useActionState(createTopicAction, initialState);
  const subjectFormRef = useRef<HTMLFormElement>(null);
  const topicFormRef = useRef<HTMLFormElement>(null);
  const subjectSubmitting = useRef(false);
  const topicSubmitting = useRef(false);

  useEffect(() => {
    if (subjectSubmitting.current && !subjectState.error) subjectFormRef.current?.reset();
    subjectSubmitting.current = false;
  }, [subjectState]);

  useEffect(() => {
    if (topicSubmitting.current && !topicState.error) topicFormRef.current?.reset();
    topicSubmitting.current = false;
  }, [topicState]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <form
        ref={subjectFormRef}
        action={subjectFormAction}
        onSubmit={() => (subjectSubmitting.current = true)}
        className="flex items-end gap-2"
      >
        <div className="flex-1">
          <Field label="Nieuw vak" htmlFor="subject_naam">
            <Input id="subject_naam" name="naam" placeholder="Bijv. Techniek" required />
          </Field>
        </div>
        <SubmitButton variant="secondary">Toevoegen</SubmitButton>
      </form>

      <form
        ref={topicFormRef}
        action={topicFormAction}
        onSubmit={() => (topicSubmitting.current = true)}
        className="flex items-end gap-2"
      >
        <div className="w-32">
          <Field label="Vak" htmlFor="topic_subject_id">
            <Select id="topic_subject_id" name="subject_id" required defaultValue="">
              <option value="" disabled>
                Kies
              </option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.naam}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Nieuw onderwerp" htmlFor="topic_naam">
            <Input id="topic_naam" name="naam" placeholder="Bijv. 3D-printen" required />
          </Field>
        </div>
        <SubmitButton variant="secondary">Toevoegen</SubmitButton>
      </form>

      {subjectState.error && <p className="text-sm text-danger">{subjectState.error}</p>}
      {topicState.error && <p className="text-sm text-danger">{topicState.error}</p>}
    </div>
  );
}
