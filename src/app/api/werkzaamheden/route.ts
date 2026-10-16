import { NextResponse } from "next/server";
import { requireGeenDocent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { laadWerkzaamheden, slaWerkzaamhedenOp, type WerkWijziging } from "@/lib/werkzaamheden";

async function gebruiker() {
  const { userId, profile, email } = await requireGeenDocent();
  return {
    id: userId,
    naam: profile.full_name || email || "collega",
    rol: (profile.role === "admin" ? "beheerder" : "collega") as "beheerder" | "collega",
  };
}

export async function GET() {
  const user = await gebruiker();
  const supabase = await createClient();
  return NextResponse.json(await laadWerkzaamheden(supabase, user), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await gebruiker();
  const wijziging = (await request.json().catch(() => null)) as WerkWijziging | null;
  if (!wijziging || typeof wijziging !== "object") {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }
  const supabase = await createClient();
  const res = await slaWerkzaamhedenOp(supabase, user.id, wijziging);
  return NextResponse.json({ ok: res.mislukt.length === 0, ...res });
}
