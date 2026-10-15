#!/usr/bin/env node
/**
 * Demodata voor de i-lab hub: vult planning, bestellijst, werkzaamheden,
 * contacten, storingen en facturatie met fictieve gegevens, om te zien hoe de
 * hub er "in bedrijf" uitziet en waar dingen onoverzichtelijk worden.
 *
 *   node scripts/demo-data.mjs seed    # vult (weigert als er al demodata is)
 *   node scripts/demo-data.mjs clear   # verwijdert precies wat seed toevoegde
 *   node scripts/demo-data.mjs status  # toont wat er aan demodata staat
 *
 * Alles wat seed toevoegt wordt (met id) bijgehouden in Supabase, in
 * tool_opslag (tool = "demo-data"), zodat clear alleen die rijen verwijdert en
 * nooit echte gegevens raakt. Gebruikt de service-role-sleutel uit .env.local.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE || !KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt in .env.local");
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function rest(method, p, body, extra = {}) {
  const r = await fetch(`${BASE}/rest/v1/${p}`, {
    method,
    headers: { ...H, Prefer: "return=representation,missing=default", ...extra },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${p} → ${r.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : [];
}
const get = (p) => rest("GET", p);
async function insert(table, rows, manifest, idKey = "id") {
  if (rows.length === 0) return [];
  const uit = [];
  // PostgREST wil bij een bulk-insert in elke rij dezelfde sleutels: groepeer.
  const groepen = new Map();
  for (const r of rows) {
    const sig = Object.keys(r).sort().join("|");
    groepen.set(sig, [...(groepen.get(sig) ?? []), r]);
  }
  for (const groep of groepen.values()) {
    for (let i = 0; i < groep.length; i += 100) {
      uit.push(...(await rest("POST", table, groep.slice(i, i + 100))));
    }
  }
  manifest[table] = [...(manifest[table] ?? []), ...uit.map((r) => r[idKey])];
  return uit;
}

/* ---------- vaste random (zodat seed herhaalbaar is) ---------- */
let seedState = 20261015;
const rnd = () => {
  seedState |= 0;
  seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const chance = (p) => rnd() < p;
const uuid = () => crypto.randomUUID();

/* ---------- datums ---------- */
const z = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const isWork = (d) => d.getDay() >= 1 && d.getDay() <= 5;
const nowD = new Date();
const today = new Date(nowD.getFullYear(), nowD.getMonth(), nowD.getDate());
function workdays(from, count, dir = 1) {
  const out = []; let d = new Date(from);
  while (out.length < count) { if (isWork(d)) out.push(new Date(d)); d = addDays(d, dir); }
  return out;
}
const hm = (m) => `${z(Math.floor(m / 60))}:${z(m % 60)}`;
const stamp = (d, h = 9, m = 0) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x.toISOString(); };

/* ---------- inhoud ---------- */
const SCHOLEN = ["Avelingen Techniek College", "Mavo De Linge", "ROC Merwede Techniek", "Basisschool De Zonnebloem", "Praktijkschool Rivierenland", "Scholengemeenschap Dalem", "Lyceum Waardenburg", "Basisschool Het Kompas", "Technasium Molenwaard"];
const DOCENTEN = ["Mevr. Jansen", "Dhr. Van der Berg", "Mevr. De Wit", "Dhr. Hoekstra", "Mevr. Bakker", "Dhr. Smits", "Mevr. Visser", "Dhr. Mulder", "Mevr. Dijkstra", "Dhr. Kok", "Mevr. Vermeulen", "Dhr. Peters"];
const VAKKEN = ["Robotica introductie", "3D-printen basis", "Arduino workshop", "Lasersnijden ontwerp", "Drones veilig vliegen", "Zorgtechnologie demo", "CNC-instructie", "Elektronica solderen", "Houtbewerking", "Smart Engineering project", "Groen en water", "Installatietechniek praktijk", "Prototype bouwen", "Technisch tekenen", "Programmeren met micro:bit"];
const NIVEAUS = ["vmbo 2", "vmbo 3", "havo 3", "havo 4", "vwo 4", "mbo niveau 2", "mbo niveau 3", "groep 7", "groep 8"];
const BIJEENKOMSTEN = ["Teamoverleg onderwijs", "Ouderavond voorbereiding", "Bedrijvenbezoek gemeente", "Netwerkborrel techniekbedrijven", "Kennismaking nieuwe school", "Leverancier demo", "Stagebegeleiding", "Open middag"];

const manifest = {};

