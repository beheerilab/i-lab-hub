"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { getContactBijlagenAction, uploadBijlageAction, deleteContactBijlageAction, type ActionState } from "./actions";
import { Select } from "@/components/ui/field";

const BIJLAGE_LABELS: Record<string, string> = {
  contract: "Contract",
  overig: "Overig",
  visitekaartje: "Visitekaartje", // oude bijlagen van vóór de persoon-koppeling
};
const initial: ActionState = {};

export function BijlagenBlok({ contactId }: { contactId: string }) {
  const [bijlagen, setBijlagen] = useState<{ id: string; type: string; url: string }[] | null>(null);
  const [, startLoad] = useTransition();
  const [uploadState, uploadAction] = useActionState(uploadBijlageAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const submitting = useRef(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  function laad() {
    startLoad(async () => setBijlagen(await getContactBijlagenAction(contactId)));
  }

  useEffect(() => {
    laad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  useEffect(() => {
    if (submitting.current && !uploadState.error) {
      formRef.current?.reset();
      setUploadOpen(false);
      laad();
    }
    submitting.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadState]);

  function verwijder(id: string) {
    setDeletingId(id);
    startLoad(async () => {
      await deleteContactBijlageAction(id);
      await laad();
      setDeletingId(null);
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Contract / overige bijlagen</h4>
        <button
          type="button"
          onClick={() => setUploadOpen((o) => !o)}
          className="text-sm text-accent underline"
        >
          {uploadOpen ? "Sluiten" : "+ Contract"}
        </button>
      </div>
      {bijlagen && bijlagen.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {bijlagen.map((b) => (
            <li key={b.id} className="flex items-center justify-between text-sm">
              <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                {BIJLAGE_LABELS[b.type] ?? b.type}
              </a>
              <button
                type="button"
                disabled={deletingId === b.id}
                onClick={() => verwijder(b.id)}
                className="text-xs text-danger hover:underline disabled:opacity-50"
              >
                Verwijderen
              </button>
            </li>
          ))}
        </ul>
      )}
      {uploadOpen && (
        <form
          ref={formRef}
          action={uploadAction}
          onSubmit={() => (submitting.current = true)}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="contact_id" value={contactId} />
          <Select name="type" defaultValue="contract" className="w-40 py-1.5 text-sm">
            <option value="contract">Contract</option>
            <option value="overig">Overig</option>
          </Select>
          <input
            type="file"
            name="file"
            className="text-xs text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-accent file:px-2.5 file:py-1.5 file:text-xs file:text-white"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-black/[.04]"
          >
            Uploaden
          </button>
        </form>
      )}
      {uploadState.error && <p className="mt-1 text-xs text-danger">{uploadState.error}</p>}
    </div>
  );
}
