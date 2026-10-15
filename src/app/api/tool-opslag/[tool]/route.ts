import { NextResponse } from "next/server";
import { requireGeenDocent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TOOL_OPSLAG, laadToolOpslag, slaToolOpslagOp } from "@/lib/tool-opslag";

export async function GET(_request: Request, { params }: { params: Promise<{ tool: string }> }) {
  const { userId } = await requireGeenDocent();
  const { tool } = await params;
  if (!TOOL_OPSLAG[tool]) return NextResponse.json({ error: "Onbekende tool" }, { status: 404 });
  const supabase = await createClient();
  return NextResponse.json(await laadToolOpslag(supabase, tool, userId), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ tool: string }> }) {
  const { userId } = await requireGeenDocent();
  const { tool } = await params;
  if (!TOOL_OPSLAG[tool]) return NextResponse.json({ error: "Onbekende tool" }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { sleutel?: string; waarde?: string | null } | null;
  if (!body || typeof body.sleutel !== "string") return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  const supabase = await createClient();
  const res = await slaToolOpslagOp(supabase, tool, userId, body.sleutel, typeof body.waarde === "string" ? body.waarde : null);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}
