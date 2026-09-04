"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/modules";

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1.5">
      {MODULES.map((mod) => {
        const isActive = pathname.startsWith(mod.href);
        return (
          <Link
            key={mod.href}
            href={mod.href}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
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
