import { requireGeenDocent } from "@/lib/auth";
import { ToolFrame } from "../tool-frame";

export default async function Page() {
  await requireGeenDocent();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-foreground">Ruimtegebruik facturatie</h1>
      <p className="mb-6 text-muted">Reserveringen inlezen en facturen maken voor ruimtegebruik en consumpties.</p>
      <ToolFrame naam="facturatie" titel="Ruimtegebruik facturatie" />
    </div>
  );
}
