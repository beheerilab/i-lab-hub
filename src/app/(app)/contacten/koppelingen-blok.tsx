"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { getContactKoppelingenAction, type ContactKoppelingen } from "./actions";

export function KoppelingenBlok({ contactId }: { contactId: string }) {
  const [koppelingen, setKoppelingen] = useState<ContactKoppelingen | null>(null);
  const [, startLoad] = useTransition();

  useEffect(() => {
    startLoad(async () => setKoppelingen(await getContactKoppelingenAction(contactId)));
  }, [contactId, startLoad]);

  if (!koppelingen || (koppelingen.taken.length === 0 && koppelingen.bestellingen.length === 0)) {
    return null;
  }

  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold">Openstaand bij deze instantie</h4>
      <div className="space-y-1.5">
        {koppelingen.taken.map((t) => (
          <Link
            key={t.id}
            href="/werkzaamheden"
            className="flex items-center gap-2 rounded-lg bg-black/[.03] px-2.5 py-1.5 text-sm hover:bg-black/[.06]"
          >
            <span className="shrink-0">✅</span>
            <span className={`min-w-0 truncate ${t.status === "afgevinkt" ? "text-muted line-through" : ""}`}>
              {t.titel}
            </span>
          </Link>
        ))}
        {koppelingen.bestellingen.map((b) => (
          <Link
            key={b.id}
            href="/bestellijst"
            className="flex items-center gap-2 rounded-lg bg-black/[.03] px-2.5 py-1.5 text-sm hover:bg-black/[.06]"
          >
            <span className="shrink-0">📦</span>
            <span className="min-w-0 truncate">{b.itemNaam}</span>
            <span className="shrink-0 text-xs text-muted">({b.status})</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
