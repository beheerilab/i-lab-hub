import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { laadPlanning, slaPlanningOp, type PlanningChange } from "@/lib/planning";

async function gebruiker() {
  const { userId, profile, email } = await requireProfile();
  return {
    id: userId,
    naam: profile.full_name || email || "collega",
    crew: profile.role === "admin" || profile.role === "lid",
  };
}

/** Alle planningdata (afgeschermd voor docenten). */
export async function GET() {
  const user = await gebruiker();
  const supabase = await createClient();
  const data = await laadPlanning(supabase, user);
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}

/** Wijzigingen opslaan; rechten worden in de database afgedwongen. */
export async function POST(request: Request) {
  const user = await gebruiker();
  const wijziging = (await request.json().catch(() => null)) as PlanningChange | null;
  if (!wijziging || typeof wijziging !== "object") {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }
  const supabase = await createClient();
  const resultaat = await slaPlanningOp(supabase, user, wijziging);
  return NextResponse.json({ ok: resultaat.mislukt.length === 0, mislukt: resultaat.mislukt });
}
