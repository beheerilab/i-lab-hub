import { requireGeenDocent } from "@/lib/auth";
import { ToolFrame } from "../tool-frame";

export default async function Page() {
  await requireGeenDocent();

  return (
    <>
      <h1 className="sr-only">Bestellijst</h1>
      <ToolFrame naam="bestellijst" titel="Bestellijst" />
    </>
  );
}
