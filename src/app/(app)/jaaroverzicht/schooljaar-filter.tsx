"use client";

import { Select } from "@/components/ui/field";

export function SchooljaarFilter({
  opties,
  huidig,
}: {
  opties: string[];
  huidig: string;
}) {
  return (
    <form method="GET" className="mb-6">
      <label className="mb-1.5 block text-sm font-medium">Schooljaar</label>
      <Select
        name="schooljaar"
        defaultValue={huidig}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="w-48"
      >
        {opties.map((sj) => (
          <option key={sj} value={sj}>
            {sj}
          </option>
        ))}
      </Select>
    </form>
  );
}
