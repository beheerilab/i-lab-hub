import { requireAdmin } from "@/lib/auth";
import { ToolFrame } from "../tool-frame";

export default async function Page() {
  await requireAdmin();

  return (
    <>
      <h1 className="sr-only">Storingen</h1>
      <ToolFrame naam="storingen" titel="Storingen" />
    </>
  );
}
