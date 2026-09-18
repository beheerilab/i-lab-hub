import { Card } from "@/components/ui/card";
import type { Room } from "./types";

export function RuimteSidebar({
  rooms,
  tellingenVandaag,
}: {
  rooms: Room[];
  tellingenVandaag: Record<string, number>;
}) {
  return (
    <Card className="w-full lg:w-64 lg:shrink-0">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        Ruimtes vandaag
      </h2>
      <ul className="space-y-0.5">
        {rooms.map((room) => {
          const aantal = tellingenVandaag[room.id] ?? 0;
          return (
            <li
              key={room.id}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-black/[.03]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${aantal > 0 ? "bg-accent" : "bg-border"}`}
                />
                <span className="truncate text-sm font-medium">{room.naam}</span>
              </span>
              <span className={`shrink-0 text-xs font-semibold ${aantal > 0 ? "text-accent-hover" : "text-muted"}`}>
                {aantal > 0 ? `${aantal}×` : "vrij"}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
