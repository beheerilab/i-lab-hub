"use client";

import { useState, useTransition } from "react";
import { markAsOrderedAction } from "./actions";
import { Button } from "@/components/ui/button";

export function MarkAsOrderedButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm("Alle items op de actieve lijst markeren als besteld?")) return;
    startTransition(async () => {
      const result = await markAsOrderedAction();
      setError(result.error ?? null);
    });
  }

  return (
    <div>
      <Button variant="secondary" disabled={isPending} onClick={handleClick}>
        {isPending ? "Bezig…" : "Markeer als besteld"}
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
