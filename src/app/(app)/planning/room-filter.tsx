"use client";

import type { Room } from "./types";

export function RoomFilter({
  rooms,
  actief,
  onToggle,
}: {
  rooms: Room[];
  actief: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {rooms.map((room) => {
        const aan = actief.has(room.id);
        return (
          <button
            key={room.id}
            type="button"
            onClick={() => onToggle(room.id)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              aan
                ? "border-accent bg-accent/10 text-accent-hover"
                : "border-border text-muted hover:bg-black/[.03]"
            }`}
          >
            {room.naam}
          </button>
        );
      })}
    </div>
  );
}
