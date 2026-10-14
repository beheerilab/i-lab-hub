import { requireGeenDocent } from "@/lib/auth";
import { ToolFrame } from "../tool-frame";

export default async function Page() {
  await requireGeenDocent();

  return (
    <>
      <h1 className="sr-only">Reiskosten</h1>
      <ToolFrame naam="reiskosten" titel="Reiskosten" />
    </>
  );
}
