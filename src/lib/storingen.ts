import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Script dat vóór de storingen-pagina's draait: geeft ze de Supabase-gegevens
 * van de hub en (als je ingelogd bent) je huidige toegangstoken. De pagina's
 * gebruiken daarmee dezelfde inlog als de hub; ze loggen zelf niet in en
 * gebruiken nooit de refresh-token, zodat de hub-sessie niet in de war raakt.
 */
export function hubPrelude(cfg: {
  melden: string;
  token: string | null;
  userId: string | null;
  naam: string | null;
  email: string | null;
}): string {
  const json = JSON.stringify({
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    MELD_URL: cfg.melden,
    LOGO_URL: "/brand/logo-wit.png",
    userId: cfg.userId,
    naam: cfg.naam,
    email: cfg.email,
    ingelogd: !!cfg.userId,
  })
    .replace(/</g, "\\u003c")
    .replace(/\u2028|\u2029/g, " ");
  const token = JSON.stringify(cfg.token).replace(/</g, "\\u003c");
  return `<script>(function(){
window.__HUB_CFG__=${json};
window.__HUB_TOKEN__=${token};
window.__hubFetch=function(u,o){o=o||{};var h=new Headers(o.headers||(u&&u.headers)||{});if(window.__HUB_TOKEN__){h.set('Authorization','Bearer '+window.__HUB_TOKEN__);}o.headers=h;return fetch(u,o);};
if(window.__HUB_TOKEN__){setInterval(function(){fetch('/api/storingen/token',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(d){if(d&&d.token){window.__HUB_TOKEN__=d.token;if(window.__hubTokenVerversd)window.__hubTokenVerversd(d.token);}}).catch(function(){});},600000);}
})();</script>`;
}

/** Huidige gebruiker + toegangstoken (of null als niet ingelogd). */
export async function huidigeSessie(supabase: SupabaseClient<Database>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { token: null, userId: null, naam: null, email: null };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { data: profiel } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  return {
    token: session?.access_token ?? null,
    userId: user.id,
    naam: profiel?.full_name || user.email || null,
    email: user.email ?? null,
  };
}

export function injecteerScript(html: string, script: string) {
  const kop = html.search(/<head[^>]*>/i);
  if (kop < 0) return script + html;
  const eind = html.indexOf(">", kop) + 1;
  return html.slice(0, eind) + script + html.slice(eind);
}
