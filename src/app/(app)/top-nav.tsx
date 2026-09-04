"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/modules";
import { DocumentatieDropdown } from "./documentatie-dropdown";

const DOCUMENTATIE_HREFS = ["/lesmateriaal", "/jaaroverzicht", "/handleidingen"];

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-nowrap items-center gap-1.5 overflow-x-auto">
      {MODULES.map((mod) => {
        if (DOCUMENTATIE_HREFS.includes(mod.href)) {
          if (mod.href !== DOCUMENTATIE_HREFS[0]) return null;
          return <DocumentatieDropdown key="documentatie" />;
        }
        const isActive = pathname.startsWith(mod.href);
        return (
          <Link
            key={mod.href}
            href={mod.href}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-white text-accent-dark"
                : "text-white/90 hover:bg-white/15"
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
