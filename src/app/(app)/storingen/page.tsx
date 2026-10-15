import { requireAdmin } from "@/lib/auth";
import { ToolFrame } from "../tool-frame";

export default async function Page({ searchParams }: { searchParams: Promise<{ machine?: string }> }) {
  await requireAdmin();
  const { machine } = await searchParams;

  return (
    <>
      <h1 className="sr-only">Storingen</h1>
      <ToolFrame naam="storingen" titel="Storingen" query={machine ? `machine=${encodeURIComponent(machine)}` : undefined} />
    </>
  );
}
