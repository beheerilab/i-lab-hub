import { requireGeenDocent } from "@/lib/auth";
import { ToolFrame } from "../tool-frame";

export default async function Page() {
  await requireGeenDocent();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-foreground">Reiskosten</h1>
      <p className="mb-6 text-muted">Je woon-werk kilometers en extra ritten per maand, als PDF.</p>
      <ToolFrame naam="reiskosten" titel="Reiskosten" />
    </div>
  );
}