/* ================= SEED ================= */
async function seed() {
  const bestaand = await get("tool_opslag?tool=eq.demo-data&sleutel=eq.manifest");
  if (bestaand.length) {
    console.error("Er staat al demodata. Draai eerst:  node scripts/demo-data.mjs clear");
    process.exit(1);
  }
  const profiles = await get("profiles?select=id,full_name,role");
  const admin = profiles.find((p) => p.role === "admin") ?? profiles[0];
  try {
  const mensen = profiles.filter((p) => p.role !== "docent");
  const labs = await get("labs?select=id,naam,actief,leerlingen_toegestaan&actief=eq.true&order=volgorde");
  const lesLabs = labs.filter((l) => l.leerlingen_toegestaan);
  const alleLabs = labs;

  /* ----- sluitingen ----- */
  const werk = workdays(addDays(today, 1), 20);
  const sluitingDag = werk[8];
  const onderhoudDag = werk[4];
  const sluitingen = await insert(
    "planning_sluitingen",
    [
      { titel: "Studiedag docenten (demo)", van: iso(sluitingDag), tot: iso(sluitingDag), hele_dag: true, lab_ids: null },
      { titel: "Onderhoud ventilatie (demo)", van: iso(onderhoudDag), tot: iso(onderhoudDag), hele_dag: false, start_tijd: "13:00", eind_tijd: "17:00", lab_ids: [lesLabs[2]?.id].filter(Boolean) },
    ],
    manifest,
  );
  void sluitingen;

  /* ----- planning ----- */
  const rangeFrom = iso(addDays(today, -25));
  const rangeTo = iso(addDays(today, 40));
  const bezet = new Map(); // `${lab}|${datum}` -> [[s,e]]
  const bestaandeBoekingen = await get(`bookings?select=lab_id,datum,start_minuten,eind_minuten,status&datum=gte.${rangeFrom}&datum=lte.${rangeTo}`);
  for (const b of bestaandeBoekingen) {
    if (!["pending", "confirmed"].includes(b.status)) continue;
    const k = `${b.lab_id}|${b.datum}`;
    bezet.set(k, [...(bezet.get(k) ?? []), [b.start_minuten, b.eind_minuten]]);
  }
  const geblokkeerd = (lab, datum, s, e) => {
    if (datum === iso(sluitingDag)) return true;
    if (datum === iso(onderhoudDag) && lab === lesLabs[2]?.id && s < 17 * 60 && e > 13 * 60) return true;
    return (bezet.get(`${lab}|${datum}`) ?? []).some(([a, b]) => s < b && a < e);
  };
  function plaats(labs_, datum, len) {
    for (let i = 0; i < 40; i++) {
      const lab = pick(labs_);
      const s = (8 * 60 + 30) + int(0, Math.floor((17 * 60 - len - (8 * 60 + 30)) / 30)) * 30;
      if (!geblokkeerd(lab.id, datum, s, s + len)) {
        const k = `${lab.id}|${datum}`;
        bezet.set(k, [...(bezet.get(k) ?? []), [s, s + len]]);
        return { lab, s, e: s + len };
      }
    }
    return null;
  }
  const boekingen = [];
  function boek({ datum, status, len, reeks, aanvraagDagen = 1, bijeenkomst = false }) {
    const b = bijeenkomst ? alleLabs : lesLabs;
    const bezetten = ["pending", "confirmed"].includes(status);
    let p;
    if (bezetten) { p = plaats(b, datum, len); if (!p) return null; }
    else { const lab = pick(b); const s = (8 * 60 + 30) + int(0, 8) * 30; p = { lab, s, e: s + len }; }
    const docent = bijeenkomst ? pick(["Mevr. Hendriks", "Dhr. Roos", "Mevr. Peeters", "Dhr. De Vries"]) : pick(DOCENTEN);
    const school = bijeenkomst ? pick(["Gemeente Gorinchem (demo)", "i-lab", "Techniekplatform (demo)", "Bouwbedrijf Stevig (demo)"]) : pick(SCHOLEN);
    const vak = bijeenkomst ? pick(BIJEENKOMSTEN) : pick(VAKKEN);
    const aangemaakt = addDays(today, -aanvraagDagen);
    const gewijzigd = [{ at: stamp(aangemaakt, 10, 15), by: docent, action: reeks ? "Aangevraagd (reeks)" : "Aangevraagd" }];
    const rij = {
      id: uuid(),
      lab_id: p.lab.id,
      datum: iso(datum),
      start_tijd: hm(p.s),
      eind_tijd: hm(p.e),
      vak,
      school,
      docent,
      niveau: bijeenkomst ? null : pick(NIVEAUS),
      categorie: bijeenkomst ? "bijeenkomst" : "les",
      type_activiteit: bijeenkomst ? pick(["vergadering", "evenement"]) : pick(["les", "les", "les", "project"]),
      aantal_leerlingen: bijeenkomst ? int(3, 25) : int(12, 32),
      bijzonderheden: chance(0.25) ? pick(["Graag de Dobots klaarzetten.", "Twee leerlingen hebben een rolstoel.", "We komen met een bus, aankomst 09:05.", "Veiligheidsbrillen nodig.", "Laptops zelf meegenomen."]) : null,
      status,
      series_id: reeks ?? null,
      created_by: admin.id,
      created_at: stamp(aangemaakt, 10, 15),
      beoordeeld_door: null,
      beoordeeld_op: null,
      afwijs_reden: null,
      geschiedenis: gewijzigd,
    };
    if (["confirmed", "rejected", "cancelled"].includes(status)) {
      rij.beoordeeld_door = "Test Beheerder";
      rij.beoordeeld_op = stamp(addDays(aangemaakt, 1), 11, 5);
      rij.geschiedenis.push({ at: rij.beoordeeld_op, by: "Test Beheerder", action: status === "rejected" ? "Afgewezen" : "Bevestigd" });
    }
    if (status === "rejected") { rij.afwijs_reden = pick(["Dat lab is die dag in gebruik; Lab 05 is wel vrij.", "Te veel leerlingen voor dit lab.", "Valt tijdens een studiedag."]); }
    if (status === "cancelled") rij.geschiedenis.push({ at: stamp(addDays(aangemaakt, 2), 8, 40), by: docent, action: "Geannuleerd" });
    if (status === "withdrawn") rij.geschiedenis.push({ at: stamp(addDays(aangemaakt, 1), 14, 0), by: docent, action: "Ingetrokken door docent" });
    boekingen.push(rij);
    return rij;
  }

  const verleden = workdays(addDays(today, -1), 15, -1);
  const toekomst = workdays(today, 20);
  // bevestigde lessen verleden + toekomst (vandaag extra, voor de Vandaag-kaart)
  for (const d of verleden) for (let i = 0; i < int(2, 4); i++) boek({ datum: d, status: "confirmed", len: pick([60, 90, 120]), aanvraagDagen: int(5, 20) });
  for (const d of toekomst) for (let i = 0; i < (iso(d) === iso(today) ? 5 : int(1, 3)); i++) boek({ datum: d, status: "confirmed", len: pick([60, 90, 120, 150]), aanvraagDagen: int(3, 12), bijeenkomst: chance(0.12) });
  // open aanvragen (de rij die zich ophoopt)
  for (let i = 0; i < 22; i++) boek({ datum: pick(toekomst.slice(1)), status: "pending", len: pick([60, 90, 120]), aanvraagDagen: int(0, 3), bijeenkomst: chance(0.15) });
  // twee reeksen (wekelijks, als één aanvraag)
  for (const [aantal, lab] of [[4, 0], [3, 1]]) {
    const sid = uuid();
    const basis = pick(toekomst.slice(2, 5));
    const len = 120;
    // zelfde lab en tijd, wekelijks: zoek een vrij tijdstip dat in alle weken past
    let gevonden = null;
    for (let t = 0; t < 60 && !gevonden; t++) {
      const l = lesLabs[(lab + t) % lesLabs.length];
      const s = (8 * 60 + 30) + int(0, 8) * 30;
      const datums = Array.from({ length: aantal }, (_, i) => iso(addDays(basis, 7 * i)));
      if (datums.every((dt) => !geblokkeerd(l.id, dt, s, s + len))) gevonden = { l, s, datums };
    }
    if (!gevonden) continue;
    const docent = pick(DOCENTEN), school = pick(SCHOLEN), vak = pick(VAKKEN), niveau = pick(NIVEAUS);
    for (const dt of gevonden.datums) {
      const k = `${gevonden.l.id}|${dt}`;
      bezet.set(k, [...(bezet.get(k) ?? []), [gevonden.s, gevonden.s + len]]);
      const aangemaakt = addDays(today, -1);
      boekingen.push({
        id: uuid(), lab_id: gevonden.l.id, datum: dt, start_tijd: hm(gevonden.s), eind_tijd: hm(gevonden.s + len),
        vak, school, docent, niveau, categorie: "les", type_activiteit: "les", aantal_leerlingen: int(18, 28),
        bijzonderheden: "Terugkerende les, elke week dezelfde tijd.", status: "pending", series_id: sid, created_by: admin.id,
        created_at: stamp(aangemaakt, 15, 30), geschiedenis: [{ at: stamp(aangemaakt, 15, 30), by: docent, action: `Aangevraagd (reeks van ${aantal} weken)` }],
      });
    }
  }
  // afgehandeld
  for (let i = 0; i < 5; i++) boek({ datum: pick(workdays(addDays(today, 1), 10)), status: "rejected", len: 90, aanvraagDagen: int(2, 6) });
  for (let i = 0; i < 3; i++) boek({ datum: pick(workdays(addDays(today, 1), 10)), status: "cancelled", len: 60, aanvraagDagen: int(4, 9) });
  for (let i = 0; i < 2; i++) boek({ datum: pick(workdays(addDays(today, 1), 10)), status: "withdrawn", len: 60, aanvraagDagen: int(2, 5) });
  await insert("bookings", boekingen, manifest);

  /* ----- bestellijst ----- */
  const PRODUCTEN = [
    ["PLA filament zwart 1kg", "stuks", "Bol.com"], ["PLA filament wit 1kg", "stuks", "Bol.com"], ["Arduino Uno R3 starterkit", "sets", "Kiwi Electronics"],
    ["Soldeertin 0,8 mm 100 g", "stuks", "Conrad"], ["Schuurpapier korrel 120 (set)", "pakken", "Gamma"], ["Houtlijm 750 ml", "stuks", "Praxis"],
    ["Veiligheidsbrillen helder", "stuks", "Viking"], ["USB-C kabels 1 m", "stuks", "Amazon"], ["M3 schroeven en moeren assortiment", "dozen", "Conrad"],
    ["Multiplex 3 mm 600x400", "platen", "Hornbach"], ["Acrylaat transparant 3 mm", "platen", "Hornbach"], ["Breadboards 830 punten", "stuks", "Kiwi Electronics"],
    ["AA batterijen 24 stuks", "pakken", "Action"], ["Drone propellers 5 inch (4 st)", "sets", "Amazon"], ["Jumperkabels 120 stuks", "pakken", "Kiwi Electronics"],
    ["Plakband dubbelzijdig", "rollen", "Action"], ["Stanleymessen reservemesjes", "dozen", "Gamma"], ["Werkhandschoenen maat M", "stuks", "Praxis"],
    ["Servomotoren SG90", "stuks", "Kiwi Electronics"], ["Raspberry Pi 4 behuizing", "stuks", "Conrad"], ["Isolatietape zwart", "rollen", "Action"],
    ["Stofmaskers FFP2", "dozen", "Viking"], ["Kabelbinders assortiment", "pakken", "Action"], ["Epoxy 2-componenten lijm", "stuks", "Praxis"],
    ["LED-strips 5 m", "rollen", "Amazon"], ["Labelprinter etiketten", "rollen", "Viking"],
  ];
  const aanvragers = ["Daan", "Harry", "Sanne", "Mark", "Eline"];
  const bestelRijen = [];
  const mkBestel = (status, i) => {
    const [oms, eenheid, lev] = PRODUCTEN[i % PRODUCTEN.length];
    const aangemaakt = addDays(today, -int(1, 25));
    const nodig = chance(0.6) ? addDays(today, int(-6, 14)) : null;
    const besteld = ["besteld", "binnen"].includes(status) ? addDays(aangemaakt, int(1, 4)) : null;
    const binnen = status === "binnen" ? addDays(besteld, int(2, 6)) : null;
    const wie = pick(aanvragers);
    const id = "bdemo" + Date.now().toString(36) + int(1000, 9999) + i;
    const data = {
      id, omschrijving: oms, factuurtekst: "", aantal: int(1, 12), eenheid, leverancier: lev, aanvrager: wie,
      nodigOp: nodig ? iso(nodig) : "", link: chance(0.5) ? `https://www.${lev.toLowerCase().replace(/[^a-z]/g, "")}.nl/zoek?q=${encodeURIComponent(oms)}` : "",
      foto: "", notitie: chance(0.3) ? pick(["Graag zwart of wit.", "Liefst vóór de les van donderdag.", "Zelfde merk als vorige keer.", "Zie ook offerte in de map."]) : "",
      spoed: status === "aangevraagd" && chance(0.18), status,
      besteldOp: besteld ? iso(besteld) : "", binnenOp: binnen ? iso(binnen) : "",
      prijs: ["besteld", "binnen"].includes(status) ? (int(500, 9000) / 100).toFixed(2).replace(".", ",") : "",
      ordernummer: besteld ? `NL-${int(10000, 99999)}` : "", aangemaaktOp: iso(aangemaakt),
      log: [{ t: `${iso(aangemaakt)} 09:30`, wie, wat: "Aanvraag geplaatst" }],
    };
    if (besteld) data.log.push({ t: `${iso(besteld)} 11:00`, wie: "Daan", wat: "Status Aangevraagd → Besteld" });
    if (binnen) data.log.push({ t: `${iso(binnen)} 14:20`, wie: "Daan", wat: "Status Besteld → Binnen" });
    if (status === "geannuleerd") data.log.push({ t: `${iso(addDays(aangemaakt, 2))} 10:00`, wie: "Daan", wat: "Status Aangevraagd → Geannuleerd" });
    bestelRijen.push({ id, status, aanvrager_id: admin.id, data, created_at: stamp(aangemaakt, 9, 30) });
  };
  let n = 0;
  for (let i = 0; i < 26; i++) mkBestel("aangevraagd", n++);
  for (let i = 0; i < 8; i++) mkBestel("besteld", n++);
  for (let i = 0; i < 12; i++) mkBestel("binnen", n++);
  for (let i = 0; i < 2; i++) mkBestel("geannuleerd", n++);
  await insert("bestel_items", bestelRijen, manifest);

  /* ----- werkzaamheden ----- */
  const TAKEN = [
    ["Lasersnijder lenzen reinigen", "hoog"], ["3D-printers nivelleren", "normaal"], ["Voorraad filament tellen", "laag"], ["Veiligheidskeuring brandblussers controleren", "hoog"],
    ["Gereedschapswand opruimen", "laag"], ["Nieuwe handleiding CNC uitprinten", "normaal"], ["Drone-accu's opladen en testen", "normaal"], ["Stofafzuiging filter vervangen", "hoog"],
    ["Sleutelregistratie bijwerken", "laag"], ["Bestelling Conrad uitpakken en controleren", "normaal"], ["Opslagzone C opruimen", "laag"], ["Eerste hulp koffer aanvullen", "normaal"],
    ["Werkbanken schoonmaken", "laag"], ["Arduino sets controleren op ontbrekende onderdelen", "normaal"], ["Gastles voorbereiden: robotica", "hoog"], ["Rondleiding gemeente voorbereiden", "normaal"],
    ["Sticker labels printen voor nieuwe machines", "normaal"], ["Verlengsnoeren keuren", "hoog"], ["Soldeerstations controleren", "normaal"], ["Planning volgende week doorlopen", "laag"],
  ];
  const takenRijen = [];
  const weekdagen = workdays(addDays(today, -3), 8);
  TAKEN.forEach(([titel, prio], i) => {
    const heeftDatum = i % 5 !== 4; // enkele zonder datum = backlog
    const datum = heeftDatum ? pick(weekdagen) : null;
    const klaar = heeftDatum && datum < today && chance(0.55);
    takenRijen.push({
      titel, beschrijving: chance(0.5) ? pick(["Zie handleiding in de map Documentatie.", "Even afstemmen met Harry.", "Foto toevoegen als het klaar is.", "Mag samen met de stagiair."]) : null,
      datum: datum ? iso(datum) : null, toegewezen_aan: pick(mensen).id, status: klaar ? "afgevinkt" : "open",
      afgevinkt_op: klaar ? stamp(datum, 15, 0) : null, deadline_op: chance(0.3) ? iso(addDays(today, int(-2, 10))) : null,
      prioriteit: prio, gearchiveerd: false, created_by: admin.id,
    });
  });
  // extra opeenhoping: veel open taken op één dag
  const druk = workdays(addDays(today, 1), 1)[0];
  for (let i = 0; i < 9; i++) {
    takenRijen.push({ titel: `${pick(["Controleren", "Opruimen", "Voorbereiden", "Bestellen", "Reinigen"])} ${pick(["zaagmachine", "kast 4", "labdeuren", "gereedschapskar", "printerkamer", "stofzuiger"])}`, beschrijving: null, datum: iso(druk), toegewezen_aan: pick(mensen).id, status: "open", afgevinkt_op: null, deadline_op: null, prioriteit: pick(["normaal", "laag", "hoog"]), gearchiveerd: false, created_by: admin.id });
  }
  await insert("tasks", takenRijen, manifest);

  /* ----- contacten ----- */
  const CONTACTEN = [
    ["Gemeente Gorinchem (demo)", "gemeente", "Onderwijs en jeugd", ["subsidie", "gemeente"]], ["Waardenburg Techniek BV (demo)", "bedrijfsleven", "Machinebouw", ["stages", "sponsoring"]],
    ["Conrad Electronic (demo)", "leverancier", "Elektronica", ["onderdelen", "arduino"]], ["Kiwi Electronics (demo)", "leverancier", "Elektronica", ["raspberry", "servo"]],
    ["Hornbach Dordrecht (demo)", "leverancier", "Bouwmarkt", ["hout", "multiplex"]], ["Mavo De Linge (demo)", "school", "Voortgezet onderwijs", ["lessen"]],
    ["Basisschool De Zonnebloem (demo)", "school", "Primair onderwijs", ["lessen", "groep 8"]], ["Loodgietersbedrijf Van Dam (demo)", "uitvoerder", "Installatie", ["onderhoud"]],
    ["Elektra Service Merwede (demo)", "uitvoerder", "Elektra", ["keuring", "nen3140"]], ["Techniekplatform Zuid-Holland (demo)", "gemeente", "Netwerk", ["netwerk", "events"]],
    ["Groenbedrijf Rivierenland (demo)", "bedrijfsleven", "Groen", ["gastles"]], ["Viking Direct (demo)", "leverancier", "Kantoor en veiligheid", ["brillen", "maskers"]],
  ];
  const contacten = await insert(
    "contacts",
    CONTACTEN.map(([naam, soort, categorie, zoekwoorden]) => ({
      naam, soort, categorie, telefoon: `0183-${int(100000, 999999)}`, email: `info@${naam.toLowerCase().replace(/[^a-z]/g, "").slice(0, 14)}.nl`,
      adres: `${pick(["Marktstraat", "Stationsweg", "Industrieweg", "Kalkhaven", "Molenstraat"])} ${int(1, 120)}, ${pick(["Gorinchem", "Dordrecht", "Leerdam", "Sliedrecht"])}`,
      notities: chance(0.4) ? "Vaste contactpersoon, bij voorkeur bellen na 10:00." : null, zoekwoorden, created_by: admin.id,
    })),
    manifest,
  );
  const afdelingRijen = [];
  for (const c of contacten) {
    const aantal = int(1, 2);
    for (let i = 0; i < aantal; i++) afdelingRijen.push({ contact_id: c.id, naam: i === 0 ? pick(["Verkoop", "Directie", "Onderwijs", "Techniek"]) : pick(["Support", "Inkoop", "Administratie"]), created_by: admin.id });
  }
  const afdelingen = await insert("afdelingen", afdelingRijen, manifest);
  const VOORNAMEN = ["Anouk", "Bas", "Carla", "Dennis", "Esther", "Frank", "Gea", "Hans", "Ilse", "Joost", "Karin", "Luuk", "Marit", "Niels"];
  const ACHTER = ["de Vries", "Jansen", "van Dijk", "Bos", "Vos", "Meijer", "Hoogendoorn", "Verhoeven", "van der Meer", "Kuipers"];
  const personen = [];
  for (const a of afdelingen) {
    for (let i = 0; i < int(1, 3); i++) {
      const verjaardagBinnenkort = chance(0.2);
      const vd = addDays(today, int(1, 25));
      const gb = verjaardagBinnenkort
        ? `${int(1975, 1995)}-${z(vd.getMonth() + 1)}-${z(vd.getDate())}`
        : chance(0.5) ? `${int(1965, 1996)}-${z(int(1, 12))}-${z(int(1, 28))}` : null;
      const naam = `${pick(VOORNAMEN)} ${pick(ACHTER)}`;
      personen.push({ afdeling_id: a.id, naam, titel: pick(["Accountmanager", "Docent", "Directeur", "Inkoper", "Projectleider", "Monteur"]), telefoon: `06-${int(10000000, 99999999)}`, email: `${naam.toLowerCase().replace(/[^a-z]/g, ".")}@voorbeeld.nl`, geboortedatum: gb, tags: chance(0.4) ? [pick(["belangrijk", "prijsafspraak", "snel bereikbaar", "offerte"])] : [] });
    }
  }
  const personenIns = await insert("contactpersonen", personen, manifest);
  const momenten = [];
  for (const p of personenIns) {
    if (chance(0.6)) momenten.push({ contactpersoon_id: p.id, datum: iso(addDays(today, -int(1, 90))), notitie: pick(["Gebeld over levertijd; volgende week bevestiging.", "Offerte ontvangen, doorgestuurd naar Daan.", "Afspraak gemaakt voor rondleiding in november.", "Mail gestuurd over nieuwe prijslijst.", "Kennismaking op de netwerkborrel."]), created_by: admin.id });
  }
  await insert("contactmomenten", momenten, manifest);

  /* ----- storingen ----- */
  const MACHINES = [
    ["LASER-1", "Lasersnijder 60W", "Lasers", "Trotec", "Speedy 100", "Lab 03", 1], ["PRINT-SET", "3D-printers set", "3D-printen", "Prusa", "MK4", "Lab 02", 6],
    ["CNC-1", "CNC freesmachine", "Machines", "Stepcraft", "D.840", "Lab 03", 1], ["DRONE-SET", "Drones set", "Drones", "DJI", "Tello", "Lab 06 Dronetechnologie", 12],
    ["SOLDEER-SET", "Soldeerstations set", "Elektronica", "Weller", "WE1010", "Lab 05", 8], ["VAC-1", "Vacuümvormer", "Machines", "Formech", "508", "Lab 03", 1],
    ["BOOR-SET", "Accuboormachines set", "Handgereedschap", "Bosch", "GSR 18V", "Lab 07", 5], ["STOF-1", "Stofafzuiging werkhal", "Faciliteiten", "Nilfisk", "Attix", "Lab 03", 1],
  ];
  const machines = await insert(
    "machines",
    MACHINES.map(([code, naam, categorie, merk, model, locatie, aantal]) => ({ code, naam, categorie, merk, model, locatie, aantal, melden_aan: true, actief: true, aanschafdatum: iso(addDays(today, -int(100, 1200))) })),
    manifest,
  );
  void machines;
  const STORINGEN = [
    ["LASER-1", null, "defect", "Laser snijdt niet meer door 3 mm multiplex, foutcode E12 in het scherm.", "nieuw"],
    ["PRINT-SET", 3, "gedeeltelijk", "Printbed hecht niet goed, eerste laag laat los.", "nieuw"],
    ["DRONE-SET", 7, "defect", "Drone start niet op, accu is zwaar opgezwollen.", "nieuw"],
    ["CNC-1", null, "gedeeltelijk", "Spindel maakt een schurend geluid boven 10.000 toeren.", "in_behandeling"],
    ["SOLDEER-SET", 2, "defect", "Soldeerstation geen verwarming, lampje blijft uit.", "in_behandeling"],
    ["BOOR-SET", 4, "gedeeltelijk", "Boorkop slipt bij hoge belasting.", "nieuw"],
    ["STOF-1", null, "gedeeltelijk", "Zuigkracht sterk afgenomen, filter vol?", "nieuw"],
    ["PRINT-SET", 5, "defect", "Nozzle verstopt, filament komt er niet meer door.", "in_behandeling"],
    ["VAC-1", null, "gedeeltelijk", "Verwarmingselement wordt niet overal even heet.", "gerepareerd"],
    ["DRONE-SET", 2, "gedeeltelijk", "Eén propeller beschadigd na botsing.", "gerepareerd"],
    ["LASER-1", null, "gedeeltelijk", "Spiegel was vuil, snijdt scheef.", "gerepareerd"],
    ["SOLDEER-SET", 6, "defect", "Soldeerpunt versleten, niet meer te vervangen.", "afgeschreven"],
    ["PRINT-SET", 1, "gedeeltelijk", "Ventilator lawaaiig.", "gerepareerd"],
    ["CNC-1", null, "defect", "Noodstop reageert niet.", "gerepareerd"],
  ];
  await insert(
    "storingen",
    STORINGEN.map(([machine_code, item_nr, ernst, omschrijving, status], i) => {
      const gemeld = addDays(today, -int(0, status === "nieuw" ? 4 : 30));
      const opgelost = ["gerepareerd", "afgeschreven"].includes(status);
      return {
        machine_code, item_nr, ernst, omschrijving, datum: iso(gemeld), gemeld_door: pick(["Mevr. Jansen", "Dhr. Hoekstra", "Sanne", "Mevr. De Wit", "Harry"]), bron: "qr", status,
        gemeld_op: stamp(gemeld, int(8, 15), int(0, 59)),
        opgelost_op: opgelost ? stamp(addDays(gemeld, int(1, 6)), 14, 0) : null,
        oorzaak: opgelost ? pick(["Slijtage", "Vuil", "Verkeerd gebruik", "Defect onderdeel"]) : null,
        reparatie: opgelost ? pick(["Onderdeel vervangen", "Schoongemaakt en afgesteld", "Firmware bijgewerkt"]) : null,
        gerepareerd_door: opgelost ? "Daan" : null, kosten: opgelost && chance(0.6) ? int(5, 180) : null, onderdelen: opgelost && chance(0.4) ? pick(["Nozzle 0,4", "Propellerset", "Verwarmingselement"]) : null,
      };
    }),
    manifest,
  );

  /* ----- facturatie ----- */
  const FACT_ORGS = [
    ["Gemeente Gorinchem (demo)", "A. de Boer", "Kp 4410 Onderwijs", "Stadhuisplein 1", "4201 JA", "Gorinchem"],
    ["Waardenburg Techniek BV (demo)", "P. Smit", "", "Industrieweg 12", "4191 NE", "Geldermalsen"],
    ["Techniekplatform Zuid-Holland (demo)", "M. Jacobs", "TP-2026", "Zuidplein 5", "3083 CW", "Rotterdam"],
    ["Groenbedrijf Rivierenland (demo)", "L. van Rooij", "", "Bovendijk 8", "4231 AA", "Meerkerk"],
  ];
  const TIJDEN = [["08:30", "12:00", 1], ["13:00", "16:30", 1], ["08:30", "17:00", 2], ["17:00", "21:30", 1]];
  const factRijen = [];
  for (let i = 0; i < 14; i++) {
    const o = FACT_ORGS[i % FACT_ORGS.length], t = TIJDEN[i % TIJDEN.length];
    const d = addDays(today, -int(2, 70));
    const nu = stamp(d, 10, 0);
    const gefactureerd = d < addDays(today, -35) ? "Q3 2026" : "";
    const id = "fdemo" + Date.now().toString(36) + i;
    factRijen.push({
      id,
      gewijzigd: nu,
      data: {
        id, datum: iso(d), locatie: "Hoofdlocatie", tijdVan: t[0], tijdTot: t[1], personen: int(6, 30), dagdelen: t[2], borrel: i % 3 === 0,
        extraOms: "", extraBedrag: 0, organisatie: o[0], contact: o[1], telefoon: "0612345678", email: "info@voorbeeld.nl",
        adres: o[3], postcode: o[4], plaats: o[5], factuurEmail: "facturen@voorbeeld.nl", kostenplaats: o[2], opmerkingen: "Demodata",
        tarief: 5, tariefBorrel: 5, gefactureerd, aangemaakt: nu, gewijzigd: nu,
      },
    });
  }
  await insert("facturatie_reserveringen", factRijen, manifest);

  } finally {
    // Ook bij een fout bewaren we wat al is toegevoegd, zodat "clear" het kan opruimen.
    if (Object.keys(manifest).length) {
      await rest("POST", "tool_opslag", [{ tool: "demo-data", sleutel: "manifest", scope: "team", data: { v: JSON.stringify(manifest) }, updated_by: admin.id }]);
    }
  }

  console.log("Demodata toegevoegd:");
  for (const [t, ids] of Object.entries(manifest)) console.log(`  ${t.padEnd(26)} ${ids.length}`);
  console.log("\nVerwijderen kan met:  node scripts/demo-data.mjs clear");
}

