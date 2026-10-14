import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireGeenDocent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { laadBestellijst } from "@/lib/bestellijst";

/** Welke losse HTML-tool bij welke naam hoort. Alleen deze bestanden worden ooit geserveerd. */
const TOOLS: Record<string, string> = {
  prijscalculator: "prijscalculator.html",
  reiskosten: "reiskosten.html",
  facturatie: "facturatie.html",
  bestellijst: "bestellijst.html",
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
  const { profile, email } = await requireGeenDocent();

  const { naam } = await params;
  const bestand = TOOLS[naam];
  if (!bestand) return new Response("Niet gevonden", { status: 404 });

  let html = await readFile(path.join(process.cwd(), "src", "tools-html", bestand), "utf8");
  // De bestellijst werkt op gedeelde data: gebruiker, rol en lijst gaan mee in de pagina.
  if (naam === "bestellijst") {
    const supabase = await createClient();
    const data = await laadBestellijst(supabase);
    const hub = {
      me: {
        naam: profile.full_name || email || "collega",
        rol: profile.role === "admin" ? "beheerder" : "collega",
      },
      ...data,
    };
    const json = JSON.stringify(hub).replace(/</g, "\\u003c").replace(/\u2028|\u2029/g, " ");
    html = html.replace('<meta charset="utf-8">', `<meta charset="utf-8"><script>window.__HUB__=${json};</script>`);
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
