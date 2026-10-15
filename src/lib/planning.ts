import type { SupabaseClient } from "@supabase/supabase-js";
import { format, subDays } from "date-fns";
import type { Database, ActiviteitType, BoekingCategorie } from "@/lib/supabase/database.types";
import { huidigeDatumAmsterdam } from "@/lib/tijd";
import { stuurEmail } from "@/lib/email";
import { planningMail, type PlanningMailBoeking } from "@/lib/planning-mails";

type Client = SupabaseClient<Database>;

/* ---------- Vorm die de planning-tool gebruikt ---------- */

export type PlanningRoom = {
  id: string; // = lab-naam (uniek)
  name: string; // omschrijving
  capacity: number;
  active: boolean;
  docentBoekbaar: boolean;
  leerlingenToegestaan: boolean;
};

export type PlanningBooking = {
  id: string;
  seriesId: string | null;
  room: string;
  date: string;
  start: string;
  end: string;
  title: string;
  teacherId: string | null;
  teacherName: string;
  school: string;
  level: string;
  students: number;
  notes: string;
  status: string;
  createdAt: string;
  createdBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string;
  history: { at: string; by: string; action: string }[];
  categorie: BoekingCategorie;
  activiteit: ActiviteitType;
  activiteitAnders: string;
};

export type PlanningClosure = {
  id: string;
  title: string;
  from: string;
  to: string;
  allDay: boolean;
  start: string;
  end: string;
  rooms: "all" | string[];
};

export type PlanningSettings = { openFrom: string; openTo: string; expiryWorkdays: number };

export type PlanningData = {
  me: { id: string; name: string; role: "beheerder" | "docent" };
  settings: PlanningSettings;
  rooms: PlanningRoom[];
  bookings: PlanningBooking[];
  closures: PlanningClosure[];
  teachers: { id: string; name: string }[];
};

