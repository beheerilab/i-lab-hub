"use client";

import { useTransition } from "react";
import { setPreviewRolAction } from "./rol-wisselaar-actions";
import type { Role } from "@/lib/supabase/database.types";

const LABELS: Partial<Record<Role, string>> = { lid: "Lid", docent: "Docent" };

export function PreviewBanner({ rol }: { rol: Role }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="bg-amber-400 px-4 py-2 text-center text-sm font-medium text-amber-950 sm:px-6">
      👁️ Je bekijkt i-lab Hub nu als <strong>{LABELS[rol] ?? rol}</strong> — dit zie jij alleen,
      niet je collega&apos;s.{" "}
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => setPreviewRolAction(""))}
        className="ml-1 underline underline-offset-2 disabled:opacity-50"
      >
        {pending ? "Bezig…" : "Terug naar Beheerder"}
      </button>
    </div>
  );
}
