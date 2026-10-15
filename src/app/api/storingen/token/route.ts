import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { huidigeSessie } from "@/lib/storingen";

/** Vers toegangstoken voor de storingen-pagina's (die langer open kunnen staan dan een uur). */
export async function GET() {
  const supabase = await createClient();
  const { token } = await huidigeSessie(supabase);
  return NextResponse.json({ token }, { headers: { "Cache-Control": "no-store" } });
}
