import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireGeenDocent } from "@/lib/auth";
import { TOOL_OPSLAG, laadToolOpslag, opslagShim } from "@/lib/tool-opslag";
import { createClient } from "@/lib/supabase/server";
import { laadFacturatie } from "@/lib/facturatie";

/** Welke losse HTML-tool bij welke naam hoort. Alleen deze bestanden worden ooit geserveerd. */
const TOOLS: Record<string, string> = {
  prijscalculator: "prijscalculator.html",
  reiskosten: "reiskosten.html",
  facturatie: "facturatie.html",
};

/** Per tool: dubbele elementen weg (de hub heeft al logo en titel) en meer ruimte. */
const EXTRA_CSS: Record<string, string> = {
  prijscalculator: "header.top img{display:none!important}",
  reiskosten: ".ov-logo{display:none!important}",
  facturatie: "header .brand img{display:none!important} header{background:transparent!important;border-bottom:0!important;backdrop-filter:none!important}",
};

const BARLOW_HEAD =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&display=swap">' +
  '<style>html,body,button,input,select,textarea{font-family:"Barlow",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}</style>';

/**
 * Serveert een losse HTML-tool, maar alleen aan ingelogde crew (geen docent) —
 * vandaar niet in public/. De pagina's /prijscalculator, /reiskosten en
 * /facturatie tonen deze route in een kader binnen de hub.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ naam: string }> }) {
  const { userId } = await requireGeenDocent();

  const { naam } = await params;
  const bestand = TOOLS[naam];
  if (!bestand) return new Response("Niet gevonden", { status: 404 });

  let html = await readFile(path.join(process.cwd(), "src", "tools-html", bestand), "utf8");
  // De facturatie bewaart in Supabase: de huidige gegevens gaan mee in de pagina.
  if (naam === "facturatie") {
    const supabase = await createClient();
    const db = await laadFacturatie(supabase);
    const json = JSON.stringify({ ...db }).replace(/</g, "\\u003c").replace(/\u2028|\u2029/g, " ");
    const script = `<script>window.__HUB_FACT__=${json};</script>`;
    const kop = html.search(/<head[^>]*>/i);
    if (kop >= 0) {
      const eind = html.indexOf(">", kop) + 1;
      html = html.slice(0, eind) + script + html.slice(eind);
    } else {
      html = script + html;
    }
  }

  // prijscalculator/reiskosten: localStorage omleiden naar Supabase.
  if (TOOL_OPSLAG[naam]) {
    const supabase = await createClient();
    const waarden = await laadToolOpslag(supabase, naam, userId);
    const shim = opslagShim(naam, waarden);
    const kop = html.search(/<head[^>]*>/i);
    if (kop >= 0) {
      const eind = html.indexOf(">", kop) + 1;
      html = html.slice(0, eind) + shim + html.slice(eind);
    } else {
      html = shim + html;
    }
  }

  const extra = EXTRA_CSS[naam];
  if (extra) {
    // Aan het eind van het document (een eerste "</body>" kan in een scriptstring staan).
    const i = html.lastIndexOf("</body>");
    const stijl = `<style>${extra}</style>`;
    html = i >= 0 ? html.slice(0, i) + stijl + html.slice(i) : html + stijl;
  }

  // Zelfde lettertype als de hub (prijscalculator heeft Barlow al ingebouwd).
  if (!html.includes('font-family:"Barlow"') && !html.includes("family=Barlow")) {
    html = html.replace("</head>", `${BARLOW_HEAD}</head>`);
  }
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
