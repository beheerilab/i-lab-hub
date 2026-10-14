import { requireGeenDocent } from "@/lib/auth";
import { ToolFrame } from "../tool-frame";

export default async function BestellijstPage() {
  await requireGeenDocent();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bestellijst</h1>
        <p className="mt-1 text-sm text-muted">Materiaal aanvragen, bestelronde en archief.</p>
      </div>
      <ToolFrame naam="bestellijst" titel="Bestellijst" />
    </div>
  );
}
