import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireGeenDocent } from "@/lib/auth";

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
  await requireGeenDocent();

  const { naam } = await params;
  const bestand = TOOLS[naam];
  if (!bestand) return new Response("Niet gevonden", { status: 404 });

  let html = await readFile(path.join(process.cwd(), "src", "tools-html", bestand), "utf8");
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
