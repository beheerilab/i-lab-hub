"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES, modulesVoorRol } from "@/lib/modules";
import type { Role } from "@/lib/supabase/database.types";

/** Uitklapmenu in de navigatiebalk voor een groep modules (bijv. Documentatie of Tools). */
export function NavDropdown({
  rol,
  label,
  icon,
  hrefs,
}: {
  rol: Role;
  label: string;
  icon: string;
  hrefs: string[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const items = modulesVoorRol(rol, MODULES.filter((mod) => hrefs.includes(mod.href)));
  const isActive = items.some((mod) => pathname.startsWith(mod.href));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen((o) => !o);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          isActive ? "bg-accent-soft font-bold text-accent-hover" : "text-muted hover:bg-black/[.04] hover:text-accent-hover"
        }`}
      >
        <span>{icon}</span>
        {label}
        <span className="text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left }}
            className="z-50 w-56 rounded-xl border border-border bg-white p-2 text-foreground shadow-lg"
          >
            {items.map((mod) => (
              <Link
                key={mod.href}
                href={mod.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm ${
                  pathname.startsWith(mod.href) ? "bg-accent/10 text-accent-dark" : "hover:bg-black/[.04]"
                }`}
              >
                <span>{mod.icon}</span>
                {mod.title}
              </Link>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
