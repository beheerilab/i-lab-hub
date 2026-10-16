import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/* ---------- Vorm die de werkzaamheden-pagina gebruikt ---------- */

export type WerkTask = {
  id: string;
  nr: number;
  title: string;
  descr: string;
  cat: string;
  prio: string;
  who: string; // '' | 'samen' | profiel-id
  status: string;
  due: string; // '' of JJJJ-MM-DD
  lead: number;
  repeat: string;
  loc: string;
  checklist: { t: string; d: boolean }[];
  notes: { at: string; tm?: string; by: string; txt: string }[];
  log: { at: string; by: string; txt: string }[];
  seriesId: string | null;
  nextId: string | null;
  doneAt: string | null;
  createdAt: string;
};

export type WerkBijlage = {
  id: string;
  naam: string;
  url: string;
  type: string | null;
  grootte: number | null;
  door: string;
  mine: boolean;
};

export type WerkData = {
  me: { id: string; naam: string; rol: "beheerder" | "collega" };
  people: { id: string; name: string }[];
  tasks: WerkTask[];
  bijlagen: Record<string, WerkBijlage[]>;
};

export type WerkWijziging = { upserts?: WerkTask[]; deletes?: string[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const CATS = ["onderhoud", "gebouw", "veilig", "inkoop", "lessen", "admin"];
const PRIOS = ["urgent", "hoog", "normaal", "laag"];
const STATUSSEN = ["plannen", "week", "bezig", "wacht", "klaar"];
const REPEATS = ["", "w1", "w2", "m1", "m3", "m6", "m12", "m24"];

type Rij = Database["public"]["Tables"]["werkzaamheden"]["Row"];

function naarTask(r: Rij): WerkTask {
  return {
    id: r.id,
    nr: r.nr,
    title: r.title,
    descr: r.descr,
    cat: r.cat,
    prio: r.prio,
    who: r.who,
    status: r.status,
    due: r.due ?? "",
    lead: r.lead_days,
    repeat: r.repeat,
    loc: r.loc,
    checklist: r.checklist ?? [],
    notes: r.notes ?? [],
    log: r.log ?? [],
    seriesId: r.series_id,
    nextId: r.next_id,
    doneAt: r.done_at,
    createdAt: r.created_at.slice(0, 10),
  };
}

/** Crewleden als keuzelijst ("wie pakt het op"); dubbele namen krijgen het begin van het mailadres erbij. */
export async function laadPersonen(supabase: Client) {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .in("role", ["admin", "lid"])
    .order("full_name");
  const rijen = data ?? [];
  const teller = new Map<string, number>();
  rijen.forEach((p) => teller.set(p.full_name ?? "", (teller.get(p.full_name ?? "") ?? 0) + 1));
  return rijen.map((p) => {
    const basis = p.full_name || p.email || "Collega";
    const dubbel = (teller.get(p.full_name ?? "") ?? 0) > 1;
    return { id: p.id, name: dubbel && p.email ? `${basis} (${p.email.split("@")[0]})` : basis };
  });
}

export async function laadWerkzaamheden(
  supabase: Client,
  user: { id: string; naam: string; rol: "beheerder" | "collega" },
): Promise<WerkData> {
  const rijen: Rij[] = [];
  for (let van = 0; van < 5000; van += 1000) {
    const { data } = await supabase
      .from("werkzaamheden")
      .select("*")
      .order("nr")
      .range(van, van + 999);
    const stuk = data ?? [];
    rijen.push(...stuk);
    if (stuk.length < 1000) break;
  }

  const people = await laadPersonen(supabase);

  // Bijlagen met tijdelijke downloadlinks (de bucket is privé).
  const bijlagen: Record<string, WerkBijlage[]> = {};
  const { data: bij } = await supabase
    .from("werkzaamheden_bijlagen")
    .select("id, task_id, naam, pad, type, grootte, created_by")
    .order("created_at");
  const lijst = bij ?? [];
  if (lijst.length > 0) {
    const { data: urls } = await supabase.storage
      .from("werkzaamheden-bijlagen")
      .createSignedUrls(lijst.map((b) => b.pad), 3600);
    const urlPerPad = new Map((urls ?? []).map((u) => [u.path, u.signedUrl]));
    const naamPerId = new Map(people.map((p) => [p.id, p.name]));
    for (const b of lijst) {
      (bijlagen[b.task_id] ||= []).push({
        id: b.id,
        naam: b.naam,
        url: urlPerPad.get(b.pad) ?? "",
        type: b.type,
        grootte: b.grootte,
        door: naamPerId.get(b.created_by ?? "") ?? "",
        mine: b.created_by === user.id,
      });
    }
  }

  return { me: user, people, tasks: rijen.map(naarTask), bijlagen };
}

/** Schrijft wijzigingen weg; de rechten worden in de database afgedwongen (RLS + trigger). */
export async function slaWerkzaamhedenOp(
  supabase: Client,
  userId: string,
  wijziging: WerkWijziging,
): Promise<{ mislukt: { id: string; reden: string }[]; nrs: Record<string, number> }> {
  const mislukt: { id: string; reden: string }[] = [];
  const nrs: Record<string, number> = {};
  const upserts = (wijziging.upserts ?? []).filter((t) => UUID.test(t?.id ?? ""));

  const { data: bestaand } = upserts.length
    ? await supabase.from("werkzaamheden").select("id, nr").in("id", upserts.map((t) => t.id))
    : { data: [] as { id: string; nr: number }[] };
  const bestaandeIds = new Map((bestaand ?? []).map((r) => [r.id, r.nr]));

  for (const t of upserts) {
    const fout = (reden: string) => mislukt.push({ id: t.id, reden });
    if (!t.title?.trim()) { fout("Titel ontbreekt"); continue; }
    if (!CATS.includes(t.cat) || !PRIOS.includes(t.prio) || !STATUSSEN.includes(t.status) || !REPEATS.includes(t.repeat)) {
      fout("Ongeldige waarde"); continue;
    }
    if (t.due && !DATUM.test(t.due)) { fout("Ongeldige deadline"); continue; }
    if (t.who && t.who !== "samen" && !UUID.test(t.who)) { fout("Ongeldige persoon"); continue; }

    const velden = {
      title: t.title.trim().slice(0, 200),
      descr: String(t.descr ?? "").slice(0, 5000),
      cat: t.cat,
      prio: t.prio,
      who: t.who ?? "",
      status: t.status,
      due: t.due || null,
      lead_days: Math.min(365, Math.max(0, Math.floor(Number(t.lead)) || 0)),
      repeat: t.repeat,
      loc: String(t.loc ?? "").slice(0, 200),
      checklist: (Array.isArray(t.checklist) ? t.checklist : []).slice(0, 100).map((c) => ({ t: String(c.t).slice(0, 200), d: !!c.d })),
      notes: (Array.isArray(t.notes) ? t.notes : []).slice(-300),
      log: (Array.isArray(t.log) ? t.log : []).slice(-300),
      series_id: UUID.test(t.seriesId ?? "") ? t.seriesId : null,
      next_id: UUID.test(t.nextId ?? "") ? t.nextId : null,
      done_at: t.doneAt && DATUM.test(t.doneAt) ? t.doneAt : null,
    };

    if (bestaandeIds.has(t.id)) {
      const { error } = await supabase.from("werkzaamheden").update(velden).eq("id", t.id);
      if (error) fout(error.message);
      else nrs[t.id] = bestaandeIds.get(t.id)!;
    } else {
      const { data, error } = await supabase
        .from("werkzaamheden")
        .insert({ id: t.id, ...velden, created_by: userId })
        .select("nr")
        .single();
      if (error) fout(error.message);
      else if (data) nrs[t.id] = data.nr;
    }
  }

  for (const id of wijziging.deletes ?? []) {
    if (!UUID.test(id)) continue;
    // Bijlagen uit de opslag halen voordat de rij (en daarmee de verwijzingen) verdwijnt.
    const { data: bij } = await supabase.from("werkzaamheden_bijlagen").select("pad").eq("task_id", id);
    if (bij && bij.length) await supabase.storage.from("werkzaamheden-bijlagen").remove(bij.map((b) => b.pad));
    const { error } = await supabase.from("werkzaamheden").delete().eq("id", id);
    if (error) mislukt.push({ id, reden: error.message });
  }

  return { mislukt, nrs };
}

/* ---------- Samenvatting voor het dashboard (zelfde logica als in de pagina) ---------- */

const dagen = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);
const parseDatum = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export type Timing = { k: "done" | "none" | "late" | "today" | "soon" | "signal" | "later"; d?: number };

export function timing(t: { status: string; due: string | null; lead_days: number }, vandaag: Date): Timing {
  if (t.status === "klaar") return { k: "done" };
  if (!t.due) return { k: "none" };
  const d = dagen(vandaag, parseDatum(t.due));
  if (d < 0) return { k: "late", d };
  if (d === 0) return { k: "today", d };
  if (d <= 7) return { k: "soon", d };
  if (t.lead_days && d <= t.lead_days) return { k: "signal", d };
  return { k: "later", d };
}

const PRIO_RANK = ["urgent", "hoog", "normaal", "laag"];

export function sorteerTaken<T extends { status: string; due: string | null; lead_days: number; prio: string }>(
  lijst: T[],
  vandaag: Date,
): T[] {
  return [...lijst].sort((a, b) => {
    const la = timing(a, vandaag).k === "late" ? 0 : 1;
    const lb = timing(b, vandaag).k === "late" ? 0 : 1;
    if (la !== lb) return la - lb;
    if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
    if (!!a.due !== !!b.due) return a.due ? -1 : 1;
    return PRIO_RANK.indexOf(a.prio) - PRIO_RANK.indexOf(b.prio);
  });
}
