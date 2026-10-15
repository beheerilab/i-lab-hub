"use client";

import { useState, type ReactNode } from "react";

/**
 * Lijst die standaard `aantal` regels toont; de rest klapt open met "+ N meer"
 * (en weer dicht met "Minder tonen"), zodat je op het dashboard in één klik
 * het totale overzicht ziet.
 */
export function UitklapLijst({
  kinderen,
  aantal = 6,
  className = "space-y-1.5",
}: {
  kinderen: ReactNode[];
  aantal?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rest = kinderen.length - aantal;
  const zichtbaar = open || rest <= 0 ? kinderen : kinderen.slice(0, aantal);

  return (
    <>
      <ul className={className}>{zichtbaar}</ul>
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="mt-3 text-sm font-medium text-accent-hover hover:underline"
        >
          {open ? "Minder tonen" : `+ ${rest} meer`}
        </button>
      )}
    </>
  );
}
