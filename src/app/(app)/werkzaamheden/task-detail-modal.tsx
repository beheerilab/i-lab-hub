"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  getTaakDetailsAction,
  updateBeschrijvingAction,
  updateLeverancierAction,
  addNotitieAction,
  uploadBijlageAction,
  deleteBijlageAction,
  type ActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

type Details = {
  beschrijving: string | null;
  leverancierId: string | null;
  bijlagen: { id: string; url: string }[];
  gedeeldMetNamen: string[];
  notities: { id: string; tekst: string; auteur: string; wanneer: string }[];
};

const initial: ActionState = {};

export function TaskDetailModal({
  taskId,
  titel,
  datumLabel,
  deadlineLabel,
  toegewezenAanNaam,
  contacts,
  onClose,
}: {
  taskId: string;
  titel: string;
  datumLabel: string;
  deadlineLabel: string | null;
  toegewezenAanNaam: string;
  contacts: { id: string; naam: string }[];
  onClose: () => void;
}) {
  const [details, setDetails] = useState<Details | null>(null);
  const [, startLoad] = useTransition();
  const [beschrijving, setBeschrijving] = useState("");
  const [opslaanBeschrijving, startOpslaanBeschrijving] = useTransition();
  const [leverancierPending, startLeverancierTransition] = useTransition();
  const [uploadState, uploadAction] = useActionState(uploadBijlageAction, initial);
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const uploadSubmitting = useRef(false);
  const [notitieState, notitieAction] = useActionState(addNotitieAction, initial);
  const notitieFormRef = useRef<HTMLFormElement>(null);
  const notitieSubmitting = useRef(false);
  const [bijlageDeletingId, setBijlageDeletingId] = useState<string | null>(null);
  const beschrijvingGeladen = useRef(false);

  function laadDetails() {
    startLoad(async () => {
      const d = await getTaakDetailsAction(taskId);
      setDetails(d);
      // Beschrijving alleen bij de eerste load overnemen — anders overschrijft
      // een herlaad na bijv. een upload wat de gebruiker net aan het typen is.
      if (!beschrijvingGeladen.current) {
        setBeschrijving(d.beschrijving ?? "");
        beschrijvingGeladen.current = true;
      }
    });
  }

  useEffect(() => {
    laadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  useEffect(() => {
    if (uploadSubmitting.current && !uploadState.error) {
      uploadFormRef.current?.reset();
      laadDetails();
    }
    uploadSubmitting.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadState]);

  useEffect(() => {
    if (notitieSubmitting.current && !notitieState.error) {
      notitieFormRef.current?.reset();
      laadDetails();
    }
    notitieSubmitting.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notitieState]);

  function slaBeschrijvingOp() {
    startOpslaanBeschrijving(() => updateBeschrijvingAction(taskId, beschrijving));
  }

  function verwijderBijlage(id: string) {
    setBijlageDeletingId(id);
    startLoad(async () => {
      await deleteBijlageAction(id);
      await laadDetails();
      setBijlageDeletingId(null);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{titel}</h2>
            <p className="text-sm text-muted">
              {datumLabel}
              {deadlineLabel && ` · deadline ${deadlineLabel}`} · toegewezen aan{" "}
              {toegewezenAanNaam}
            </p>
            {details && details.gedeeldMetNamen.length > 0 && (
              <p className="text-xs text-muted">Gedeeld met: {details.gedeeldMetNamen.join(", ")}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground">
            ✕
          </button>
        </div>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Beschrijving</label>
            <Textarea
              rows={3}
              value={beschrijving}
              onChange={(e) => {
                beschrijvingGeladen.current = true;
                setBeschrijving(e.target.value);
              }}
              onBlur={slaBeschrijvingOp}
            />
            {opslaanBeschrijving && <p className="mt-1 text-xs text-muted">Opslaan…</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Leverancier / uitvoerder (optioneel)</label>
            <Select
              value={details?.leverancierId ?? ""}
              disabled={!details || leverancierPending}
              onChange={(e) => {
                const waarde = e.target.value;
                setDetails((d) => (d ? { ...d, leverancierId: waarde || null } : d));
                startLeverancierTransition(() => updateLeverancierAction(taskId, waarde));
              }}
            >
              <option value="">Geen</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.naam}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Bestand / foto</label>
            {details && details.bijlagen.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {details.bijlagen.map((b) => (
                  <div key={b.id} className="group relative">
                    <a href={b.url} target="_blank" rel="noopener noreferrer">
                      <img src={b.url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                    </a>
                    <button
                      type="button"
                      disabled={bijlageDeletingId === b.id}
                      onClick={() => verwijderBijlage(b.id)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                      title="Verwijderen"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <form
              ref={uploadFormRef}
              action={uploadAction}
              onSubmit={() => (uploadSubmitting.current = true)}
              className="flex items-center gap-2"
            >
              <input type="hidden" name="task_id" value={taskId} />
              <input
                type="file"
                name="file"
                className="text-xs text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-accent file:px-2.5 file:py-1.5 file:text-xs file:text-white"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-black/[.04]"
              >
                Toevoegen
              </button>
            </form>
            {uploadState.error && <p className="mt-1 text-xs text-danger">{uploadState.error}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Notities</label>
            <form
              ref={notitieFormRef}
              action={notitieAction}
              onSubmit={() => (notitieSubmitting.current = true)}
              className="mb-3 flex items-start gap-2"
            >
              <input type="hidden" name="task_id" value={taskId} />
              <Textarea name="tekst" rows={2} placeholder="Nieuwe notitie…" className="flex-1" />
              <SubmitButton className="shrink-0">Toevoegen</SubmitButton>
            </form>
            {notitieState.error && <p className="mb-2 text-xs text-danger">{notitieState.error}</p>}
            {details && details.notities.length > 0 ? (
              <ul className="space-y-2">
                {details.notities.map((n) => (
                  <li key={n.id} className="rounded-lg bg-black/[.03] p-2 text-sm">
                    <p>{n.tekst}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {n.auteur} · {n.wanneer}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nog geen notities.</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Sluiten
          </Button>
        </div>
      </div>
    </div>
  );
}