/* ================= CLEAR ================= */
const VOLGORDE = ["storingen", "machines", "contactmomenten", "contactpersonen", "afdelingen", "contacts", "bestel_items", "tasks", "bookings", "planning_sluitingen", "facturatie_reserveringen"];
const KOLOM = { machines: "id" };

async function laadManifest() {
  const rij = await get("tool_opslag?tool=eq.demo-data&sleutel=eq.manifest");
  return rij.length ? JSON.parse(rij[0].data.v) : null;
}

async function clear() {
  const m = await laadManifest();
  if (!m) { console.log("Geen demodata gevonden."); return; }
  for (const t of VOLGORDE) {
    const ids = m[t] ?? [];
    let n = 0;
    for (let i = 0; i < ids.length; i += 50) {
      const stuk = ids.slice(i, i + 50);
      const lijst = stuk.map((x) => `"${x}"`).join(",");
      const res = await rest("DELETE", `${t}?${KOLOM[t] ?? "id"}=in.(${lijst})`);
      n += res.length;
    }
    if (ids.length) console.log(`  ${t.padEnd(26)} ${n} verwijderd`);
  }
  await rest("DELETE", "tool_opslag?tool=eq.demo-data&sleutel=eq.manifest");
  console.log("Demodata verwijderd.");
}

async function status() {
  const m = await laadManifest();
  if (!m) { console.log("Geen demodata aanwezig."); return; }
  for (const [t, ids] of Object.entries(m)) console.log(`  ${t.padEnd(26)} ${ids.length}`);
}

const cmd = process.argv[2];
if (cmd === "seed") await seed();
else if (cmd === "clear") await clear();
else if (cmd === "status") await status();
else console.log("Gebruik: node scripts/demo-data.mjs seed | clear | status");
