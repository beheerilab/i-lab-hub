/* eslint-disable */
// Gebaseerd op bestellijst-ilab-V2.html; Store/rollen zijn aan de hub gekoppeld.
export function mountBestellijst(root, HUB) {
const cleanups = [];
const docOn = (t, f, o) => { document.addEventListener(t, f, o); cleanups.push(() => document.removeEventListener(t, f, o)); };
/* =====================================================================
   i-lab Bestellijst  ·  versie V2
   Opbouw (handig voor de overstap naar i-lab hub):
   1. CONFIG      – statussen, standaard leveranciers
   2. ROLLEN      – wie mag wat. In de hub komen gebruiker + rol uit de login.
   3. OPSLAG      – nu localStorage; in de hub vervangen door API-calls.
   4. LOGICA      – factuurnaam, deadlines, wijzigingslog
   5. WEERGAVE    – Openstaand, Bestelronde, Archief, invulscherm
   ===================================================================== */
const APP_VERSION = 'V2';

/* ---------- 1. CONFIG ---------- */
const STATUS = {
  aangevraagd: { label: 'Aangevraagd' },
  besteld:     { label: 'Besteld' },
  binnen:      { label: 'Binnen' },
  geannuleerd: { label: 'Geannuleerd' }
};
const OPEN_STATUSES = ['aangevraagd', 'besteld'];
const STANDAARD_LEVERANCIERS = ['Bol.com', 'Amazon', 'Action', 'Conrad', 'Kiwi Electronics', 'Gamma', 'Praxis', 'Hornbach', 'IKEA', 'Viking'];
const DAGEN_SPOED = 3; // binnen zoveel dagen nodig en nog niet besteld = oranje

/* ---------- 2. ROLLEN ----------
   Elke rechtregel staat hier op één plek. In i-lab hub: vul getCurrentUser()
   met de ingelogde gebruiker en zijn rol, en laat de server dezelfde regels controleren. */
const ROLES = {
  beheerder: { label: 'Beheerder (inkoop)', aanvragen: true, allesBewerken: true, statusZetten: true, bestelronde: true, archief: true, allesVerwijderen: true, aanvragerKiezen: true },
  collega:   { label: 'Collega',            aanvragen: true, allesBewerken: false, statusZetten: false, bestelronde: false, archief: true, allesVerwijderen: false, aanvragerKiezen: false },
  meekijker: { label: 'Alleen meekijken',   aanvragen: false, allesBewerken: false, statusZetten: false, bestelronde: false, archief: true, allesVerwijderen: false, aanvragerKiezen: false }
};
function getCurrentUser() {           // uit de login van de hub
  return { naam: HUB.me.naam || 'Onbekend', rol: HUB.me.rol in ROLES ? HUB.me.rol : 'collega' };
}
function can(recht, item) {
  const u = getCurrentUser(), r = ROLES[u.rol];
  const eigenOpen = item && item.aanvrager === u.naam && item.status === 'aangevraagd';
  if (recht === 'bewerken')   return r.allesBewerken || (r.aanvragen && eigenOpen);
  if (recht === 'verwijderen') return r.allesVerwijderen || (r.aanvragen && eigenOpen);
  return !!r[recht];
}

/* ---------- 3. OPSLAG ----------
   Eén plek die data leest en schrijft. In de hub: load() → GET /api/bestellingen,
   save() → POST/PATCH per item. De rest van de code hoeft dan niet te veranderen. */
const Store = {
  /* Gedeeld via de hub: alles wat hier verandert gaat naar /api/bestellijst.
     We onthouden wat de server al heeft en sturen alleen het verschil. */
  synced: new Map(), namenSynced: {}, busy: false, again: false, latest: null,
  load() {
    this.synced = new Map(HUB.items.map(i => [i.id, JSON.stringify(i)]));
    this.namenSynced = Object.assign({}, HUB.bestelNamen);
    return { items: JSON.parse(JSON.stringify(HUB.items)), settings: { naam: HUB.me.naam, rol: HUB.me.rol }, seeded: true, bestelNamen: Object.assign({}, HUB.bestelNamen) };
  },
  save(s) { this.latest = s; this.push(); return true; },
  async push() {
    if (this.busy) { this.again = true; return; }
    const s = this.latest; if (!s) return;
    const upserts = s.items.filter(i => this.synced.get(i.id) !== JSON.stringify(i));
    const ids = new Set(s.items.map(i => i.id));
    const deletes = [...this.synced.keys()].filter(id => !ids.has(id));
    const namen = {};
    Object.keys(s.bestelNamen).forEach(k => { if (s.bestelNamen[k] !== this.namenSynced[k]) namen[k] = s.bestelNamen[k]; });
    Object.keys(this.namenSynced).forEach(k => { if (!(k in s.bestelNamen)) namen[k] = ''; });
    if (!upserts.length && !deletes.length && !Object.keys(namen).length) return;
    this.busy = true;
    let mislukt = false;
    try {
      const r = await fetch('/api/bestellijst', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ upserts, deletes, bestelNamen: namen }) });
      if (!r.ok) throw new Error('http ' + r.status);
      const res = await r.json();
      const fout = new Set(res.mislukt || []);
      upserts.forEach(i => { if (!fout.has(i.id)) this.synced.set(i.id, JSON.stringify(i)); });
      deletes.forEach(id => { if (!fout.has(id)) this.synced.delete(id); });
      Object.keys(namen).forEach(k => { if (namen[k]) this.namenSynced[k] = namen[k]; else delete this.namenSynced[k]; });
      if (fout.size) { mislukt = true; toast('Een deel is niet opgeslagen (geen rechten). De lijst wordt ververst.'); }
    } catch (e) { mislukt = true; toast('Opslaan lukte niet. Controleer je verbinding; de lijst wordt ververst.'); }
    this.busy = false;
    if (mislukt) { await this.refresh(true); }
    else if (this.again) { this.again = false; this.push(); }
  },
  /* Haalt wijzigingen van collega's binnen (niet tijdens bewerken of opslaan). */
  async refresh(force) {
    if (this.busy && !force) return;
    if (!force && !$('#overlay').hidden) return;
    try {
      const r = await fetch('/api/bestellijst', { cache: 'no-store' });
      if (!r.ok) return;
      const d = await r.json();
      state.items = d.items; state.bestelNamen = d.bestelNamen;
      this.synced = new Map(d.items.map(i => [i.id, JSON.stringify(i)]));
      this.namenSynced = Object.assign({}, d.bestelNamen);
      render();
    } catch (e) { /* volgende ronde */ }
  }
};
const pollTimer = setInterval(() => Store.refresh(false), 30000);
cleanups.push(() => clearInterval(pollTimer));
docOn('visibilitychange', () => { if (!document.hidden) Store.refresh(false); });

