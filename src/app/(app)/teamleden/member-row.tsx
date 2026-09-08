"use client";

import { useTransition } from "react";
import { setRoleAction, revokeAccessAction } from "./actions";
import { Select } from "@/components/ui/field";
import type { Role } from "@/lib/supabase/database.types";

const ROL_LABELS: Record<Role, string> = {
  admin: "Beheerder",
  lid: "Lid",
  docent: "Docent",
};

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
        <p className="text-sm text-muted">{ROL_LABELS[rol]}</p>
      </div>
      {!isJezelf && (
        <div className="flex shrink-0 items-center gap-2">
          <Select
            value={rol}
            disabled={isPending}
            onChange={(e) => startTransition(() => setRoleAction(id, e.target.value as Role))}
            className="w-36 py-1.5 text-sm"
          >
            <option value="admin">Beheerder</option>
            <option value="lid">Lid</option>
            <option value="docent">Docent</option>
          </Select>
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
