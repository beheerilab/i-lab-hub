"use client";

import { useTransition } from "react";
import { setRoleAction, revokeAccessAction } from "./actions";
import type { Role } from "@/lib/supabase/database.types";

export function MemberRow({
  id,
  naam,
  rol,
  isJezelf,
}: {
  id: string;
  naam: string;
  rol: Role;
  isJezelf: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-none">
      <div>
        <p className="font-medium">
          {naam} {isJezelf && <span className="text-sm text-muted">(jij)</span>}
        </p>
        <p className="text-sm text-muted">{rol === "admin" ? "Beheerder" : "Lid"}</p>
      </div>
      {!isJezelf && (
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(() => setRoleAction(id, rol === "admin" ? "lid" : "admin"))
            }
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-black/[.04] disabled:opacity-50"
          >
            {rol === "admin" ? "Maak lid" : "Maak beheerder"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm(`Toegang van ${naam} intrekken? Dit account kan dan niet meer inloggen op i-lab Hub.`)) {
                startTransition(() => revokeAccessAction(id));
              }
            }}
            className="rounded-lg border border-danger/40 px-3 py-1.5 text-sm text-danger hover:bg-danger/10 disabled:opacity-50"
          >
            Toegang intrekken
          </button>
        </div>
      )}
    </li>
  );
}
