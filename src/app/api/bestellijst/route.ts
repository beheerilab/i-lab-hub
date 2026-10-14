import { NextResponse } from "next/server";
import { requireGeenDocent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { laadBestellijst, slaBestellijstOp, type BestellijstWijziging } from "@/lib/bestellijst";

/** Data voor de Bestellijst-tool: alle aanvragen + eigen bestelnamen. Alleen crew. */
export async function GET() {
  await requireGeenDocent();
  const supabase = await createClient();
  return NextResponse.json(await laadBestellijst(supabase), { headers: { "Cache-Control": "no-store" } });
}

/** Wijzigingen van de tool opslaan (rechten worden in de database afgedwongen). */
export async function POST(request: Request) {
  const { userId } = await requireGeenDocent();
  const wijziging = (await request.json().catch(() => null)) as BestellijstWijziging | null;
  if (!wijziging || typeof wijziging !== "object") {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }
  const supabase = await createClient();
  const { mislukt } = await slaBestellijstOp(supabase, userId, wijziging);
  return NextResponse.json({ ok: mislukt.length === 0, mislukt });
}
