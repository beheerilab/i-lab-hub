import { Card } from "@/components/ui/card";
import type { Uitsplitsing } from "@/lib/jaaroverzicht";

export function BreakdownCard({ title, data }: { title: string; data: Uitsplitsing[] }) {
  return (
    <Card>
      <h3 className="mb-3 font-semibold">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-muted">Geen data.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="pb-2 font-medium">Naam</th>
              <th className="pb-2 text-right font-medium">Lessen</th>
              <th className="pb-2 text-right font-medium">Leerlingen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row) => (
              <tr key={row.label}>
                <td className="py-1.5">{row.label}</td>
                <td className="py-1.5 text-right">{row.aantalLessen}</td>
                <td className="py-1.5 text-right">{row.aantalLeerlingen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
