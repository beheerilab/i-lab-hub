"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/(auth)/login/actions";
import { setPreviewRolAction } from "./rol-wisselaar-actions";
import type { Role } from "@/lib/supabase/database.types";

const ROL_OPTIES: { rol: Role; label: string }[] = [
  { rol: "admin", label: "Beheerder" },
  { rol: "lid", label: "Lid" },
  { rol: "docent", label: "Docent" },
];

export function UserMenu({
  naam,
  rol,
  isAdmin,
  echteRol,
  actieveRol,
}: {
  naam: string;
  rol: string;
  isAdmin: boolean;
  /** De echte databaserol — bepaalt of de rol-wisselaar getoond wordt. */
  echteRol: Role;
  /** De rol die nu effectief actief is (kan afwijken door "bekijken als"). */
  actieveRol: Role;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center gap-3 text-sm">
      <span className="text-white">{naam}</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/40 text-white transition-colors hover:bg-white/15"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-56 rounded-xl border border-border bg-white p-2 text-foreground shadow-lg">
          <div className="mb-1 px-2 py-1.5">
            <p className="text-sm font-medium">{naam}</p>
            <p className="text-xs text-muted">{rol}</p>
          </div>

          {echteRol === "admin" && (
            <>
              <div className="my-1 border-t border-border" />
              <p className="px-2 pb-1.5 pt-1 text-xs font-medium text-muted">
                Bekijken als (alleen voor jou)
              </p>
              <div className="mb-1 flex gap-1 px-2">
                {ROL_OPTIES.map(({ rol: optieRol, label }) => (
                  <button
                    key={optieRol}
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setOpen(false);
                      startTransition(() => setPreviewRolAction(optieRol === "admin" ? "" : optieRol));
                    }}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                      actieveRol === optieRol
                        ? "border-accent bg-accent/10 text-accent-hover"
                        : "border-border text-muted hover:bg-black/[.03]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="my-1 border-t border-border" />
          <Link
            href="/wachtwoord"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-2 py-2 text-sm hover:bg-black/[.04]"
          >
            Wachtwoord wijzigen
          </Link>
          <Link
            href="/lesmateriaal"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-2 py-2 text-sm hover:bg-black/[.04]"
          >
            Vakken beheren
          </Link>
          {isAdmin && (
            <Link
              href="/teamleden"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-2 py-2 text-sm hover:bg-black/[.04]"
            >
              Teamleden beheren
            </Link>
          )}
          <div className="my-1 border-t border-border" />
          <form action={logoutAction}>
            <button
              type="submit"
              className="block w-full rounded-lg px-2 py-2 text-left text-sm text-danger hover:bg-danger/10"
            >
              Uitloggen
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
