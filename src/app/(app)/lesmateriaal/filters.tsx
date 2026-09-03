"use client";

import { Input, Select } from "@/components/ui/field";

export function MaterialFilters({
  subjects,
  topics,
  huidigVak,
  huidigOnderwerp,
  huidigZoek,
}: {
  subjects: { id: string; naam: string }[];
  topics: { id: string; naam: string; subject_id: string }[];
  huidigVak: string;
  huidigOnderwerp: string;
  huidigZoek: string;
}) {
  const zichtbareTopics = huidigVak
    ? topics.filter((t) => t.subject_id === huidigVak)
    : topics;

  return (
    <form method="GET" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
      <Input
        type="search"
        name="q"
        placeholder="Zoek op titel, beschrijving of tag…"
        defaultValue={huidigZoek}
        className="sm:col-span-2"
      />
      <Select name="vak" defaultValue={huidigVak} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
        <option value="">Alle vakken</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.naam}
          </option>
        ))}
      </Select>
      <Select
        name="onderwerp"
        defaultValue={huidigOnderwerp}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">Alle onderwerpen</option>
        {zichtbareTopics.map((t) => (
          <option key={t.id} value={t.id}>
            {t.naam}
          </option>
        ))}
      </Select>
      <button
        type="submit"
        className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium hover:bg-black/[.03] sm:col-span-4 sm:w-fit"
      >
        Filteren
      </button>
    </form>
  );
}
