import { NextResponse } from "next/server";
import { requireGeenDocent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { laadFacturatie, slaFacturatieOp, type FacturatieWijziging } from "@/lib/facturatie";

/** Gegevens voor de facturatie-tool (alleen crew). */
export async function GET() {
  await requireGeenDocent();
  const supabase = await createClient();
  return NextResponse.json(await laadFacturatie(supabase), { headers: { "Cache-Control": "no-store" } });
}

/** Wijzigingen opslaan; de database dwingt af dat alleen crew schrijft. */
export async function POST(request: Request) {
  const { userId } = await requireGeenDocent();
  const wijziging = (await request.json().catch(() => null)) as FacturatieWijziging | null;
  if (!wijziging || typeof wijziging !== "object") {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }
  const supabase = await createClient();
  try {
    const res = await slaFacturatieOp(supabase, userId, wijziging);
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Opslaan mislukt" }, { status: 500 });
  }
}
