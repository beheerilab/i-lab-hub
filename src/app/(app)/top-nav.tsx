"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES, TOOLS_HREFS, modulesVoorRol } from "@/lib/modules";
import { NavDropdown } from "./nav-dropdown";
import type { Role } from "@/lib/supabase/database.types";

const DOCUMENTATIE_HREFS = ["/lesmateriaal", "/jaaroverzicht", "/handleidingen"];
const OVERZICHTEN_HREFS = ["/contacten", "/sleutels", "/opslag"];

export function TopNav({ rol }: { rol: Role }) {
  const pathname = usePathname();
  const zichtbareModules = modulesVoorRol(rol, MODULES);

  return (
    <nav className="flex flex-nowrap items-center gap-1.5 overflow-x-auto">
      <Link
        href="/dashboard"
        className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          pathname.startsWith("/dashboard")
            ? "bg-accent-soft font-bold text-accent-hover"
            : "text-muted hover:bg-black/[.04] hover:text-accent-hover"
        }`}
      >
        <span>🏠</span>
        Dashboard
      </Link>
      {zichtbareModules.map((mod) => {
        if (DOCUMENTATIE_HREFS.includes(mod.href)) {
          if (mod.href !== DOCUMENTATIE_HREFS[0]) return null;
          return (
            <NavDropdown key="documentatie" rol={rol} label="Documentatie" icon="📚" hrefs={DOCUMENTATIE_HREFS} />
          );
        }
        if (OVERZICHTEN_HREFS.includes(mod.href)) {
          if (mod.href !== OVERZICHTEN_HREFS[0]) return null;
          return <NavDropdown key="overzichten" rol={rol} label="Overzichten" icon="🗂️" hrefs={OVERZICHTEN_HREFS} />;
        }
        if (TOOLS_HREFS.includes(mod.href)) {
          if (mod.href !== TOOLS_HREFS[0]) return null;
          return <NavDropdown key="tools" rol={rol} label="Tools" icon="🧰" hrefs={TOOLS_HREFS} />;
        }
        const isActive = pathname.startsWith(mod.href);
        return (
          <Link
            key={mod.href}
            href={mod.href}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-accent-soft font-bold text-accent-hover"
                : "text-muted hover:bg-black/[.04] hover:text-accent-hover"
            }`}
          >
            <span>{mod.icon}</span>
            {mod.title}
          </Link>
        );
      })}
    </nav>
  );
}
