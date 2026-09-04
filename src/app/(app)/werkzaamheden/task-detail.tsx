"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { getTaakDetailsAction, uploadBijlageAction, deleteBijlageAction, type ActionState } from "./actions";

type Details = { bijlagen: { id: string; url: string }[]; gedeeldMetNamen: string[] };

const initialUploadState: ActionState = {};

export function TaskDetail({ taskId }: { taskId: string }) {
  const [details, setDetails] = useState<Details | null>(null);
  const [isLoading, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [uploadState, uploadAction] = useActionState(uploadBijlageAction, initialUploadState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasSubmitting = useRef(false);

  function laadDetails() {
    startTransition(async () => {
      setDetails(await getTaakDetailsAction(taskId));
    });
  }

  useEffect(() => {
    laadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  useEffect(() => {
    if (wasSubmitting.current && !uploadState.error) {
      formRef.current?.reset();
      laadDetails();
    }
    wasSubmitting.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadState]);

  function handleDelete(bijlageId: string) {
    startDeleteTransition(async () => {
      await deleteBijlageAction(bijlageId);
      laadDetails();
    });
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      {details?.gedeeldMetNamen && details.gedeeldMetNamen.length > 0 && (
        <p className="mb-2 text-xs text-muted">Ook gedeeld met: {details.gedeeldMetNamen.join(", ")}</p>
      )}

      {isLoading && !details ? (
        <p className="text-sm text-muted">Laden…</p>
      ) : (
        <>
          {details && details.bijlagen.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {details.bijlagen.map((b) => (
                <div key={b.id} className="group relative">
                  <a href={b.url} target="_blank" rel="noopener noreferrer">
                    <img src={b.url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                  </a>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleDelete(b.id)}
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
            ref={formRef}
            action={uploadAction}
            onSubmit={() => (wasSubmitting.current = true)}
            className="flex items-center gap-2"
          >
            <input type="hidden" name="task_id" value={taskId} />
            <input
              type="file"
              name="file"
              accept="image/*"
              className="text-xs text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-accent file:px-2.5 file:py-1.5 file:text-xs file:text-white"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-black/[.04]"
            >
              Foto toevoegen
            </button>
          </form>
          {uploadState.error && <p className="mt-1 text-xs text-danger">{uploadState.error}</p>}
        </>
      )}
    </div>
  );
}