export type PlanningChange = {
  upserts?: PlanningBooking[];
  deletes?: string[];
  closureUpserts?: PlanningClosure[];
  closureDeletes?: string[];
  rooms?: PlanningRoom[];
  settings?: PlanningSettings;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const TIJD = /^\d{2}:\d{2}$/;
const STATUSSEN = ["pending", "confirmed", "rejected", "withdrawn", "cancelled", "expired"];
const ACTIEF = ["pending", "confirmed"];
const ACTIVITEITEN: ActiviteitType[] = ["les", "project", "vrij_gebruik", "extern_bezoek", "evenement", "vergadering", "anders"];

const hm = (t: string) => t.slice(0, 5);
const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/* ---------- Laden ---------- */

type BoekingRij = {
  id: string;
  lab_id: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  status: string;
  series_id: string | null;
  categorie: BoekingCategorie;
  type_activiteit: ActiviteitType;
  type_activiteit_anders: string | null;
  created_by: string | null;
  docent_id: string | null;
  created_at: string;
  vak: string | null;
  school: string | null;
  docent: string | null;
  niveau: string | null;
  aantal_leerlingen: number | null;
  bijzonderheden: string | null;
  afwijs_reden: string | null;
  beoordeeld_door: string | null;
  beoordeeld_op: string | null;
  geschiedenis: { at: string; by: string; action: string }[] | null;
};

const KOLOMMEN =
  "id, lab_id, datum, start_tijd, eind_tijd, status, series_id, categorie, type_activiteit, type_activiteit_anders, created_by, docent_id, created_at, vak, school, docent, niveau, aantal_leerlingen, bijzonderheden, afwijs_reden, beoordeeld_door, beoordeeld_op, geschiedenis";

async function haalAlles(client: Client, tabel: "bookings" | "bookings_docent_view", vanaf: string): Promise<BoekingRij[]> {
  const rijen: BoekingRij[] = [];
  for (let van = 0; van < 20000; van += 1000) {
    const query = tabel === "bookings" ? client.from("bookings") : client.from("bookings_docent_view");
    const { data } = await query
      .select(KOLOMMEN)
      .gte("datum", vanaf)
      .order("datum")
      .order("start_tijd")
      .range(van, van + 999);
    const stuk = (data ?? []) as unknown as BoekingRij[];
    rijen.push(...stuk);
    if (stuk.length < 1000) break;
  }
  return rijen;
}

export async function laadPlanning(
  supabase: Client,
  user: { id: string; naam: string; crew: boolean },
): Promise<PlanningData> {
  // Verlopen aanvragen eerst afsluiten (en de docent een mail sturen).
  const { data: verlopen } = await supabase.rpc("planning_verlopen_opruimen");
  for (const v of verlopen ?? []) {
    if (!v.email) continue;
    await stuurEmail({
      aan: v.email,
      onderwerp: `i-lab: aanvraag verlopen — ${v.vak}`,
      html: planningMail("verlopen", {
        vak: v.vak,
        datum: v.datum,
        start: hm(v.start_tijd),
        eind: hm(v.eind_tijd),
        lab: v.lab_naam ?? "",
        docent: "",
        school: "",
      }),
    });
  }

  const vanaf = format(subDays(huidigeDatumAmsterdam(), 400), "yyyy-MM-dd");

  const [{ data: labs }, { data: instelling }, { data: sluitingen }, rijen, docenten] = await Promise.all([
    supabase.from("labs").select("*").order("volgorde"),
    supabase.from("planning_instellingen").select("*").limit(1).maybeSingle(),
    supabase.from("planning_sluitingen").select("*").order("van"),
    haalAlles(supabase, user.crew ? "bookings" : "bookings_docent_view", vanaf),
    user.crew
      ? supabase.from("profiles").select("id, full_name, email").eq("role", "docent")
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
  ]);

  const labNaam = new Map((labs ?? []).map((l) => [l.id, l.naam]));
  const naamNaarId = new Map((labs ?? []).map((l) => [l.id, l.naam]));

  const bookings: PlanningBooking[] = rijen.map((r) => {
    const eigen = user.crew || r.created_by === user.id || r.docent_id === user.id;
    return {
      id: r.id,
      seriesId: r.series_id,
      room: labNaam.get(r.lab_id) ?? "Onbekende ruimte",
      date: r.datum,
      start: hm(r.start_tijd),
      end: hm(r.eind_tijd),
      title: eigen ? (r.vak ?? "") : "",
      teacherId: eigen ? (r.docent_id ?? r.created_by) : null,
      teacherName: eigen ? (r.docent ?? "") : "",
      school: eigen ? (r.school ?? "") : "",
      level: eigen ? (r.niveau ?? "") : "",
      students: eigen ? (r.aantal_leerlingen ?? 0) : 0,
      notes: eigen ? (r.bijzonderheden ?? "") : "",
      status: r.status,
      createdAt: r.created_at,
      createdBy: eigen ? r.created_by : null,
      reviewedBy: eigen ? r.beoordeeld_door : null,
      reviewedAt: eigen ? r.beoordeeld_op : null,
      rejectReason: eigen ? (r.afwijs_reden ?? "") : "",
      history: eigen ? (r.geschiedenis ?? []) : [],
      categorie: r.categorie,
      activiteit: r.type_activiteit,
      activiteitAnders: eigen ? (r.type_activiteit_anders ?? "") : "",
    };
  });

  void naamNaarId;
  return {
    me: { id: user.id, name: user.naam, role: user.crew ? "beheerder" : "docent" },
    settings: {
      openFrom: hm(instelling?.open_van ?? "08:30"),
      openTo: hm(instelling?.open_tot ?? "17:00"),
      expiryWorkdays: instelling?.vervalt_na_werkdagen ?? 5,
    },
    rooms: (labs ?? []).map((l) => ({
      id: l.naam,
      name: l.omschrijving ?? "",
      capacity: l.capaciteit,
      active: l.actief,
      docentBoekbaar: l.docent_boekbaar,
      leerlingenToegestaan: l.leerlingen_toegestaan,
    })),
    bookings,
    closures: (sluitingen ?? []).map((c) => ({
      id: c.id,
      title: c.titel,
      from: c.van,
      to: c.tot,
      allDay: c.hele_dag,
      start: c.start_tijd ? hm(c.start_tijd) : "",
      end: c.eind_tijd ? hm(c.eind_tijd) : "",
      rooms: c.lab_ids ? c.lab_ids.map((id) => labNaam.get(id) ?? "").filter(Boolean) : "all",
    })),
    teachers: (docenten.data ?? []).map((d) => ({ id: d.id, name: d.full_name || d.email || "Docent" })),
  };
}

/* ---------- Opslaan ---------- */

export type PlanningResultaat = { mislukt: { id: string; reden: string }[] };

export async function slaPlanningOp(
  supabase: Client,
  user: { id: string; naam: string; crew: boolean },
  wijziging: PlanningChange,
): Promise<PlanningResultaat> {
  const mislukt: PlanningResultaat["mislukt"] = [];
  const { data: labs } = await supabase.from("labs").select("id, naam");
  const labId = new Map((labs ?? []).map((l) => [l.naam, l.id]));

  /* Beheer: ruimtes, instellingen, sluitingen (alleen crew; RLS dwingt het ook af) */
  if (user.crew) {
    for (const [index, room] of (wijziging.rooms ?? []).entries()) {
      const velden = {
        omschrijving: room.name.trim() || null,
        capaciteit: Math.max(1, Math.floor(Number(room.capacity)) || 1),
        actief: !!room.active,
        docent_boekbaar: !!room.docentBoekbaar,
        leerlingen_toegestaan: !!room.leerlingenToegestaan,
        volgorde: index + 1,
      };
      const bestaand = labId.get(room.id);
      if (bestaand) await supabase.from("labs").update(velden).eq("id", bestaand);
      else if (room.id.trim()) {
        const { data } = await supabase.from("labs").insert({ naam: room.id.trim(), ...velden }).select("id, naam").single();
        if (data) labId.set(data.naam, data.id);
      }
    }

    if (wijziging.settings) {
      const s = wijziging.settings;
      if (TIJD.test(s.openFrom) && TIJD.test(s.openTo) && mins(s.openTo) > mins(s.openFrom)) {
        await supabase
          .from("planning_instellingen")
          .update({
            open_van: s.openFrom,
            open_tot: s.openTo,
            vervalt_na_werkdagen: Math.min(20, Math.max(1, Math.floor(Number(s.expiryWorkdays)) || 5)),
          })
          .eq("id", true);
      }
    }

    for (const c of wijziging.closureUpserts ?? []) {
      if (!UUID.test(c.id) || !DATUM.test(c.from) || !DATUM.test(c.to) || c.to < c.from) continue;
      await supabase.from("planning_sluitingen").upsert({
        id: c.id,
        titel: c.title.trim() || "Sluiting",
        van: c.from,
        tot: c.to,
        hele_dag: c.allDay,
        start_tijd: c.allDay ? null : c.start || null,
        eind_tijd: c.allDay ? null : c.end || null,
        lab_ids: c.rooms === "all" ? null : c.rooms.map((n) => labId.get(n)).filter((x): x is string => !!x),
      });
    }
    for (const id of wijziging.closureDeletes ?? []) {
      if (UUID.test(id)) await supabase.from("planning_sluitingen").delete().eq("id", id);
    }
  }

  /* Boekingen */
  const upserts = (wijziging.upserts ?? []).filter((b) => UUID.test(b.id));
  const mailEvents: { type: Parameters<typeof planningMail>[0]; b: PlanningMailBoeking; aan: "crew" | "docent"; docentId: string | null }[] = [];

  if (upserts.length > 0) {
    const { data: bestaandeRijen } = await supabase
      .from("bookings")
      .select("id, status, docent_id, created_by, lab_id, datum, start_tijd, eind_tijd")
      .in("id", upserts.map((b) => b.id));
    const bestaand = new Map((bestaandeRijen ?? []).map((r) => [r.id, r]));

    const { data: sluitingen } = await supabase.from("planning_sluitingen").select("van, tot, hele_dag, start_tijd, eind_tijd, lab_ids");

    for (const b of upserts) {
      const lab = labId.get(b.room);
      const reden = (t: string) => mislukt.push({ id: b.id, reden: t });
      if (!lab) { reden("Onbekende ruimte"); continue; }
      if (!STATUSSEN.includes(b.status)) { reden("Ongeldige status"); continue; }
      if (!DATUM.test(b.date) || !TIJD.test(b.start) || !TIJD.test(b.end) || mins(b.end) <= mins(b.start)) {
        reden("Ongeldige datum of tijd"); continue;
      }

      // Sluitingen blokkeren nieuwe of verplaatste actieve boekingen.
      const old = bestaand.get(b.id);
      const verandert = !old || old.lab_id !== lab || old.datum !== b.date || hm(old.start_tijd) !== b.start || hm(old.eind_tijd) !== b.end || !ACTIEF.includes(old.status);
      if (ACTIEF.includes(b.status) && verandert) {
        const geblokkeerd = (sluitingen ?? []).find((c) => {
          if (b.date < c.van || b.date > c.tot) return false;
          if (c.lab_ids && !c.lab_ids.includes(lab)) return false;
          if (c.hele_dag || !c.start_tijd || !c.eind_tijd) return true;
          return mins(hm(c.start_tijd)) < mins(b.end) && mins(b.start) < mins(hm(c.eind_tijd));
        });
        if (geblokkeerd) { reden("Valt in een sluiting"); continue; }
      }

      const docentId = UUID.test(b.teacherId ?? "") ? b.teacherId : null;
      const velden = {
        lab_id: lab,
        datum: b.date,
        start_tijd: b.start,
        eind_tijd: b.end,
        vak: b.title.trim() || "—",
        school: b.school.trim(),
        docent: b.teacherName.trim() || user.naam,
        niveau: b.level.trim() || null,
        categorie: (b.categorie === "bijeenkomst" ? "bijeenkomst" : "les") as BoekingCategorie,
        type_activiteit: ACTIVITEITEN.includes(b.activiteit) ? b.activiteit : ("les" as ActiviteitType),
        type_activiteit_anders: b.activiteit === "anders" ? b.activiteitAnders.trim() || null : null,
        aantal_leerlingen: Math.max(0, Math.floor(Number(b.students)) || 0),
        bijzonderheden: b.notes.trim() || null,
        status: b.status,
        series_id: UUID.test(b.seriesId ?? "") ? b.seriesId : null,
        beoordeeld_door: b.reviewedBy,
        beoordeeld_op: b.reviewedAt,
        afwijs_reden: b.rejectReason.trim() || null,
        geschiedenis: Array.isArray(b.history) ? b.history.slice(-60) : [],
      };

      let fout: { code?: string; message: string } | null = null;
      if (old) {
        const { error } = await supabase.from("bookings").update({ ...velden, docent_id: user.crew ? docentId : undefined }).eq("id", b.id);
        fout = error;
      } else {
        const { error } = await supabase
          .from("bookings")
          .insert({ id: b.id, ...velden, created_by: user.id, docent_id: user.crew ? (docentId ?? null) : user.id });
        fout = error;
      }
      if (fout) {
        reden(fout.code === "23P01" ? "Dit tijdvak is net door iemand anders gereserveerd" : fout.message);
        continue;
      }

      // Welke mail hoort hierbij?
      const mb: PlanningMailBoeking = {
        vak: velden.vak,
        datum: b.date,
        start: b.start,
        eind: b.end,
        lab: b.room,
        docent: velden.docent,
        school: velden.school,
        reden: velden.afwijs_reden ?? undefined,
      };
      const eigenDocent = old?.docent_id ?? old?.created_by ?? docentId ?? (user.crew ? null : user.id);
      const was = old?.status ?? null;
      if (!old && b.status === "pending") mailEvents.push({ type: "aanvraag", b: mb, aan: "crew", docentId: null });
      else if (!old && b.status === "confirmed" && docentId && docentId !== user.id) {
        mailEvents.push({ type: "ingepland", b: mb, aan: "docent", docentId });
      } else if (was === "pending" && b.status === "confirmed") mailEvents.push({ type: "bevestigd", b: mb, aan: "docent", docentId: eigenDocent });
      else if (was === "pending" && b.status === "rejected") mailEvents.push({ type: "afgewezen", b: mb, aan: "docent", docentId: eigenDocent });
      else if (was === "pending" && b.status === "withdrawn") mailEvents.push({ type: "ingetrokken", b: mb, aan: "crew", docentId: null });
      else if (was === "confirmed" && b.status === "cancelled") {
        if (user.crew) mailEvents.push({ type: "geannuleerd", b: mb, aan: "docent", docentId: eigenDocent });
        else mailEvents.push({ type: "geannuleerd", b: mb, aan: "crew", docentId: null });
      }
    }
  }

  for (const id of wijziging.deletes ?? []) {
    if (!UUID.test(id)) continue;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) mislukt.push({ id, reden: error.message });
  }

  await verstuurMails(supabase, mailEvents);
  return { mislukt };
}

