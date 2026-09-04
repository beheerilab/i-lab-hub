"use client";

import { useActionState, useRef, useEffect, useOptimistic, useState, useTransition } from "react";
import {
  createRoomAction,
  renameRoomAction,
  toggleRoomActiveAction,
  telToekomstigeBoekingenAction,
  deleteRoomAction,
  reorderRoomsAction,
  type RoomActionState,
} from "./actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

type Room = { id: string; naam: string; volgorde: number; actief: boolean };

const initialState: RoomActionState = {};

function RoomRow({
  room,
  ontgrendeld,
  onDragStart,
  onDragOver,
  onDrop,
  isDragTarget,
}: {
  room: Room;
  ontgrendeld: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  isDragTarget: boolean;
}) {
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

  async function toggleActief() {
    if (room.actief) {
      const aantal = await telToekomstigeBoekingenAction(room.id);
      if (
        aantal > 0 &&
        !confirm(
          `Deze ruimte heeft nog ${aantal} toekomstige boeking(en). Ze blijven bestaan maar de ruimte verdwijnt uit de planning. Toch verbergen?`,
        )
      ) {
        return;
      }
    }
    startTransition(() => toggleRoomActiveAction(room.id, !room.actief));
  }

  return (
    <li
      draggable={ontgrendeld}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex items-center gap-2 border-b border-border py-2 last:border-none ${
        ontgrendeld ? "cursor-grab active:cursor-grabbing" : ""
      } ${isDragTarget ? "bg-accent/5" : ""}`}
    >
      {ontgrendeld && <span className="shrink-0 text-muted">⠿</span>}
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
          onClick={() => !ontgrendeld && setEditing(true)}
          className={`flex-1 truncate text-left ${!room.actief ? "text-muted line-through" : ""}`}
        >
          {room.naam}
        </button>
      )}
      {!ontgrendeld && (
        <>
          <button
            type="button"
            disabled={isPending}
            onClick={toggleActief}
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
        </>
      )}
    </li>
  );
}

export function RoomManager({ rooms }: { rooms: Room[] }) {
  const [open, setOpen] = useState(false);
  const [ontgrendeld, setOntgrendeld] = useState(false);
  const [orderedRooms, setOrderedRooms] = useOptimistic(
    rooms,
    (_huidig, nieuweVolgorde: Room[]) => nieuweVolgorde,
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [, startReorderTransition] = useTransition();
  const state0: RoomActionState = initialState;
  const [state, formAction] = useActionState(createRoomAction, state0);
  const formRef = useRef<HTMLFormElement>(null);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (wasSubmitting.current && !state.error) formRef.current?.reset();
    wasSubmitting.current = false;
  }, [state]);

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const van = orderedRooms.findIndex((r) => r.id === dragId);
    const naar = orderedRooms.findIndex((r) => r.id === targetId);
    if (van === -1 || naar === -1) return;
    const nieuw = [...orderedRooms];
    const [verplaatst] = nieuw.splice(van, 1);
    nieuw.splice(naar, 0, verplaatst);
    setDragId(null);
    startReorderTransition(async () => {
      setOrderedRooms(nieuw);
      await reorderRoomsAction(nieuw.map((r) => r.id));
    });
  }

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

          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-muted">
              {ontgrendeld ? "Sleep om de volgorde te wijzigen." : "Volgorde staat vast."}
            </p>
            <button
              type="button"
              onClick={() => setOntgrendeld((o) => !o)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                ontgrendeld
                  ? "border-accent bg-accent/10 text-accent-hover"
                  : "border-border text-muted hover:bg-black/[.04]"
              }`}
            >
              {ontgrendeld ? "🔓 Volgorde vergrendelen" : "🔒 Volgorde ontgrendelen"}
            </button>
          </div>

          <ul>
            {orderedRooms.map((room) => (
              <RoomRow
                key={room.id}
                room={room}
                ontgrendeld={ontgrendeld}
                isDragTarget={ontgrendeld && dragId !== null && dragId !== room.id}
                onDragStart={() => setDragId(room.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(room.id)}
              />
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
