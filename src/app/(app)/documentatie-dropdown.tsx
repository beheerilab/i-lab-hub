"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES, modulesVoorRol } from "@/lib/modules";
import type { Role } from "@/lib/supabase/database.types";

const DOCUMENTATIE_HREFS = ["/lesmateriaal", "/jaaroverzicht", "/handleidingen"];

export function DocumentatieDropdown({ rol }: { rol: Role }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const items = modulesVoorRol(rol, MODULES.filter((mod) => DOCUMENTATIE_HREFS.includes(mod.href)));
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
          isActive ? "bg-white text-accent-dark" : "text-white/90 hover:bg-white/15"
        }`}
      >
        <span>📚</span>
        Documentatie
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