/** Eén mail per (type, ontvanger, reeks/boeking) zodat een reeks niet 20 mails geeft. */
async function verstuurMails(
  supabase: Client,
  events: { type: Parameters<typeof planningMail>[0]; b: PlanningMailBoeking; aan: "crew" | "docent"; docentId: string | null }[],
) {
  if (events.length === 0) return;
  const gezien = new Set<string>();
  const { data: crewAdressen } = events.some((e) => e.aan === "crew") ? await supabase.rpc("crew_emails") : { data: [] as string[] };

  for (const e of events) {
    const sleutel = `${e.type}|${e.aan}|${e.docentId ?? ""}|${e.b.vak}|${e.b.lab}|${e.b.start}`;
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    const onderwerp = `i-lab: ${planningMail.onderwerp(e.type)} — ${e.b.vak}`;
    const html = planningMail(e.type, e.b);
    if (e.aan === "crew") {
      if (crewAdressen && crewAdressen.length > 0) await stuurEmail({ aan: crewAdressen, onderwerp, html });
    } else if (e.docentId) {
      const { data: profiel } = await supabase.from("profiles").select("email").eq("id", e.docentId).maybeSingle();
      if (profiel?.email) await stuurEmail({ aan: profiel.email, onderwerp, html });
    }
  }
}