/* ---------- hulpjes ---------- */
const $ = s => root.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const isoOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => isoOf(new Date());
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00'); d.setDate(d.getDate() + n); return isoOf(d); };
const fmt = iso => iso ? new Date(iso + 'T00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : '';
const fmtLong = iso => iso ? new Date(iso + 'T00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const daysUntil = iso => Math.round((new Date(iso + 'T00:00') - new Date(today() + 'T00:00')) / 86400000);
const uid = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const nowStamp = () => { const d = new Date(); return isoOf(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
function normLink(l) { l = (l || '').trim(); if (!l) return ''; return /^https?:\/\//i.test(l) ? l : 'https://' + l; }
function hostOf(l) { try { return new URL(l).hostname.replace(/^www\./, ''); } catch (e) { return 'link'; } }

/* ---------- 4. LOGICA ---------- */
/* Factuurnaam zoals in de administratie: "JJJJ-MM-DD Leverancier Omschrijving".
   Eén bestelling = alle items bij dezelfde leverancier op dezelfde besteldatum.
   Die krijgen samen één factuurnaam, want er komt ook één factuur. */
function orderKey(it) { return it && it.besteldOp ? it.besteldOp + '|' + (it.leverancier || '').trim().toLowerCase() : ''; }
function orderItems(key) { return key ? state.items.filter(i => orderKey(i) === key && i.status !== 'geannuleerd') : []; }
function bouwNaam(datum, lev, lijst, key) {
  lev = (lev || '').trim() || 'Onbekend';
  const eigen = key && state.bestelNamen && state.bestelNamen[key];
  const oms = eigen || [...new Set(lijst.map(i => (i.factuurtekst || i.omschrijving || '').trim()).filter(Boolean))].join(', ');
  return `${datum} ${lev} ${oms}`;
}
function factuurnaam(it) {
  const key = orderKey(it); if (!key) return '';
  const lijst = orderItems(key);
  return bouwNaam(it.besteldOp, it.leverancier, lijst.length ? lijst : [it], key);
}
function deadline(it) {
  if (!it.nodigOp || !OPEN_STATUSES.includes(it.status)) return null;
  const d = daysUntil(it.nodigOp);
  if (d < 0) return { cls: 'late', txt: `Te laat · nodig was ${fmt(it.nodigOp)}` };
  if (d <= DAGEN_SPOED && it.status === 'aangevraagd') return { cls: 'soon', txt: d === 0 ? 'Vandaag nodig' : `Nodig over ${d} ${d === 1 ? 'dag' : 'dagen'}` };
  return { cls: 'plain', txt: `Nodig ${fmt(it.nodigOp)}` };
}
function addLog(it, wat) { (it.log = it.log || []).push({ t: nowStamp(), wie: getCurrentUser().naam, wat }); }
function blank() {
  return { id: uid(), omschrijving: '', factuurtekst: '', aantal: 1, eenheid: 'stuks', leverancier: '', aanvrager: getCurrentUser().naam,
    nodigOp: '', link: '', foto: '', notitie: '', spoed: false, status: 'aangevraagd', besteldOp: '', binnenOp: '',
    prijs: '', ordernummer: '', aangemaaktOp: today(), log: [] };
}
function setStatus(it, st, datum) {
  const oud = it.status; if (oud === st) return;
  it.status = st;
  if (st === 'besteld' && !it.besteldOp) it.besteldOp = datum || today();
  if (st === 'binnen') { if (!it.binnenOp) it.binnenOp = datum || today(); if (!it.besteldOp) it.besteldOp = it.binnenOp; }
  if (st === 'aangevraagd') { it.besteldOp = ''; it.binnenOp = ''; }
  addLog(it, `Status ${STATUS[oud].label} → ${STATUS[st].label}`);
}
function leveranciers() {
  const s = new Set(STANDAARD_LEVERANCIERS);
  state.items.forEach(i => i.leverancier && s.add(i.leverancier.trim()));
  return [...s].sort((a, b) => a.localeCompare(b, 'nl'));
}
function mensen() {
  const s = new Set([getCurrentUser().naam]);
  state.items.forEach(i => i.aanvrager && s.add(i.aanvrager));
  return [...s].sort((a, b) => a.localeCompare(b, 'nl'));
}

/* ---------- voorbeelddata ---------- */
function voorbeelden() {
  const t = today();
  const mk = (o) => Object.assign(blank(), { voorbeeld: true, log: [{ t: (o.aangemaaktOp || t) + ' 09:00', wie: o.aanvrager, wat: 'Aanvraag gedaan' }] }, o);
  return [
    mk({ omschrijving: 'Arduino Uno R3', aantal: 6, eenheid: 'stuks', leverancier: 'Kiwi Electronics', aanvrager: 'Sanne', nodigOp: addDays(t, 2), aangemaaktOp: addDays(t, -1), link: 'https://www.kiwi-electronics.com', notitie: 'Voor de robotica-les van groep 8.' }),
    mk({ omschrijving: 'PLA filament wit 1 kg', aantal: 3, eenheid: 'rollen', leverancier: '', aanvrager: 'Joris', nodigOp: addDays(t, 14), aangemaaktOp: addDays(t, -2), notitie: 'Merk maakt niet uit, wel 1,75 mm.' }),
    mk({ omschrijving: 'Doosje whiteboardstiften', aantal: 2, eenheid: 'dozen', leverancier: 'Bol.com', aanvrager: 'Mila', nodigOp: addDays(t, 9), aangemaaktOp: t, spoed: false }),
    mk({ omschrijving: 'Kabelbinders 200 mm', aantal: 2, eenheid: 'pakken', leverancier: 'Action', aanvrager: 'Mila', status: 'binnen', besteldOp: addDays(t, -13), binnenOp: addDays(t, -11), aangemaaktOp: addDays(t, -14) }),
    mk({ omschrijving: 'Doosje pennen', aantal: 1, eenheid: 'dozen', leverancier: 'Bol.com', aanvrager: 'Daan', status: 'besteld', besteldOp: t, nodigOp: addDays(t, 6), aangemaaktOp: addDays(t, -3) }),
    mk({ omschrijving: 'Populier multiplex 3 mm, 60×30 cm', factuurtekst: 'Populier platen 3mm', aantal: 20, eenheid: 'platen', leverancier: 'Houthandel', aanvrager: 'Sanne', status: 'besteld', besteldOp: addDays(t, -7), nodigOp: addDays(t, -1), aangemaaktOp: addDays(t, -9), notitie: 'Voor de lasersnijder.' }),
    mk({ omschrijving: 'Lijmpistool + lijmsticks', aantal: 4, eenheid: 'sets', leverancier: 'Action', aanvrager: 'Joris', status: 'binnen', besteldOp: addDays(t, -13), binnenOp: addDays(t, -11), aangemaaktOp: addDays(t, -15) }),
    mk({ omschrijving: 'micro:bit V2', aantal: 10, eenheid: 'stuks', leverancier: 'Kiwi Electronics', aanvrager: 'Mila', status: 'binnen', besteldOp: addDays(t, -22), binnenOp: addDays(t, -19), aangemaaktOp: addDays(t, -25), prijs: '189,50', ordernummer: 'KE-448812' }),
    mk({ omschrijving: 'Plotterfolie zwart', aantal: 2, eenheid: 'rollen', leverancier: 'Viking', aanvrager: 'Sanne', status: 'geannuleerd', aangemaaktOp: addDays(t, -20), notitie: 'Toch nog genoeg op voorraad gevonden.' })
  ];
}

/* ---------- state ---------- */
let state = Store.load();
if (!state || !Array.isArray(state.items)) state = { items: [], settings: { naam: HUB.me.naam, rol: HUB.me.rol }, seeded: true, bestelNamen: {} };
if (!state.bestelNamen) state.bestelNamen = {};
if (!state.seeded) { state.items = voorbeelden(); state.seeded = true; Store.save(state); }
const ui = { tab: 'open', q: '', fStatus: 'alle', fUrgent: '', mine: false, sel: new Set(), rondeDatum: today(), justOrdered: [], aq: '', ajaar: 'alle', aStatus: 'alle' };
function save() { Store.save(state); }

/* ---------- 5. WEERGAVE ---------- */
function render() {
  const u = getCurrentUser();
  if (ui.tab === 'ronde' && !can('bestelronde')) ui.tab = 'open';
  if (ui.tab === 'archief' && !can('archief')) ui.tab = 'open';
  $('#ver').textContent = 'i-lab · ' + APP_VERSION;
  $('#demoBanner').hidden = !state.items.some(i => i.voorbeeld);
  $('#newBtn').hidden = !can('aanvragen');
  $('#dl-lev').innerHTML = leveranciers().map(l => `<option value="${esc(l)}">`).join('');
  $('#dl-mensen').innerHTML = mensen().map(l => `<option value="${esc(l)}">`).join('');

  const nOpen = state.items.filter(i => OPEN_STATUSES.includes(i.status)).length;
  const nReq = state.items.filter(i => i.status === 'aangevraagd').length;
  const tabs = [['open', 'Openstaand', nOpen]];
  if (can('bestelronde')) tabs.push(['ronde', 'Bestelronde', nReq]);
  if (can('archief')) tabs.push(['archief', 'Archief', null]);
  $('#tabs').innerHTML = tabs.map(([k, l, n]) => `<button class="tab" role="tab" aria-selected="${ui.tab === k}" data-action="tab" data-tab="${k}">${l}${n != null ? `<span class="n">${n}</span>` : ''}</button>`).join('');

  if (ui.tab === 'open') renderOpen();
  else if (ui.tab === 'ronde') renderRonde();
  else renderArchief();
  renderSticky();
}

function statusPill(st) { return `<span class="pill st-${st}">${STATUS[st].label}</span>`; }
function invChip(it) { return invChipText(factuurnaam(it)); }
function invChipText(n) {
  if (!n) return '';
  return `<div class="inv" data-action="noop" title="Factuurnaam voor de administratie"><code>${esc(n)}</code><button data-action="copy" data-text="${esc(n)}">Kopieer</button></div>`;
}

function renderOpen() {
  const u = getCurrentUser();
  let items = state.items.filter(i => OPEN_STATUSES.includes(i.status));
  const all = items;
  const isLate = i => (deadline(i) || {}).cls === 'late';
  const isSoon = i => (deadline(i) || {}).cls === 'soon' || (i.spoed && i.status === 'aangevraagd');
  if (ui.fStatus !== 'alle') items = items.filter(i => i.status === ui.fStatus);
  if (ui.fUrgent === 'late') items = items.filter(isLate);
  if (ui.fUrgent === 'soon') items = items.filter(isSoon);
  if (ui.mine) items = items.filter(i => i.aanvrager === u.naam);
  if (ui.q) { const q = ui.q.toLowerCase(); items = items.filter(i => [i.omschrijving, i.leverancier, i.aanvrager, i.notitie].join(' ').toLowerCase().includes(q)); }
  const rank = i => { const d = deadline(i); return (i.status === 'aangevraagd' ? 0 : 1) * 10 + (d && d.cls === 'late' ? 0 : i.spoed ? 1 : d && d.cls === 'soon' ? 2 : 3); };
  items.sort((a, b) => rank(a) - rank(b) || (a.nodigOp || '9999').localeCompare(b.nodigOp || '9999'));

  const late = all.filter(i => (deadline(i) || {}).cls === 'late').length;
  const soon = all.filter(i => (deadline(i) || {}).cls === 'soon' || (i.spoed && i.status === 'aangevraagd')).length;
  const summary = `<div class="summary">
    <button type="button" class="sum" aria-pressed="${ui.fStatus === 'aangevraagd' && !ui.fUrgent}" data-action="sumfilter" data-v="aangevraagd"><b>${all.filter(i => i.status === 'aangevraagd').length}</b><span>Nog te bestellen</span></button>
    <button type="button" class="sum" aria-pressed="${ui.fStatus === 'besteld' && !ui.fUrgent}" data-action="sumfilter" data-v="besteld"><b>${all.filter(i => i.status === 'besteld').length}</b><span>Onderweg</span></button>
    <button type="button" class="sum ${soon ? 'warn' : ''}" aria-pressed="${ui.fUrgent === 'soon'}" data-action="sumfilter" data-v="soon"><b>${soon}</b><span>Spoed / binnenkort</span></button>
    <button type="button" class="sum ${late ? 'alert' : ''}" aria-pressed="${ui.fUrgent === 'late'}" data-action="sumfilter" data-v="late"><b>${late}</b><span>Te laat</span></button></div>`;

  const filters = `<div class="filters">
    <input class="search" id="q" type="search" placeholder="Zoek op product, leverancier of naam" value="${esc(ui.q)}">
    <div class="chips">
      ${['alle', 'aangevraagd', 'besteld'].map(s => `<button class="chip" aria-pressed="${ui.fStatus === s}" data-action="fstatus" data-v="${s}">${s === 'alle' ? 'Alles' : s === 'besteld' ? 'Onderweg' : 'Aangevraagd'}</button>`).join('')}
      <button class="chip" aria-pressed="${ui.mine}" data-action="mine">Alleen van mij</button>
    </div></div>`;

  const list = items.length ? `<div class="list">${items.map(card).join('')}</div>` :
    `<div class="empty"><b>${all.length ? 'Niets gevonden met deze filters' : 'Er staat niets open'}</b>${can('aanvragen') ? 'Heb je iets nodig? Klik op “+ Nieuwe aanvraag”.' : ''}</div>`;
  $('#view').innerHTML = summary + filters + list;
}

function card(it) {
  const d = deadline(it);
  const cls = d && d.cls === 'late' ? 'is-late' : (d && d.cls === 'soon') || (it.spoed && it.status === 'aangevraagd') ? 'is-soon' : '';
  const admin = can('statusZetten');
  const acts = [];
  if (it.link) acts.push(`<a class="btn small" href="${esc(it.link)}" target="_blank" rel="noopener" data-action="noop">↗ ${esc(hostOf(it.link))}</a>`);
  if (admin && it.status === 'aangevraagd') acts.push(`<button class="btn small" data-action="quick-besteld" data-id="${it.id}">Markeer besteld</button>`);
  if (admin && it.status === 'besteld') acts.push(`<button class="btn small" data-action="quick-binnen" data-id="${it.id}">Is binnen</button>`);
  return `<article class="item ${cls}" data-action="open" data-id="${it.id}">
    <div class="item-main">
      <div class="item-top">${statusPill(it.status)}${it.spoed ? '<span class="flag spoed">Spoed</span>' : ''}${d ? `<span class="flag ${d.cls}">${esc(d.txt)}</span>` : ''}${it.voorbeeld ? '<span class="flag ex">voorbeeld</span>' : ''}</div>
      <h3><button data-action="open" data-id="${it.id}"><span class="qty">${esc(it.aantal)} ${esc(it.eenheid || '')}</span>${esc(it.omschrijving)}</button></h3>
      <div class="meta"><span>Leverancier: <b>${it.leverancier ? esc(it.leverancier) : '–'}</b></span><span>Voor <b>${esc(it.aanvrager)}</b></span>${it.besteldOp ? `<span>Besteld ${fmt(it.besteldOp)}</span>` : `<span>Aangevraagd ${fmt(it.aangemaaktOp)}</span>`}</div>
      ${it.notitie ? `<div class="note">${esc(it.notitie)}</div>` : ''}
      ${invChip(it)}
    </div>
    <div class="side">
      ${it.foto ? `<button class="thumb" data-action="photo" data-id="${it.id}" aria-label="Foto bekijken"><img src="${it.foto}" alt=""></button>` : ''}
      ${acts.length ? `<div class="actions">${acts.join('')}</div>` : ''}
    </div>
  </article>`;
}

function renderRonde() {
  const req = state.items.filter(i => i.status === 'aangevraagd');
  const groups = {};
  req.forEach(i => { const k = (i.leverancier || '').trim(); (groups[k] = groups[k] || []).push(i); });
  const keys = Object.keys(groups).sort((a, b) => (a === '') - (b === '') || a.localeCompare(b, 'nl'));
  [...ui.sel].forEach(id => { if (!req.find(i => i.id === id)) ui.sel.delete(id); });

  let html = '';
  const just = ui.justOrdered.map(id => state.items.find(i => i.id === id)).filter(Boolean);
  const justOrders = []; const seen = new Set();
  just.forEach(i => { const k = orderKey(i); if (k && !seen.has(k)) { seen.add(k); justOrders.push(i); } });
  if (justOrders.length) {
    html += `<div class="done-box"><h2>Zojuist besteld</h2><p>Eén factuurnaam per bestelling (per leverancier), klaar om te kopiëren.</p>
      <ul>${justOrders.map(i => `<li>${invChip(i)}<span class="hint">${orderItems(orderKey(i)).length} ${orderItems(orderKey(i)).length === 1 ? 'item' : 'items'}</span></li>`).join('')}</ul>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn small" data-action="copy" data-text="${esc(justOrders.map(factuurnaam).join('\n'))}">Kopieer alle namen</button><button class="btn small" data-action="close-just">Sluiten</button></div></div>`;
  }
  html += `<div class="intro"><p>Alle aanvragen die nog besteld moeten worden, per leverancier. Vink aan wat je bestelt en markeer het in één keer als besteld. De aanvragers zien de nieuwe status meteen.</p>
    <button class="btn small" data-action="copy-shoplist">Kopieer boodschappenlijst</button></div>`;
  if (!keys.length) html += `<div class="empty"><b>Geen openstaande aanvragen</b>Er hoeft op dit moment niets besteld te worden.</div>`;
  keys.forEach(k => {
    const its = groups[k].sort((a, b) => (a.nodigOp || '9999').localeCompare(b.nodigOp || '9999'));
    const allSel = its.every(i => ui.sel.has(i.id));
    html += `<section class="group"><div class="group-h ${k ? '' : 'nolev'}">
      <label><input type="checkbox" data-action="selgroup" data-lev="${esc(k)}" ${allSel ? 'checked' : ''} ${k ? '' : 'disabled'}>${k ? esc(k) : 'Nog geen leverancier'}</label>
      <span class="cnt">${its.length} ${its.length === 1 ? 'item' : 'items'}</span></div>
      ${its.map(i => { const d = deadline(i); return `<div class="rrow">
        <input type="checkbox" id="sel-${i.id}" data-action="sel" data-id="${i.id}" ${ui.sel.has(i.id) ? 'checked' : ''} ${k ? '' : 'disabled'} aria-label="Selecteer ${esc(i.omschrijving)}">
        <div style="min-width:0"><div class="t">${esc(i.aantal)} ${esc(i.eenheid || '')} · ${esc(i.omschrijving)} ${i.spoed ? '<span class="flag spoed">Spoed</span>' : ''}</div>
          <div class="m">Voor ${esc(i.aanvrager)}${d ? ` · <span class="flag ${d.cls}">${esc(d.txt)}</span>` : ''}${i.notitie ? ` · ${esc(i.notitie)}` : ''}</div></div>
        <div class="actions">${i.link ? `<a class="btn small" href="${esc(i.link)}" target="_blank" rel="noopener">↗ Open</a>` : ''}${i.foto ? `<button class="btn small" data-action="photo" data-id="${i.id}">Foto</button>` : ''}<button class="btn small" data-action="open" data-id="${i.id}">Details</button></div>
        ${k ? '' : `<div class="levfix"><input id="lev-${i.id}" list="dl-lev" placeholder="Vul leverancier in om te kunnen bestellen" data-action="setlev" data-id="${i.id}"></div>`}
      </div>`; }).join('')}
    </section>`;
  });
  $('#view').innerHTML = html;
}

function renderSticky() {
  const host = $('#stickyHost');
  if (ui.tab !== 'ronde' || !ui.sel.size) { host.innerHTML = ''; return; }
  host.innerHTML = `<div class="sticky"><div class="in"><strong>${ui.sel.size} geselecteerd</strong>
    <label for="r-datum">Besteld op <input type="date" id="r-datum" value="${ui.rondeDatum}"></label>
    <button class="btn primary" data-action="mark-selected">Markeer als besteld</button></div></div>`;
}

function archiefGroepen() {
  let items = state.items.filter(i => i.status === 'binnen' || i.status === 'geannuleerd');
  if (ui.ajaar !== 'alle') items = items.filter(i => (i.besteldOp || i.aangemaaktOp).startsWith(ui.ajaar));
  if (ui.aStatus !== 'alle') items = items.filter(i => i.status === ui.aStatus);
  const groups = new Map();
  items.forEach(i => { const k = i.status === 'binnen' && orderKey(i) ? orderKey(i) : 'los|' + i.id; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); });
  let list = [...groups.entries()].map(([key, its]) => ({
    key, items: its, eerste: its[0], status: its[0].status,
    datum: its[0].besteldOp || its[0].aangemaaktOp,
    binnen: its.map(i => i.binnenOp).filter(Boolean).sort().pop() || '',
    naam: its[0].status === 'binnen' ? factuurnaam(its[0]) : ''
  }));
  if (ui.aq) { const q = ui.aq.toLowerCase(); list = list.filter(g => (g.naam + ' ' + g.items.map(i => [i.omschrijving, i.leverancier, i.aanvrager, i.ordernummer].join(' ')).join(' ')).toLowerCase().includes(q)); }
  return list.sort((a, b) => b.datum.localeCompare(a.datum));
}
function renderArchief() {
  const jaren = [...new Set(state.items.filter(i => i.status === 'binnen' || i.status === 'geannuleerd').map(i => (i.besteldOp || i.aangemaaktOp || '').slice(0, 4)).filter(Boolean))].sort().reverse();
  const groepen = archiefGroepen();
  const admin = can('statusZetten');
  let html = `<div class="filters">
    <input class="search" id="aq" type="search" placeholder="Zoek in het archief" value="${esc(ui.aq)}">
    <select class="chip" id="ajaar" aria-label="Jaar"><option value="alle">Alle jaren</option>${jaren.map(j => `<option ${ui.ajaar === j ? 'selected' : ''}>${j}</option>`).join('')}</select>
    <select class="chip" id="astatus" aria-label="Status"><option value="alle">Binnen en geannuleerd</option>${['binnen', 'geannuleerd'].map(s => `<option value="${s}" ${ui.aStatus === s ? 'selected' : ''}>${STATUS[s].label}</option>`).join('')}</select>
    <button class="btn small" data-action="copy-excel">Kopieer voor Excel</button></div>`;
  if (!groepen.length) html += `<div class="empty"><b>Nog niets in het archief</b>Zodra een bestelling binnen is, komt hij hier te staan.</div>`;
  else html += `<div class="tablewrap"><table><thead><tr><th>Besteld op</th><th>Factuurnaam</th><th>Wat en voor wie</th><th>Binnen op</th><th>Status</th></tr></thead><tbody>
    ${groepen.map(g => `<tr>
      <td>${g.status === 'binnen' ? fmtLong(g.datum) : '–'}</td>
      <td>${g.naam ? invChipText(g.naam) + (admin ? `<details class="rename"><summary>Omschrijving aanpassen</summary><input id="on-${esc(g.key)}" data-action="ordername" data-key="${esc(g.key)}" value="${esc(state.bestelNamen[g.key] || '')}" placeholder="Leeg = automatisch uit de items"></details>` : '') : `<span style="color:var(--muted)">Niet besteld</span>`}</td>
      <td><ul class="olist">${g.items.map(i => `<li><button class="lnk" data-action="open" data-id="${i.id}">${esc(i.aantal)} ${esc(i.eenheid || '')} ${esc(i.omschrijving)}</button> <span class="who-s">· ${esc(i.aanvrager)}</span>${can('aanvragen') ? ` <button class="btn small" data-action="reorder" data-id="${i.id}" title="Opnieuw aanvragen">↻ Opnieuw</button>` : ''}</li>`).join('')}</ul></td>
      <td>${g.binnen ? fmtLong(g.binnen) : '–'}</td><td>${statusPill(g.status)}</td></tr>`).join('')}
    </tbody></table></div>`;
  $('#view').innerHTML = html;
}

/* ---------- invulscherm ---------- */
let editing = null;
function openEditor(id, preset) {
  const isNew = !id;
  const src = isNew ? Object.assign(blank(), preset || {}) : state.items.find(i => i.id === id);
  if (!src) return;
  editing = { isNew, id: src.id, foto: src.foto || '', base: src };
  const editable = isNew ? can('aanvragen') : can('bewerken', src);
  const admin = can('statusZetten');
  const dis = editable ? '' : 'disabled';
  const sheet = $('#sheet');
  sheet.innerHTML = `
    <div class="sheet-h"><h2 id="sheetTitle">${isNew ? 'Nieuwe aanvraag' : editable ? 'Aanvraag bewerken' : 'Aanvraag bekijken'}</h2><button class="x" data-action="close" aria-label="Sluiten">×</button></div>
    <form class="sheet-b" id="form" novalidate>
      ${!isNew ? `<div class="item-top">${statusPill(src.status)}${src.spoed ? '<span class="flag spoed">Spoed</span>' : ''}</div>` : ''}
      ${!editable && !isNew ? `<p class="hint">Je kunt deze aanvraag bekijken. Aanpassen kan alleen ${src.status === 'aangevraagd' ? 'door de aanvrager of inkoop' : 'door inkoop, want hij is al ' + STATUS[src.status].label.toLowerCase()}.</p>` : ''}
      <div class="grid">
        <div class="f c6"><label for="f-oms">Wat is er nodig?</label><input id="f-oms" required value="${esc(src.omschrijving)}" placeholder="bijv. Doosje pennen" ${dis}></div>
        <div class="c6" id="dupHint"></div>
        <div class="f c2"><label for="f-aantal">Aantal</label><input id="f-aantal" type="number" min="0" step="any" inputmode="decimal" value="${esc(src.aantal)}" ${dis}></div>
        <div class="f c2"><label for="f-eenheid">Eenheid</label><input id="f-eenheid" list="dl-eenheid" value="${esc(src.eenheid)}" ${dis}></div>
        <div class="f c2"><label for="f-nodig">Nodig op</label><input id="f-nodig" type="date" value="${esc(src.nodigOp)}" ${dis}></div>
        <div class="f c3"><label for="f-lev">Leverancier</label><input id="f-lev" list="dl-lev" value="${esc(src.leverancier)}" placeholder="bijv. Bol.com" ${dis}></div>
        <div class="f c3"><label for="f-aanvrager">Aanvrager</label><input id="f-aanvrager" list="dl-mensen" value="${esc(src.aanvrager)}" ${editable && can('aanvragerKiezen') ? '' : 'disabled'}></div>
        <div class="f c6"><label for="f-link">Link naar product</label><input id="f-link" type="url" inputmode="url" value="${esc(src.link)}" placeholder="Plak hier de link van de webshop" ${dis}>
          ${src.link ? `<a class="hint" href="${esc(src.link)}" target="_blank" rel="noopener">↗ Open ${esc(hostOf(src.link))}</a>` : ''}</div>
        <div class="f c6"><span class="lbl">Foto</span>
          <div class="photo" id="photoBox"></div></div>
        <div class="f c6"><label for="f-notitie">Notitie</label><textarea id="f-notitie" placeholder="Bijv. kleur, maat, waarvoor het is" ${dis}>${esc(src.notitie)}</textarea></div>
        <div class="f c6 check"><input type="checkbox" id="f-spoed" ${src.spoed ? 'checked' : ''} ${dis}><label for="f-spoed">Spoed: zo snel mogelijk nodig</label></div>
      </div>
      ${admin ? `<div class="adminbox">
        <p class="sec-t">Inkoop</p>
        <div class="grid">
          <div class="f c2"><label for="f-status">Status</label><select id="f-status">${Object.keys(STATUS).map(s => `<option value="${s}" ${src.status === s ? 'selected' : ''}>${STATUS[s].label}</option>`).join('')}</select></div>
          <div class="f c2"><label for="f-besteld">Besteld op</label><input id="f-besteld" type="date" value="${esc(src.besteldOp)}"></div>
          <div class="f c2"><label for="f-binnen">Binnen op</label><input id="f-binnen" type="date" value="${esc(src.binnenOp)}"></div>
          <div class="f c3"><label for="f-prijs">Prijs (€, optioneel)</label><input id="f-prijs" inputmode="decimal" value="${esc(src.prijs)}" placeholder="bijv. 12,95"></div>
          <div class="f c3"><label for="f-order">Ordernummer / track & trace</label><input id="f-order" value="${esc(src.ordernummer)}"></div>
          <div class="f c6"><label for="f-factuur">Korte omschrijving voor factuurnaam</label><input id="f-factuur" value="${esc(src.factuurtekst)}" placeholder="Leeg laten = zelfde als ‘Wat is er nodig?’"></div>
        </div>
        <div class="f"><span class="lbl">Factuurnaam</span><div id="invPreview"></div></div>
      </div>` : (src.besteldOp ? `<div class="f"><span class="lbl">Factuurnaam</span>${invChip(src)}</div>` : '')}
      ${!isNew && src.log && src.log.length ? `<div class="f"><span class="lbl">Geschiedenis</span><ul class="log">${src.log.slice().reverse().map(l => `<li>${esc(l.t)} · <b>${esc(l.wie)}</b> · ${esc(l.wat)}</li>`).join('')}</ul></div>` : ''}
    </form>
    <div class="sheet-f">
      ${!isNew && can('verwijderen', src) ? `<button class="btn danger" data-action="delete">Verwijderen</button>` : ''}
      <div class="r"><button class="btn" data-action="close">${editable || admin ? 'Annuleren' : 'Sluiten'}</button>${editable || admin ? `<button class="btn primary" data-action="save">${isNew ? 'Aanvraag plaatsen' : 'Opslaan'}</button>` : ''}</div>
    </div>`;
  editing.editable = editable;
  renderPhotoBox();
  updatePreview(); updateDup();
  $('#overlay').hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => { const f = editable ? $('#f-oms') : $('#sheet .x'); f && f.focus(); }, 30);
}
function renderPhotoBox() {
  const box = $('#photoBox'); if (!box) return;
  const ed = editing.editable;
  box.innerHTML = editing.foto
    ? `<img src="${editing.foto}" alt="Foto bij aanvraag" data-action="photo-draft"><div class="pt">${ed ? 'Klik op de foto om te vergroten.' : ''}</div>${ed ? `<button type="button" class="btn small" data-action="photo-pick">Vervangen</button><button type="button" class="btn small danger" data-action="photo-remove">Weg</button>` : ''}`
    : ed ? `<div class="pt">Kies een foto of plak een afbeelding (Ctrl+V / Cmd+V), bijvoorbeeld een screenshot van de webshop.</div><button type="button" class="btn small" data-action="photo-pick">Foto kiezen</button>`
         : `<div class="pt">Geen foto toegevoegd.</div>`;
  if (ed) box.insertAdjacentHTML('beforeend', '<input type="file" id="f-foto" accept="image/*">');
}
function updatePreview() {
  const p = $('#invPreview'); if (!p) return;
  const st = $('#f-status').value;
  let bd = $('#f-besteld').value;
  if (!bd && (st === 'besteld' || st === 'binnen')) bd = today();
  const tmp = { besteldOp: bd, leverancier: $('#f-lev').value, omschrijving: $('#f-oms').value, factuurtekst: $('#f-factuur').value };
  const key = orderKey(tmp);
  if (!key) { p.innerHTML = '<p class="hint">Verschijnt zodra er een besteldatum is.</p>'; return; }
  const anderen = orderItems(key).filter(i => i.id !== editing.id);
  p.innerHTML = invChipText(bouwNaam(bd, tmp.leverancier, anderen.concat([tmp]), key)) +
    (anderen.length ? `<p class="hint">Deze bestelling bevat ${anderen.length + 1} items en krijgt één factuurnaam.</p>` : '');
}
function updateDup() {
  const h = $('#dupHint'); if (!h || !editing || !editing.isNew) return;
  const v = ($('#f-oms').value || '').trim().toLowerCase();
  if (v.length < 4) { h.innerHTML = ''; return; }
  const m = state.items.find(i => OPEN_STATUSES.includes(i.status) && i.omschrijving.toLowerCase().includes(v));
  h.innerHTML = m ? `<div class="warnbox">Er staat al een open aanvraag voor “${esc(m.omschrijving)}” van ${esc(m.aanvrager)} (${STATUS[m.status].label.toLowerCase()}). Misschien kun je daarbij aansluiten.</div>` : '';
}
function closeEditor() { $('#overlay').hidden = true; document.body.style.overflow = ''; editing = null; }

function saveEditor() {
  const isNew = editing.isNew;
  const it = isNew ? Object.assign(blank(), { id: editing.id }) : state.items.find(i => i.id === editing.id);
  const before = JSON.parse(JSON.stringify(it));
  if (editing.editable) {
    const oms = $('#f-oms').value.trim();
    if (!oms) { $('#f-oms').focus(); toast('Vul in wat er nodig is.'); return; }
    const aantal = parseFloat(String($('#f-aantal').value).replace(',', '.'));
    if (!(aantal > 0)) { $('#f-aantal').focus(); toast('Vul een aantal groter dan 0 in.'); return; }
    Object.assign(it, {
      omschrijving: oms, aantal, eenheid: $('#f-eenheid').value.trim(), nodigOp: $('#f-nodig').value,
      leverancier: $('#f-lev').value.trim(), link: normLink($('#f-link').value), notitie: $('#f-notitie').value.trim(),
      spoed: $('#f-spoed').checked, foto: editing.foto
    });
    if (can('aanvragerKiezen')) it.aanvrager = $('#f-aanvrager').value.trim() || getCurrentUser().naam;
  }
  if (can('statusZetten') && $('#f-status')) {
    it.besteldOp = $('#f-besteld').value; it.binnenOp = $('#f-binnen').value;
    it.prijs = $('#f-prijs').value.trim(); it.ordernummer = $('#f-order').value.trim(); it.factuurtekst = $('#f-factuur').value.trim();
    const st = $('#f-status').value;
    if (st !== it.status) setStatus(it, st);
    else if (st === 'besteld' && !it.besteldOp) it.besteldOp = today();
  }
  if (isNew) { addLog(it, 'Aanvraag gedaan'); state.items.push(it); }
  else {
    const changed = ['omschrijving', 'aantal', 'eenheid', 'nodigOp', 'leverancier', 'link', 'notitie', 'spoed', 'foto', 'aanvrager', 'besteldOp', 'binnenOp', 'prijs', 'ordernummer', 'factuurtekst'].filter(k => String(before[k] ?? '') !== String(it[k] ?? ''));
    if (changed.length) addLog(it, 'Gewijzigd: ' + changed.map(k => ({ omschrijving: 'omschrijving', aantal: 'aantal', eenheid: 'eenheid', nodigOp: 'nodig op', leverancier: 'leverancier', link: 'link', notitie: 'notitie', spoed: 'spoed', foto: 'foto', aanvrager: 'aanvrager', besteldOp: 'besteldatum', binnenOp: 'binnendatum', prijs: 'prijs', ordernummer: 'ordernummer', factuurtekst: 'factuurtekst' }[k])).join(', '));
  }
  save(); closeEditor(); render();
  toast(isNew ? 'Aanvraag geplaatst' : 'Opgeslagen');
}

/* ---------- foto's ---------- */
function readPhoto(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => { const img = new Image(); img.onload = () => {
      const max = 1000, s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', 0.78)); }; img.onerror = rej; img.src = fr.result; };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}
async function setPhotoFromFile(f) {
  if (!f || !/^image\//.test(f.type)) { toast('Dat is geen afbeelding.'); return; }
  try { editing.foto = await readPhoto(f); renderPhotoBox(); } catch (e) { toast('Deze afbeelding kon niet worden geladen.'); }
}
function showPhoto(src) { const lb = $('#lightbox'); lb.querySelector('img').src = src; lb.hidden = false; }

/* ---------- kopiëren ---------- */
function copyText(t) {
  const fallback = () => { const ta = $('#copyFallback'); ta.value = t; ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) {} toast(ok ? 'Gekopieerd' : 'Kopiëren lukt hier niet. Selecteer de tekst en kopieer handmatig.'); };
  try { navigator.clipboard.writeText(t).then(() => toast('Gekopieerd: ' + (t.length > 60 ? t.slice(0, 57) + '…' : t)), fallback); }
  catch (e) { fallback(); }
}
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }

/* ---------- acties ---------- */
let armedDelete = false;
root.addEventListener('click', e => {
  const el = e.target.closest('[data-action]'); if (!el) return;
  const a = el.dataset.action, id = el.dataset.id;
  const item = id && state.items.find(i => i.id === id);
  switch (a) {
    case 'noop': return;
    case 'tab': ui.tab = el.dataset.tab; render(); break;
    case 'new': openEditor(null); break;
    case 'open': if (item) openEditor(id); break;
    case 'close': closeEditor(); break;
    case 'save': saveEditor(); break;
    case 'delete':
      if (!armedDelete) { armedDelete = true; el.classList.add('armed'); el.textContent = 'Zeker weten? Klik nogmaals'; setTimeout(() => { armedDelete = false; if (el.isConnected) { el.classList.remove('armed'); el.textContent = 'Verwijderen'; } }, 3500); return; }
      armedDelete = false; state.items = state.items.filter(i => i.id !== editing.id); save(); closeEditor(); render(); toast('Verwijderd'); break;
    case 'copy': copyText(el.dataset.text); break;
    case 'fstatus': ui.fStatus = el.dataset.v; ui.fUrgent = ''; render(); break;
    case 'sumfilter': {
      const v = el.dataset.v;
      const actief = (v === 'soon' || v === 'late') ? ui.fUrgent === v : (ui.fStatus === v && !ui.fUrgent);
      if (actief) { ui.fStatus = 'alle'; ui.fUrgent = ''; }          // nogmaals klikken zet het filter weer uit
      else if (v === 'soon' || v === 'late') { ui.fStatus = 'alle'; ui.fUrgent = v; }
      else { ui.fStatus = v; ui.fUrgent = ''; }
      ui.tab = 'open'; render(); break;
    }
    case 'mine': ui.mine = !ui.mine; render(); break;
    case 'photo': if (item && item.foto) showPhoto(item.foto); break;
    case 'photo-draft': if (editing && editing.foto) showPhoto(editing.foto); break;
    case 'photo-pick': { const fi = $('#f-foto'); fi && fi.click(); break; }
    case 'photo-remove': editing.foto = ''; renderPhotoBox(); break;
    case 'quick-besteld':
      if (!item.leverancier) { openEditor(id); toast('Vul eerst de leverancier in.'); return; }
      setStatus(item, 'besteld', today()); save(); render(); toast('Gemarkeerd als besteld. Factuurnaam staat klaar.'); break;
    case 'quick-binnen': setStatus(item, 'binnen', today()); save(); render(); toast('Gemarkeerd als binnen'); break;
    case 'mark-selected': {
      const datum = ($('#r-datum') && $('#r-datum').value) || today();
      const ids = [...ui.sel];
      ids.forEach(i => { const it = state.items.find(x => x.id === i); if (it) setStatus(it, 'besteld', datum); });
      ui.justOrdered = ids; ui.sel.clear(); save(); render(); window.scrollTo({ top: 0, behavior: 'smooth' });
      toast(`${ids.length} ${ids.length === 1 ? 'item' : 'items'} gemarkeerd als besteld`); break;
    }
    case 'close-just': ui.justOrdered = []; render(); break;
    case 'copy-shoplist': {
      const req = state.items.filter(i => i.status === 'aangevraagd' && (!ui.sel.size || ui.sel.has(i.id)));
      const g = {}; req.forEach(i => { const k = i.leverancier || 'Nog geen leverancier'; (g[k] = g[k] || []).push(i); });
      const txt = Object.keys(g).sort().map(k => k + '\n' + g[k].map(i => `- ${i.aantal} ${i.eenheid || ''} ${i.omschrijving}${i.link ? ' (' + i.link + ')' : ''}`.replace(/\s+/g, ' ').replace('- ', '- ')).join('\n')).join('\n\n');
      copyText(txt || 'Geen aanvragen'); break;
    }
    case 'copy-excel': {
      const rows = [['Besteld op', 'Factuurnaam', 'Omschrijving', 'Leverancier', 'Aantal', 'Eenheid', 'Aanvrager', 'Nodig op', 'Binnen op', 'Status', 'Prijs', 'Ordernummer', 'Link', 'Notitie']]
        .concat(archiefGroepen().flatMap(g => g.items).map(i => [i.besteldOp, factuurnaam(i), i.omschrijving, i.leverancier, i.aantal, i.eenheid, i.aanvrager, i.nodigOp, i.binnenOp, STATUS[i.status].label, i.prijs, i.ordernummer, i.link, i.notitie]));
      copyText(rows.map(r => r.map(c => String(c ?? '').replace(/[\t\n]/g, ' ')).join('\t')).join('\n')); break;
    }
    case 'reorder':
      openEditor(null, { omschrijving: item.omschrijving, aantal: item.aantal, eenheid: item.eenheid, leverancier: item.leverancier, link: item.link, foto: item.foto, notitie: item.notitie, factuurtekst: item.factuurtekst }); break;
    case 'clear-demo':
      state.items = state.items.filter(i => !i.voorbeeld); save(); render(); toast('Voorbeelden gewist. Je begint met een lege lijst.'); break;
  }
});
root.addEventListener('change', e => {
  const t = e.target;
    if (t.id === 'f-foto') { setPhotoFromFile(t.files[0]); return; }
  if (t.id === 'ajaar') { ui.ajaar = t.value; render(); return; }
  if (t.id === 'astatus') { ui.aStatus = t.value; render(); return; }
  if (t.id === 'r-datum') { ui.rondeDatum = t.value || today(); return; }
  if (t.id === 'f-status' || t.id === 'f-besteld') { updatePreview(); return; }
  const a = t.dataset.action;
  if (a === 'sel') { t.checked ? ui.sel.add(t.dataset.id) : ui.sel.delete(t.dataset.id); render(); }
  if (a === 'selgroup') { state.items.filter(i => i.status === 'aangevraagd' && (i.leverancier || '').trim() === t.dataset.lev).forEach(i => t.checked ? ui.sel.add(i.id) : ui.sel.delete(i.id)); render(); }
  if (a === 'ordername') { const v = t.value.trim(); if (v) state.bestelNamen[t.dataset.key] = v; else delete state.bestelNamen[t.dataset.key]; save(); render(); toast('Factuurnaam aangepast'); return; }
  if (a === 'setlev') { const it = state.items.find(i => i.id === t.dataset.id); if (it && t.value.trim()) { it.leverancier = t.value.trim(); addLog(it, 'Leverancier ingevuld: ' + it.leverancier); save(); render(); } }
});
root.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'q') { ui.q = t.value; const pos = t.selectionStart; render(); const n = $('#q'); n.focus(); n.setSelectionRange(pos, pos); }
  if (t.id === 'aq') { ui.aq = t.value; const pos = t.selectionStart; render(); const n = $('#aq'); n.focus(); n.setSelectionRange(pos, pos); }
  if (['f-oms', 'f-lev', 'f-factuur'].includes(t.id)) { updatePreview(); if (t.id === 'f-oms') updateDup(); }
});
docOn('paste', e => {
  if (!editing || !editing.editable) return;
  const f = [...(e.clipboardData ? e.clipboardData.items : [])].find(i => i.type.startsWith('image/'));
  if (f) { e.preventDefault(); setPhotoFromFile(f.getAsFile()); toast('Afbeelding toegevoegd'); }
});
docOn('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('#lightbox').hidden) { $('#lightbox').hidden = true; return; }
  if (!$('#overlay').hidden) closeEditor();
});
$('#lightbox').addEventListener('click', () => $('#lightbox').hidden = true);
$('#overlay').addEventListener('click', e => { if (e.target.id === 'overlay') closeEditor(); });
$('#sheet').addEventListener('submit', e => e.preventDefault());
// klikken binnen een kaart op link/knop mag de kaart niet openen
root.addEventListener('click', e => { if (e.target.closest('a[href]')) e.stopPropagation(); }, true);

/* ---------- start ---------- */
(function init() {
    render();
    // Deep link vanaf het dashboard: ?open=<id>
    const oid = new URLSearchParams(location.search).get('open');
    if (oid && state.items.find(i => i.id === oid)) openEditor(oid);
})();
cleanups.push(() => { document.body.style.overflow = ''; });
return () => cleanups.forEach(f => { try { f(); } catch (e) {} });
}
