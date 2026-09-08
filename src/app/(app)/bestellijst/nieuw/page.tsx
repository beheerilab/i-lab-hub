import { requireGeenDocent } from "@/lib/auth";
import { BestellijstTabs } from "../tabs";
import { AddItemForm } from "../add-item-form";

export default async function BestellijstNieuwPage() {
  await requireGeenDocent();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-white">Bestellijst</h1>
      <p className="mb-6 text-white/80">Voeg materiaal toe dat besteld moet worden.</p>

      <BestellijstTabs active="nieuw" />

      <AddItemForm />
    </div>
  );
}
