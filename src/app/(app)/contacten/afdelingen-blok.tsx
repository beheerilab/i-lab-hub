"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  addAfdelingAction,
  deleteAfdelingAction,
  addContactpersoonAction,
  type AfdelingMetPersonen,
  type ActionState,
} from "./actions";
import { PersoonDetailModal } from "./persoon-detail-modal";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

const initial: ActionState = {};

function AfdelingRij({
  afdeling,
  onRefresh,
}: {
  afdeling: AfdelingMetPersonen;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [persoonId, setPersoonId] = useState<string | null>(null);
  const [persoonState, persoonAction] = useActionState(addContactpersoonAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const submitting = useRef(false);

  useEffect(() => {
    if (submitting.current && !persoonState.error) {
      formRef.current?.reset();
      onRefresh();
    }
    submitting.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persoonState]);

  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="w-4 shrink-0 text-sm text-muted">{open ? "▾" : "▸"}</span>
          <span className="min-w-0 truncate text-sm font-medium">{afdeling.naam}</span>
          <span className="shrink-0 text-xs text-muted">({afdeling.contactpersonen.length})</span>
        </button>
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => {
            if (confirm(`Afdeling "${afdeling.naam}" verwijderen, inclusief alle contactpersonen erin?`)) {
              startDeleteTransition(async () => {
                await deleteAfdelingAction(afdeling.id);
                onRefresh();
              });
            }
          }}
          className="shrink-0 rounded-lg px-1.5 py-0.5 text-xs text-danger hover:bg-danger/10 disabled:opacity-50"
        >
          ✕
        </button>
      </div>

      {open && (
        <div className="space-y-2 border-t border-border px-3 py-2">
          {afdeling.contactpersonen.length === 0 ? (
            <p className="text-xs text-muted">Nog geen contactpersonen.</p>
          ) : (
            <ul className="space-y-1">
              {afdeling.contactpersonen.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setPersoonId(p.id)}
                    className="flex w-full items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent/5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">
                        <span className="font-medium">{p.naam}</span>
                        {p.titel && <span className="text-muted"> — {p.titel}</span>}
                      </span>
                      {p.tags.length > 0 && (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {p.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-hover"
                            >
                              {tag}
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-right text-xs text-muted">
                      <span className="block truncate">{p.email || p.telefoon || ""}</span>
                      <span className="block">
                        {p.laatsteMoment
                          ? `laatst: ${format(new Date(`${p.laatsteMoment}T00:00:00`), "d MMM", { locale: nl })}`
                          : "geen contact gelogd"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            ref={formRef}
            action={persoonAction}
            onSubmit={() => (submitting.current = true)}
            className="flex flex-wrap items-end gap-2 pt-1"
          >
            <input type="hidden" name="afdeling_id" value={afdeling.id} />
            <Input name="naam" placeholder="Naam" required className="w-28 py-1.5 text-sm" />
            <Input name="titel" placeholder="Titel" className="w-28 py-1.5 text-sm" />
            <Input name="email" type="email" placeholder="E-mail" className="w-36 py-1.5 text-sm" />
            <Input name="telefoon" type="tel" placeholder="Telefoon" className="w-32 py-1.5 text-sm" />
            <SubmitButton className="py-1.5 text-xs">Toevoegen</SubmitButton>
          </form>
          {persoonState.error && <p className="text-xs text-danger">{persoonState.error}</p>}
        </div>
      )}

      {persoonId && (
        <PersoonDetailModal
          persoonId={persoonId}
          onClose={() => {
            setPersoonId(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

export function AfdelingenBlok({
  contactId,
  afdelingen,
  onRefresh,
}: {
  contactId: string;
  afdelingen: AfdelingMetPersonen[];
  onRefresh: () => void;
}) {
  const [naam, setNaam] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      {afdelingen.length === 0 ? (
        <p className="text-sm text-muted">Nog geen afdelingen.</p>
      ) : (
        <div className="space-y-2">
          {afdelingen.map((a) => (
            <AfdelingRij key={a.id} afdeling={a} onRefresh={onRefresh} />
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const n = naam.trim();
          if (!n) return;
          startTransition(async () => {
            await addAfdelingAction(contactId, n);
            setNaam("");
            onRefresh();
          });
        }}
        className="flex gap-2"
      >
        <Input
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          placeholder='Nieuwe afdeling, bijv. "Facilitair"'
          className="max-w-xs py-1.5 text-sm"
        />
        <Button type="submit" disabled={isPending} className="shrink-0 px-3 py-1.5 text-xs">
          {isPending ? "Bezig…" : "Toevoegen"}
        </Button>
      </form>
    </div>
  );
}
