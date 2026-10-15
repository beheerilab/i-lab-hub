import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";
import { huidigeSessie, hubPrelude, injecteerScript } from "@/lib/storingen";

/**
 * Openbare meldpagina voor storingen (QR-code): /melden?m=CODE. Geen inlog
 * nodig; ben je wel ingelogd in de hub, dan wordt je naam ingevuld en de
 * melding aan jou gekoppeld.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const sessie = await huidigeSessie(supabase);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  let html = await readFile(path.join(process.cwd(), "src", "tools-html", "storing-melden.html"), "utf8");
  html = injecteerScript(html, hubPrelude({ melden: `${origin}/melden`, ...sessie }));

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}
