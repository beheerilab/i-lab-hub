import { requireGeenDocent } from "@/lib/auth";
import { ToolFrame } from "../tool-frame";

export default async function Page() {
  await requireGeenDocent();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-foreground">Prijscalculator</h1>
      <p className="mb-6 text-muted">Offertes maken voor lessen en ruimteverhuur.</p>
      <ToolFrame naam="prijscalculator" titel="Prijscalculator" />
    </div>
  );
}
