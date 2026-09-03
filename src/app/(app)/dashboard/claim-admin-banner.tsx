"use client";

import { useState, useTransition } from "react";
import { claimAdminAction } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ClaimAdminBanner() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      const result = await claimAdminAction();
      setError(result.error ?? null);
    });
  }

  return (
    <Card className="mb-6 border-accent/30 bg-accent/5">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="font-medium">Er is nog geen beheerder</p>
          <p className="text-sm text-muted">
            Word beheerder om taken aan te maken, de bestellijst af te vinken en
            het jaaroverzicht te exporteren.
          </p>
          {error && <p className="mt-1 text-sm text-danger">{error}</p>}
        </div>
        <Button disabled={isPending} onClick={handleClick}>
          {isPending ? "Bezig…" : "Word beheerder"}
        </Button>
      </div>
    </Card>
  );
}
