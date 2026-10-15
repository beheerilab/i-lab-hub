import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/** Welke sleutels een tool in Supabase bewaart en voor wie (team of persoonlijk). */
export const TOOL_OPSLAG: Record<string, { scope: "team" | "persoon"; sleutels: string[] }> = {
  prijscalculator: { scope: "team", sleutels: ["ilab-lesprijs-v3", "ilab-ruimteprijs-v1"] },
  reiskosten: { scope: "persoon", sleutels: ["reiskosten-overzicht-v1"] },
};

const MAX_BYTES = 1_000_000;

function scopeVoor(tool: string, userId: string) {
  return TOOL_OPSLAG[tool].scope === "team" ? "team" : userId;
}

/** Alle opgeslagen waarden van een tool: { sleutel: string }. */
export async function laadToolOpslag(supabase: Client, tool: string, userId: string): Promise<Record<string, string>> {
  if (!TOOL_OPSLAG[tool]) return {};
  const { data } = await supabase
    .from("tool_opslag")
    .select("sleutel, data")
    .eq("tool", tool)
    .eq("scope", scopeVoor(tool, userId));
  const uit: Record<string, string> = {};
  for (const r of data ?? []) {
    const v = (r.data as { v?: unknown }).v;
    if (typeof v === "string" && TOOL_OPSLAG[tool].sleutels.includes(r.sleutel)) uit[r.sleutel] = v;
  }
  return uit;
}

export async function slaToolOpslagOp(
  supabase: Client,
  tool: string,
  userId: string,
  sleutel: string,
  waarde: string | null,
): Promise<{ ok: boolean; fout?: string }> {
  const cfg = TOOL_OPSLAG[tool];
  if (!cfg || !cfg.sleutels.includes(sleutel)) return { ok: false, fout: "Onbekende sleutel" };
  const scope = scopeVoor(tool, userId);

  if (waarde === null) {
    const { error } = await supabase.from("tool_opslag").delete().eq("tool", tool).eq("sleutel", sleutel).eq("scope", scope);
    return error ? { ok: false, fout: error.message } : { ok: true };
  }
  if (waarde.length > MAX_BYTES) return { ok: false, fout: "Te groot" };
  const { error } = await supabase.from("tool_opslag").upsert({
    tool,
    sleutel,
    scope,
    data: { v: waarde },
    updated_at: new Date().toISOString(),
    updated_by: userId,
  });
  return error ? { ok: false, fout: error.message } : { ok: true };
}

/**
 * Klein script dat vóór de tool draait en localStorage voor de gekozen
 * sleutels omleidt naar de hub. Zo hoeft de tool zelf niet te veranderen.
 */
export function opslagShim(tool: string, waarden: Record<string, string>): string {
  const cfg = TOOL_OPSLAG[tool];
  const json = JSON.stringify({ tool, keys: cfg.sleutels, data: waarden })
    .replace(/</g, "\\u003c")
    .replace(/\u2028|\u2029/g, " ");
  return `<script>(function(){
var C=${json},real=window.localStorage,timers={},pending={};
function send(k){var v=pending[k];delete pending[k];try{fetch('/api/tool-opslag/'+C.tool,{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({sleutel:k,waarde:v===undefined?null:v})}).catch(function(){});}catch(e){}}
function queue(k,v){pending[k]=v;clearTimeout(timers[k]);timers[k]=setTimeout(function(){send(k);},600);}
function mine(k){return C.keys.indexOf(k)>-1;}
var shim={
getItem:function(k){if(mine(k)){return Object.prototype.hasOwnProperty.call(C.data,k)?C.data[k]:real.getItem(k);}return real.getItem(k);},
setItem:function(k,v){if(mine(k)){C.data[k]=String(v);queue(k,String(v));}else{real.setItem(k,v);}},
removeItem:function(k){if(mine(k)){delete C.data[k];queue(k,undefined);}else{real.removeItem(k);}},
clear:function(){real.clear();},
key:function(i){return real.key(i);},
get length(){return real.length;}
};
try{Object.defineProperty(window,'localStorage',{value:shim,configurable:true});}catch(e){}
window.addEventListener('pagehide',function(){Object.keys(pending).forEach(send);});
document.addEventListener('visibilitychange',function(){if(document.hidden)Object.keys(pending).forEach(send);});
})();</script>`;
}
