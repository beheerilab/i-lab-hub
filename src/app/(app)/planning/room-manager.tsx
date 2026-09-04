"use client";

import { useActionState, useRef, useEffect, useState, useTransition } from "react";
import {
  createRoomAction,
  renameRoomAction,
  toggleRoomActiveAction,
  deleteRoomAction,
  type RoomActionState,
} from "./actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

type Room = { id: string; naam: string; volgorde: number; actief: boolean };

const initialState: RoomActionState = {};

function RoomRow({ room }: { room: Room }) {
  const [isPending, startTransition] = useTransition();
  const [naam, setNaam] = useState(room.naam);
  const [editing, setEditing] = useState(false);

  function saveName() {
    setEditing(false);
    if (naam.trim() && naam !== room.naam) {
      startTransition(() => renameRoomAction(room.id, naam.trim()));
    } else {
      setNaam(room.naam);
    }
  }

  return (
    <li className="flex items-center gap-2 border-b border-border py-2 last:border-none">
      {editing ? (
        <Input
          autoFocus
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => e.key === "Enter" && saveName()}
          className="max-w-52 py-1"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`flex-1 truncate text-left ${!room.actief ? "text-muted line-through" : ""}`}
        >
          {room.naam}
        </button>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(() => toggleRoomActiveAction(room.id, !room.actief))
        }
        className="shrink-0 rounded-lg px-2 py-1 text-xs text-muted hover:bg-black/[.04] disabled:opacity-50"
      >
        {room.actief ? "Verberg" : "Activeer"}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (confirm(`Ruimte "${room.naam}" verwijderen? Boekingen erin gaan mee weg.`)) {
            startTransition(() => deleteRoomAction(room.id));
          }
        }}
        className="shrink-0 rounded-lg px-2 py-1 text-xs text-danger hover:bg-danger/10 disabled:opacity-50"
      >
        Verwijderen
      </button>
    </li>
  );
}

export function RoomManager({ rooms }: { rooms: Room[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createRoomAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (wasSubmitting.current && !state.error) formRef.current?.reset();
    wasSubmitting.current = false;
  }, [state]);

  return (
    <Card className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 className="text-lg font-semibold">Ruimtes beheren</h2>
        <span className="text-muted">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-4">
          <form
            ref={formRef}
            action={formAction}
            onSubmit={() => (wasSubmitting.current = true)}
            className="mb-4 flex gap-2"
          >
            <Input name="naam" placeholder="Nieuwe ruimte, bijv. Lab 12" required />
            <SubmitButton variant="secondary">Toevoegen</SubmitButton>
          </form>
          {state.error && <p className="mb-3 text-sm text-danger">{state.error}</p>}
          <ul>
            {rooms.map((room) => (
              <RoomRow key={room.id} room={room} />
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
