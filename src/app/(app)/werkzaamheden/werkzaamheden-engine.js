/* eslint-disable */
// Gebaseerd op ilab-werkzaamheden-V2.html; Auth/Store/rechten zijn aan de hub gekoppeld.
export function mountWerkzaamheden(root, HUB){
"use strict";
const cleanups = [];
const docOn = (t, f, o) => { document.addEventListener(t, f, o); cleanups.push(() => document.removeEventListener(t, f, o)); };

/* ---------- Datum-hulp ---------- */
const pad = n => String(n).padStart(2,'0');
const iso = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d); };
const addDays = (d,n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const addMonths = (d,n) => { const x = new Date(d.getFullYear(), d.getMonth()+n, 1); const last = new Date(x.getFullYear(), x.getMonth()+1, 0).getDate(); x.setDate(Math.min(d.getDate(), last)); return x; };
const diffDays = (a,b) => Math.round((b - a) / 86400000);
const TODAY = (()=>{ const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); })();
const TODAY_ISO = iso(TODAY);
const DOW = ['zo','ma','di','wo','do','vr','za'];
const MON = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
const MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
const fmtShort = s => { const d = parse(s); return DOW[d.getDay()]+' '+d.getDate()+' '+MON[d.getMonth()]; };
const fmtLong  = s => { const d = parse(s); return DOW[d.getDay()]+' '+d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear(); };
const fmtNum   = s => { const d = parse(s); return pad(d.getDate())+'-'+pad(d.getMonth()+1)+'-'+d.getFullYear(); };

/* ---------- Vaste lijsten ---------- */
const STATUSES = [
  {id:'plannen', label:'Te plannen', hint:'Nog geen moment gekozen'},
  {id:'week',    label:'Deze week'},
  {id:'bezig',   label:'Bezig'},
  {id:'wacht',   label:'Wacht op…', hint:'Leverancier, monteur of akkoord'},
  {id:'klaar',   label:'Klaar', hint:'Recent afgerond'}
];
const PRIOS = [
  {id:'urgent', label:'Urgent',  color:'#b8322a'},
  {id:'hoog',   label:'Hoog',    color:'#ef9f32'},
  {id:'normaal',label:'Normaal', color:'#0075bf'},
  {id:'laag',   label:'Laag',    color:'#8592ab'}
];
const CATS = [
  {id:'onderhoud', label:'Onderhoud',        color:'var(--c-onderhoud)', hex:'#0075bf'},
  {id:'gebouw',    label:'Gebouw',           color:'var(--c-gebouw)',    hex:'#15807a'},
  {id:'veilig',    label:'Veiligheid',       color:'var(--c-veilig)',    hex:'#c43b2f'},
  {id:'inkoop',    label:'Inkoop',           color:'var(--c-inkoop)',    hex:'#d9822b'},
  {id:'lessen',    label:'Lessen & events',  color:'var(--c-lessen)',    hex:'#8a3f9c'},
  {id:'admin',     label:'Administratie',    color:'var(--c-admin)',     hex:'#5a6889'}
];
const REPEATS = [
  {id:'',    label:'Eenmalig'},
  {id:'w1',  label:'Elke week'},
  {id:'w2',  label:'Elke 2 weken'},
  {id:'m1',  label:'Elke maand'},
  {id:'m3',  label:'Elk kwartaal'},
  {id:'m6',  label:'Elk half jaar'},
  {id:'m12', label:'Elk jaar'},
  {id:'m24', label:'Elke 2 jaar'}
];
const LEADS = [
  {d:0, label:'Geen signaal'}, {d:7, label:'1 week vooraf'}, {d:14, label:'2 weken vooraf'},
  {d:28, label:'4 weken vooraf'}, {d:42, label:'6 weken vooraf'}, {d:56, label:'8 weken vooraf'}, {d:91, label:'3 maanden vooraf'}
];
const byId = (list,id) => list.find(x => x.id === id);
function nextDate(isoDate, rep){
  if(!rep) return null;
  const d = parse(isoDate), n = parseInt(rep.slice(1),10);
  return iso(rep[0] === 'w' ? addDays(d, n*7) : addMonths(d, n));
}

/* ---------- Rollen & rechten ---------- */
const ME = HUB.me;   // { id, naam, rol: 'beheerder' | 'collega' } uit de hub-login
/* Beheerder: alles. Collega: eigen taken en 'samen'-taken verschuiven, overdragen, afvinken en updates plaatsen. */
function can(action, t){
  const admin = ME.rol === 'beheerder';
  switch(action){
    case 'create': case 'edit': case 'delete': return admin;
    case 'settings': return false;
    case 'move': case 'check': case 'assign': case 'note':
      if(admin) return true;
      return !!t && (t.who === ME.id || t.who === 'samen');
  }
  return false;
}

/* ---------- Opslag (in de hub: Supabase) ---------- */
const Store = {
  synced: new Map(), busy: false, again: false, latest: null,
  mark(d){ this.synced = new Map(d.tasks.map(t => [t.id, JSON.stringify(t)])); },
  load(){ const d = JSON.parse(JSON.stringify(HUB)); const o = { settings:{ people:d.people }, tasks:d.tasks, bijlagen:d.bijlagen || {} }; this.mark(o); return o; },
  save(d){ this.latest = d; this.push(); },
  async push(){
    if(this.busy){ this.again = true; return; }
    const d = this.latest; if(!d) return;
    const upserts = d.tasks.filter(t => this.synced.get(t.id) !== JSON.stringify(t));
    const have = new Set(d.tasks.map(t => t.id));
    const deletes = [...this.synced.keys()].filter(id => !have.has(id));
    if(!upserts.length && !deletes.length) return;
    this.busy = true; let failed = false;
    try{
      const r = await fetch('/api/werkzaamheden', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ upserts, deletes }) });
      if(!r.ok) throw new Error('http ' + r.status);
      const res = await r.json(); const bad = new Set((res.mislukt || []).map(x => x.id));
      upserts.forEach(t => { if(!bad.has(t.id)){ if(res.nrs && res.nrs[t.id]) t.nr = res.nrs[t.id]; this.synced.set(t.id, JSON.stringify(t)); } });
      deletes.forEach(id => { if(!bad.has(id)) this.synced.delete(id); });
      if(bad.size){ failed = true; toast('Niet opgeslagen: ' + res.mislukt[0].reden + (bad.size > 1 ? ' (+' + (bad.size - 1) + ')' : '')); }
      else render();
    }catch(e){ failed = true; toast('Opslaan lukte niet. Controleer je verbinding; de pagina wordt ververst.'); }
    this.busy = false;
    if(failed) await this.refresh(true);
    else if(this.again){ this.again = false; this.push(); }
  },
  async refresh(force){
    if(this.busy && !force) return;
    if(!force && !$('#ov').hidden) return;
    try{
      const r = await fetch('/api/werkzaamheden', { cache:'no-store' }); if(!r.ok) return;
      const d = await r.json();
      data.tasks = d.tasks; data.bijlagen = d.bijlagen || {}; data.settings.people = d.people;
      this.mark(data); render();
    }catch(e){}
  }
};
const UI_KEY = 'ilab-werkzaamheden-ui';
function loadUI(){ try{ return JSON.parse(localStorage.getItem(UI_KEY)) || {}; }catch(e){ return {}; } }
function saveUI(){ try{ localStorage.setItem(UI_KEY, JSON.stringify({tab:state.tab, group:state.group, role:state.role, horizon:state.horizon, showSig:state.showSig})); }catch(e){} }

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c === 'x' ? r : (r&3|8)).toString(16); }));

/* ---------- Staat ---------- */
let data = Store.load();
const ui = loadUI();
const state = {
  tab: ['bord','persoon','kalender','vooruit'].includes(ui.tab) ? ui.tab : 'bord', group: ui.group || 'status',
  horizon: ui.horizon || 6, showSig: ui.showSig !== false,
  q:'', who:'', cat:'', quick:'',
  calMonth: new Date(TODAY.getFullYear(), TODAY.getMonth(), 1),
  quickAdd: null, showAllDone:false
};
data.tasks.forEach(t => { t.notes = t.notes || []; });
const save = () => Store.save(data);
const woNr = t => t.nr ? 'WO-' + String(t.nr).padStart(4,'0') : 'WO-nieuw';
const $ = s => root.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const person = id => data.settings.people.find(p => p.id === id);
const personName = id => id === 'samen' ? 'Samen' : (person(id)?.name || 'Niet toegewezen');
const meName = () => person(ME.id)?.name || ME.naam;

/* ---------- Iconen ---------- */
const I = {
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  rep:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>',
  chk:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  left:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  right:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  msg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>'
};

/* ---------- Afgeleide info ---------- */
function timing(t){
  if(t.status === 'klaar') return {k:'done'};
  if(!t.due) return {k:'none'};
  const d = diffDays(TODAY, parse(t.due));
  if(d < 0) return {k:'late', d};
  if(d === 0) return {k:'today', d};
  if(d <= 7) return {k:'soon', d};
  if(t.lead && d <= t.lead) return {k:'signal', d};
  return {k:'later', d, sigIn: t.lead ? d - t.lead : null};
}
function dueBadge(t){
  const tm = timing(t);
  if(tm.k === 'done') return t.doneAt ? `<span class="due done">✓ ${esc(fmtShort(t.doneAt))}</span>` : '';
  if(tm.k === 'none') return '';
  let txt = fmtShort(t.due);
  if(tm.k === 'late') txt = (-tm.d === 1 ? '1 dag' : -tm.d+' dagen') + ' te laat';
  if(tm.k === 'today') txt = 'Vandaag';
  if(tm.k === 'soon') txt = (tm.d === 1 ? 'Morgen' : fmtShort(t.due));
  return `<span class="due ${tm.k}" title="Deadline ${esc(fmtLong(t.due))}">${I.cal}${esc(txt)}</span>`;
}
const AV_BG = ['var(--p-daan)', 'var(--p-collega)', 'linear-gradient(135deg,#8a3f9c 0%,#c26bd1 100%)', 'linear-gradient(135deg,#d9822b 0%,#f2b05c 100%)', 'linear-gradient(135deg,#c43b2f 0%,#e8776c 100%)', 'var(--grad)'];
function avatar(id, size){
  const st = size ? `style="width:${size}px;height:${size}px"` : '';
  const ps = data.settings.people;
  if(id === 'samen') return `<span class="avs">${ps.slice(0,2).map(p => avatar(p.id)).join('')}</span>`;
  const p = person(id);
  if(!p) return `<span class="av none" ${st} title="Niet toegewezen">?</span>`;
  const bg = AV_BG[Math.max(0, ps.findIndex(x => x.id === id)) % AV_BG.length];
  const ini = p.name.split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase();
  return `<span class="av" ${st} style="background:${bg}" title="${esc(p.name)}">${esc(ini)}</span>`;
}
const catLabel = c => { const x = byId(CATS, c) || CATS[0]; return `<span class="lbl" style="background:${x.color}">${esc(x.label)}</span>`; };
const prioLabel = p => { const x = byId(PRIOS, p) || PRIOS[2]; return `<span class="prio ${x.id}">${esc(x.label)}</span>`; };
const prioRank = p => PRIOS.findIndex(x => x.id === p);
function sortTasks(a,b){
  const ta = timing(a), tb = timing(b);
  const la = ta.k === 'late' ? 0 : 1, lb = tb.k === 'late' ? 0 : 1;
  if(la !== lb) return la - lb;
  if(a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
  if(!!a.due !== !!b.due) return a.due ? -1 : 1;
  return prioRank(a.prio) - prioRank(b.prio);
}
function matches(t){
  if(state.who){
    if(state.who === 'none' ? t.who : (t.who !== state.who && !(t.who === 'samen' && state.who !== 'samen'))) return false;
  }
  if(state.cat && t.cat !== state.cat) return false;
  if(state.q){
    const q = state.q.toLowerCase();
    if(![t.title, t.descr, t.loc, ...(t.checklist||[]).map(c => c.t)].join(' ').toLowerCase().includes(q)) return false;
  }
  if(state.quick){
    const k = timing(t).k;
    if(state.quick === 'late' && k !== 'late') return false;
    if(state.quick === 'week' && !(k === 'today' || k === 'soon')) return false;
    if(state.quick === 'signal' && k !== 'signal') return false;
    if(state.quick === 'mine'){ if(!(t.who === ME.id || t.who === 'samen')) return false; }
  }
  return true;
}
const openTasks = () => data.tasks.filter(t => t.status !== 'klaar');

/* Toekomstige herhalingen (voor kalender en vooruitblik) */
function projections(until){
  const out = [];
  openTasks().forEach(t => {
    if(!t.repeat || !t.due) return;
    let d = nextDate(t.due, t.repeat), n = 0;
    while(d && d <= until && n < 80){ out.push({ghost:true, src:t, due:d}); d = nextDate(d, t.repeat); n++; }
  });
  return out;
}

/* Voor het hub-dashboard */
function dashboardSummary(){
  const open = openTasks();
  const late = open.filter(t => timing(t).k === 'late');
  const week = open.filter(t => ['today','soon'].includes(timing(t).k));
  const sig  = open.filter(t => timing(t).k === 'signal');
  const top = [...late, ...week, ...sig].sort(sortTasks).slice(0,5);
  return {late:late.length, week:week.length, signal:sig.length, top};
}

/* ---------- Mutaties ---------- */
function log(t, txt){ t.log = t.log || []; t.log.push({at:TODAY_ISO, by:meName(), txt}); }
function completeTask(t){
  t.status = 'klaar'; t.doneAt = TODAY_ISO; log(t, 'Afgerond');
  if(t.repeat){
    let nd = nextDate(t.due || TODAY_ISO, t.repeat);
    if(nd <= TODAY_ISO) nd = nextDate(TODAY_ISO, t.repeat);
    const n = Object.assign({}, t, {
      id:uid(), nr:0, notes:[], status:'plannen', due:nd, doneAt:null, nextId:null, createdAt:TODAY_ISO,
      checklist:(t.checklist||[]).map(c => ({t:c.t, d:false})),
      log:[{at:TODAY_ISO, by:'Systeem', txt:'Automatisch ingepland na afronden van de vorige keer'}]
    });
    t.nextId = n.id;
    data.tasks.push(n);
    return n;
  }
  return null;
}
function reopenTask(t, status){
  t.status = status; t.doneAt = null; log(t, 'Teruggezet naar '+byId(STATUSES,status).label);
  if(t.nextId){
    const n = data.tasks.find(x => x.id === t.nextId);
    if(n && n.status === 'plannen' && (n.log||[]).length <= 1){ data.tasks = data.tasks.filter(x => x !== n); }
    t.nextId = null;
  }
}
function moveTask(id, to){
  const t = data.tasks.find(x => x.id === id); if(!t) return;
  if(state.group === 'prio' && state.tab === 'bord'){
    if(!can('edit', t) || t.prio === to) return;
    t.prio = to; log(t, 'Prioriteit: '+byId(PRIOS,to).label); save(); render();
    toast(`“${t.title}” → ${byId(PRIOS,to).label}`); return;
  }
  if(!can('move', t) || t.status === to) return;
  if(to === 'klaar'){
    const n = completeTask(t); save(); render();
    toast(n ? `Afgerond. De volgende keer staat al gepland op ${fmtLong(n.due)}.` : `“${t.title}” is afgerond.`);
    return;
  }
  if(t.status === 'klaar') reopenTask(t, to);
  else { t.status = to; log(t, 'Verplaatst naar '+byId(STATUSES,to).label); }
  save(); render();
}

function assignTask(id, who){
  const t = data.tasks.find(x => x.id === id);
  if(!t || t.who === who || !can('assign', t)) return false;
  if(ME.rol !== 'beheerder' && who === '') return false;
  const from = personName(t.who);
  t.who = who; log(t, `Overgedragen van ${from} aan ${personName(who)}`);
  save(); toast(`“${t.title}” staat nu bij ${personName(who)}.`);
  return true;
}
const otherPerson = id => { const ps = data.settings.people; if(ps.length !== 2) return null; return id === ps[0].id ? ps[1].id : id === ps[1].id ? ps[0].id : null; };

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg){ const el = $('#toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true, 3600); }

/* ---------- Render: kop, cijfers, filters ---------- */
function renderChrome(){
  $('#btn-new').hidden = !can('create');
  root.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === state.tab)));
  $('#groupby').hidden = state.tab !== 'bord';
  root.querySelectorAll('[data-group]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.group === state.group)));

  const s = dashboardSummary();
  const open = openTasks().length;
  const st = (k, cls, n, label, sub) => `<button type="button" class="wk-stat ${cls} ${state.quick === k ? 'on' : ''}" data-quick="${k}" aria-pressed="${state.quick === k}"><strong>${n}</strong><span>${label}</span><small>${sub}</small></button>`;
  $('#stats').innerHTML =
    st('late','late', s.late, 'Te laat', 'deadline verstreken') +
    st('week','week', s.week, 'Deze week', 'deadline binnen 7 dagen') +
    st('signal','sig', s.signal, 'Nu voorbereiden', 'signaalmoment bereikt') +
    `<div class="wk-stat static"><strong>${open}</strong><span>Open taken</span><small>totaal, alle personen</small></div>`;

  const whoSel = $('#f-who');
  whoSel.innerHTML = `<option value="">Iedereen</option>` + data.settings.people.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('') + `<option value="samen">Samen</option><option value="none">Niet toegewezen</option>`;
  whoSel.value = state.who;
  const catSel = $('#f-cat');
  catSel.innerHTML = `<option value="">Alle categorieën</option>` + CATS.map(c => `<option value="${c.id}">${esc(c.label)}</option>`).join('');
  catSel.value = state.cat;
  const qk = [['late','Te laat'],['week','Deze week'],['signal','Nu voorbereiden']];
  qk.push(['mine','Mijn taken']);
  $('#quick').innerHTML = qk.map(([k,l]) => `<button type="button" class="chip" data-quick="${k}" aria-pressed="${state.quick === k}">${l}</button>`).join('');
  $('#f-clear').hidden = !(state.q || state.who || state.cat || state.quick);
}

/* ---------- Render: kaart & kolom ---------- */
function cardHTML(t, colIds){
  const tm = timing(t);
  const cl = t.checklist || [];
  const clDone = cl.filter(c => c.d).length;
  const drag = (state.group === 'prio' && state.tab === 'bord') ? can('edit', t) && t.status !== 'klaar' : can('move', t);
  let move = '', hand = '';
  const other = otherPerson(t.who);
  if(state.tab === 'persoon' && other && t.status !== 'klaar' && can('assign', t)){
    hand = `<button type="button" class="hand" data-hand="${t.id}" data-to="${other}" title="Overdragen aan ${esc(personName(other))}">⇄ ${esc(personName(other))}</button>`;
  }
  if(drag && colIds){
    const key = state.group === 'prio' && state.tab === 'bord' ? t.prio : t.status;
    const i = colIds.indexOf(key);
    const prev = i > 0 ? colIds[i-1] : null, next = i < colIds.length - 1 ? colIds[i+1] : null;
    if(prev || next || hand) move = `<div class="c-move">${hand}${prev ? `<button type="button" data-move="${t.id}" data-to="${prev}" title="Naar ${esc(colLabel(prev))}" aria-label="Naar ${esc(colLabel(prev))}">${I.left}</button>` : ''}${next ? `<button type="button" data-move="${t.id}" data-to="${next}" title="Naar ${esc(colLabel(next))}" aria-label="Naar ${esc(colLabel(next))}">${I.right}</button>` : ''}</div>`;
  }
  if(!move && hand) move = `<div class="c-move">${hand}</div>`;
  let sig = '';
  if(tm.k === 'later' && tm.sigIn !== null && tm.sigIn <= 14) sig = `<div class="c-sig">Signaal over ${tm.sigIn === 1 ? '1 dag' : tm.sigIn + ' dagen'}</div>`;
  return `<article class="card ${tm.k === 'late' ? 'late' : ''} ${t.status === 'klaar' ? 'isdone' : ''}" data-open="${t.id}" ${drag ? 'draggable="true"' : ''} tabindex="0" aria-label="${esc(t.title)}">
    <div class="c-labels">${catLabel(t.cat)}${t.prio !== 'normaal' && !(state.group === 'prio' && state.tab === 'bord') ? prioLabel(t.prio) : ''}</div>
    <div class="c-title">${esc(t.title)}</div>
    ${t.descr ? `<div class="c-desc">${esc(t.descr)}</div>` : ''}
    ${sig}
    <div class="c-meta">
      ${dueBadge(t)}
      ${t.repeat ? `<span class="ico" title="${esc(byId(REPEATS,t.repeat).label)}">${I.rep}</span>` : ''}
      ${cl.length ? `<span class="ico ${clDone === cl.length ? 'full' : ''}" title="Checklist">${I.chk}${clDone}/${cl.length}</span>` : ''}
      ${(t.notes||[]).length ? `<span class="ico" title="${t.notes.length} update(s)">${I.msg}${t.notes.length}</span>` : ''}
      ${t.loc ? `<span class="ico" title="${esc(t.loc)}">${I.pin}</span>` : ''}
      <span class="sp"></span>
      ${avatar(t.who)}
    </div>
    ${move}
  </article>`;
}
function colLabel(id){ return (byId(STATUSES,id) || byId(PRIOS,id) || {}).label || id; }
function columnHTML(col, tasks, colIds, ctx){
  const isPrio = !!col.color;
  let list = tasks, more = '';
  if(col.id === 'klaar' && !isPrio){
    const lim = iso(addDays(TODAY, -14));
    const sorted = tasks.filter(t => t.doneAt).sort((a,b) => b.doneAt.localeCompare(a.doneAt));
    const recent = sorted.filter(t => t.doneAt >= lim);
    list = state.showAllDone ? sorted : recent;
    if(sorted.length > recent.length) more = `<button type="button" class="col-more" data-alldone>${state.showAllDone ? 'Alleen de laatste 14 dagen tonen' : 'Ook oudere afgeronde taken tonen'}</button>`;
  } else list = [...tasks].sort(sortTasks);
  const qaKey = (ctx || '') + col.id;
  const qa = (can('create') && col.id !== 'klaar') ? (state.quickAdd === qaKey
    ? `<div class="qa"><textarea id="qa-input" placeholder="Wat moet er gebeuren?" aria-label="Titel nieuwe taak"></textarea><div class="qa-row"><button type="button" class="btn primary sm" data-qa-save="${qaKey}" data-col="${col.id}" data-ctx="${ctx||''}">Toevoegen</button><button type="button" class="btn ghost sm" data-qa-cancel>Annuleren</button></div></div>`
    : `<button type="button" class="addbtn" data-qa="${qaKey}">+ Taak toevoegen</button>`) : '';
  return `<section class="col" data-col="${col.id}" data-ctx="${ctx||''}">
    <div class="col-h"><h3>${isPrio ? `<span class="pdot" style="background:${col.color}"></span>` : ''}${esc(col.label)}</h3><span class="cnt">${list.length}</span></div>
    ${col.hint && !ctx ? `<div class="col-hint">${esc(col.hint)}</div>` : ''}
    ${list.length ? list.map(t => cardHTML(t, colIds)).join('') : `<div class="col-empty">${state.quick || state.q || state.who || state.cat ? 'Niets binnen dit filter' : 'Leeg'}</div>`}
    ${more}${qa}
  </section>`;
}

/* ---------- Render: weergaven ---------- */
function viewBord(){
  const tasks = data.tasks.filter(matches);
  if(state.group === 'prio'){
    const ids = PRIOS.map(p => p.id);
    const open = tasks.filter(t => t.status !== 'klaar');
    return `<div class="board" style="--cols:4">${PRIOS.map(p => columnHTML(p, open.filter(t => t.prio === p.id), ids)).join('')}</div>`;
  }
  const ids = STATUSES.map(s => s.id);
  return `<div class="board" style="--cols:5">${STATUSES.map(s => columnHTML(s, tasks.filter(t => t.status === s.id), ids)).join('')}</div>`;
}
function viewPersoon(){
  const cols = STATUSES.filter(s => s.id !== 'klaar');
  const ids = STATUSES.map(s => s.id);
  const lanes = [...data.settings.people.map(p => ({id:p.id, name:p.name})), {id:'samen', name:'Samen'}, {id:'', name:'Niet toegewezen'}];
  const all = data.tasks.filter(t => t.status !== 'klaar' && matches(t));
  const html = lanes.map(l => {
    const mine = all.filter(t => t.who === l.id);
    if(!mine.length && (l.id === '' || l.id === 'samen')) return '';
    const late = mine.filter(t => timing(t).k === 'late').length;
    const week = mine.filter(t => ['today','soon'].includes(timing(t).k)).length;
    const sig = mine.filter(t => timing(t).k === 'signal').length;
    return `<section class="lane" data-lanedrop="${l.id || 'none'}">
      <div class="lane-h">${l.id === 'samen' ? avatar('samen') : avatar(l.id || 'x')}<h2>${esc(l.name)}</h2>
        <div class="lane-sub"><span class="pill">${mine.length} open</span>${late ? `<span class="pill late">${late} te laat</span>` : ''}${week ? `<span class="pill week">${week} deze week</span>` : ''}${sig ? `<span class="pill sig">${sig} voorbereiden</span>` : ''}</div>
      </div>
      <div class="board">${cols.map(c => columnHTML(c, mine.filter(t => t.status === c.id), ids, 'p'+(l.id||'none')+':')).join('')}</div>
    </section>`;
  }).join('');
  return `<div class="lanes"><p class="lanes-hint">Niet aan toegekomen? Sleep een kaart naar het blok van de andere persoon, of tik op <b>⇄</b> op de kaart om hem over te dragen.</p>${html || '<div class="panel">Geen taken binnen dit filter.</div>'}</div>`;
}
function calEvents(fromIso, toIso){
  const map = {};
  const add = (d, e) => { (map[d] = map[d] || []).push(e); };
  data.tasks.filter(matches).forEach(t => {
    if(t.status === 'klaar'){ const d = t.due || t.doneAt; if(d && d >= fromIso && d <= toIso) add(d, {t, kind:'done'}); return; }
    if(t.due && t.due >= fromIso && t.due <= toIso) add(t.due, {t, kind: timing(t).k === 'late' ? 'late' : 'open'});
    if(state.showSig && t.due && t.lead){ const s = iso(addDays(parse(t.due), -t.lead)); if(s >= fromIso && s <= toIso && s >= TODAY_ISO) add(s, {t, kind:'sig'}); }
  });
  projections(parse(toIso)).filter(p => matches(p.src) && p.due >= fromIso).forEach(p => add(p.due, {t:p.src, kind:'ghost', due:p.due}));
  Object.values(map).forEach(l => l.sort((a,b) => (a.kind === 'sig') - (b.kind === 'sig') || prioRank(a.t.prio) - prioRank(b.t.prio)));
  return map;
}
function evHTML(e){
  const c = byId(CATS, e.t.cat) || CATS[0];
  const cls = e.kind === 'ghost' ? 'ghost' : e.kind === 'sig' ? 'sig' : e.kind === 'done' ? 'done' : e.kind === 'late' ? 'late' : '';
  const title = e.kind === 'ghost' ? `Volgende keer (${byId(REPEATS,e.t.repeat).label.toLowerCase()})` : e.kind === 'sig' ? `Signaal: deadline ${fmtLong(e.t.due)}` : personName(e.t.who);
  return `<button type="button" class="ev ${cls}" style="background:${c.color}" data-open="${e.t.id}" ${e.kind === 'ghost' ? `data-ghost="${e.due}"` : ''} title="${esc(title)}">${esc(e.t.title)}</button>`;
}
function viewKalender(){
  const m = state.calMonth;
  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  const lastDay = new Date(m.getFullYear(), m.getMonth()+1, 0);
  const end = addDays(lastDay, (7 - lastDay.getDay()) % 7);
  const ev = calEvents(iso(start), iso(end));
  let cells = ['Ma','Di','Wo','Do','Vr','Za','Zo'].map(d => `<div class="cal-dow">${d}</div>`).join('');
  for(let d = new Date(start); d <= end; d = addDays(d,1)){
    const k = iso(d), out = d.getMonth() !== m.getMonth(), wk = d.getDay() === 0 || d.getDay() === 6;
    cells += `<div class="cal-day ${out ? 'out' : ''} ${wk ? 'wknd' : ''} ${k === TODAY_ISO ? 'today' : ''}">
      <div class="cal-n"><b>${d.getDate()}</b>${can('create') ? `<button type="button" class="cal-add" data-newdate="${k}" title="Taak op ${fmtLong(k)}" aria-label="Taak toevoegen op ${fmtLong(k)}">${I.plus}</button>` : ''}</div>
      ${(ev[k] || []).map(evHTML).join('')}
    </div>`;
  }
  // lijstweergave (smal scherm)
  let list = '';
  for(let d = new Date(first); d <= lastDay; d = addDays(d,1)){
    const k = iso(d); if(!ev[k]) continue;
    list += `<div class="cal-li"><div class="d ${k === TODAY_ISO ? 'today' : ''}">${DOW[d.getDay()]} ${d.getDate()}</div><div class="evs">${ev[k].map(evHTML).join('')}</div></div>`;
  }
  return `<div class="cal">
    <div class="cal-h">
      <button type="button" class="btn icon" data-cal="-1" aria-label="Vorige maand">${I.left}</button>
      <h2>${MONTHS[m.getMonth()]} ${m.getFullYear()}</h2>
      <button type="button" class="btn icon" data-cal="1" aria-label="Volgende maand">${I.right}</button>
      <button type="button" class="btn sm" data-cal="0">Vandaag</button>
      <span class="sp"></span>
      <label class="chk" style="font-size:.88rem"><input type="checkbox" id="sigtoggle" ${state.showSig ? 'checked' : ''}> Signaalmomenten tonen</label>
    </div>
    <div class="cal-legend">
      <span><i style="background:var(--c-onderhoud)"></i>Deadline</span>
      <span><i style="background:var(--sig-bg);box-shadow:inset 0 0 0 1px var(--sig-bd)"></i>Signaal: nu voorbereiden</span>
      <span><i style="box-shadow:inset 0 0 0 1.5px var(--line)"></i>Terugkerend, nog niet aangemaakt</span>
      <span><i style="background:var(--c-admin);opacity:.55"></i>Afgerond</span>
    </div>
    <div class="cal-grid">${cells}</div>
    <div class="cal-list">${list || '<p class="note">Niets gepland in deze maand.</p>'}</div>
  </div>`;
}
function rowHTML(t, due, ghost, right){
  return `<button type="button" class="row ${ghost ? 'ghost' : ''}" data-open="${t.id}" ${ghost ? `data-ghost="${due}"` : ''}>
    <span class="rd">${esc(fmtShort(due))}</span>
    <span class="rt"><b>${ghost ? '↻ ' : ''}${esc(t.title)}</b><small>${esc(personName(t.who))}${t.loc ? ' · '+esc(t.loc) : ''}<span class="rdx"> · ${esc(fmtShort(due))}</span></small></span>
    <span class="rr">${right || ''}${catLabel(t.cat)}</span>
  </button>`;
}
function viewVooruit(){
  const open = openTasks().filter(matches);
  const late = open.filter(t => timing(t).k === 'late').sort(sortTasks);
  const week = open.filter(t => ['today','soon'].includes(timing(t).k)).sort(sortTasks);
  const prep = open.filter(t => timing(t).k === 'signal').sort(sortTasks);
  const until = addMonths(TODAY, state.horizon);
  const untilIso = iso(until);
  const items = open.filter(t => t.due && t.due >= TODAY_ISO && t.due <= untilIso).map(t => ({t, due:t.due}))
    .concat(projections(until).filter(p => matches(p.src)).map(p => ({t:p.src, due:p.due, ghost:true})))
    .sort((a,b) => a.due.localeCompare(b.due));
  const groups = {};
  items.forEach(i => { const k = i.due.slice(0,7); (groups[k] = groups[k] || []).push(i); });
  const months = Object.keys(groups).map(k => {
    const [y,mm] = k.split('-').map(Number);
    return `<div class="month"><div class="month-h"><h3>${MONTHS[mm-1]} ${y}</h3><small>${groups[k].length} ${groups[k].length === 1 ? 'taak' : 'taken'}</small></div>
      ${groups[k].map(i => {
        let r = '';
        if(!i.ghost){ const tm = timing(i.t); if(tm.k === 'signal') r = `<span class="pill sig">nu voorbereiden</span>`; else if(i.t.lead && tm.k === 'later') r = `<span class="pill">signaal ${esc(fmtShort(iso(addDays(parse(i.t.due), -i.t.lead))))}</span>`; }
        else r = `<span class="pill">wordt aangemaakt</span>`;
        return rowHTML(i.t, i.due, i.ghost, r);
      }).join('')}</div>`;
  }).join('');

  const rep = openTasks().filter(t => t.repeat).sort((a,b) => (a.due||'9').localeCompare(b.due||'9'));
  const lastDone = t => data.tasks.filter(x => x.seriesId === t.seriesId && x.status === 'klaar' && x.doneAt).map(x => x.doneAt).sort().pop();
  const repRows = rep.map(t => { const ld = lastDone(t); return `<tr data-open="${t.id}"><td><b>${esc(t.title)}</b><br><small style="color:var(--muted)">${esc(byId(REPEATS,t.repeat).label)}</small></td><td>${ld ? esc(fmtNum(ld)) : '—'}</td><td>${t.due ? esc(fmtNum(t.due)) : '—'}</td></tr>`; }).join('');

  return `<div class="ahead">
    <div class="col2">
      <section class="panel">
        <h2>Nu aandacht nodig</h2>
        <p class="hint">Taken over de deadline, of waarvan het signaalmoment bereikt is. Zo plan je op tijd in en voorkom je last-minute werk.</p>
        <div class="now2">
          <div class="box late"><h3>Te laat (${late.length})</h3>${late.map(t => rowHTML(t, t.due, false, '')).join('') || '<span class="empty">Niets te laat.</span>'}</div>
          <div class="box week"><h3>Deze week (${week.length})</h3>${week.map(t => rowHTML(t, t.due, false, '')).join('') || '<span class="empty">Niets deze week.</span>'}</div>
          <div class="box sig"><h3>Nu voorbereiden (${prep.length})</h3>${prep.map(t => rowHTML(t, t.due, false, '')).join('') || '<span class="empty">Niets om voor te bereiden.</span>'}</div>
        </div>
      </section>
      <section class="panel">
        <h2>Wat komt eraan
          <span class="wk-seg">${[3,6,12].map(h => `<button type="button" data-horizon="${h}" aria-pressed="${state.horizon === h}">${h} mnd</button>`).join('')}</span>
        </h2>
        <p class="hint">Alle deadlines tot ${esc(fmtLong(untilIso))}, inclusief terugkerend werk dat nog automatisch wordt aangemaakt (↻).</p>
        ${months || '<p class="note">Geen deadlines in deze periode.</p>'}
      </section>
    </div>
    <div class="col2">
      <section class="panel">
        <h2>Terugkerend werk</h2>
        <p class="hint">Na afronden wordt de volgende keer automatisch ingepland.</p>
        <div class="tblwrap"><table class="rep"><thead><tr><th>Taak</th><th>Laatst</th><th>Volgende</th></tr></thead><tbody>${repRows || '<tr><td colspan="3">Nog geen terugkerende taken.</td></tr>'}</tbody></table></div>
      </section>
    </div>
  </div>`;
}
function render(){
  renderChrome();
  const v = {bord:viewBord, persoon:viewPersoon, kalender:viewKalender, vooruit:viewVooruit}[state.tab] || viewBord;
  $('#view').innerHTML = v();
  if(state.quickAdd){ const i = $('#qa-input'); if(i) i.focus(); }
}

/* ---------- Dialoog: taak ---------- */
let draft = null, dlgMode = null;
function openDlg(html, narrow){
  const ov = $('#ov');
  ov.innerHTML = `<div class="dlg ${narrow ? 'narrow' : ''}" role="dialog" aria-modal="true" aria-labelledby="dlg-title">${html}</div>`;
  ov.hidden = false; document.body.classList.add('wk-lock');
  const f = ov.querySelector('input:not([type=checkbox]),textarea,select,button.x'); if(f) f.focus();
}
function closeDlg(){ $('#ov').hidden = true; $('#ov').innerHTML = ''; document.body.classList.remove('wk-lock'); draft = null; dlgMode = null; }
const opt = (list, val, key='id') => list.map(x => `<option value="${x[key]}" ${String(x[key]) === String(val) ? 'selected' : ''}>${esc(x.label)}</option>`).join('');

function openTask(id, ghostDate, preset){
  const t = id ? data.tasks.find(x => x.id === id) : null;
  if(t && !can('edit', t)) return openView(t, ghostDate);
  if(!t && !can('create')) return;
  draft = t ? JSON.parse(JSON.stringify(t)) : Object.assign({id:null, title:'', descr:'', cat:'onderhoud', prio:'normaal', who:ME.id, status:'plannen', due:'', lead:0, repeat:'', loc:'', checklist:[], notes:[]}, preset || {});
  dlgMode = 'edit';
  renderEdit(ghostDate);
}
function leadNote(){
  if(!draft.due || !draft.lead) return '';
  const s = iso(addDays(parse(draft.due), -draft.lead));
  return s <= TODAY_ISO ? `<div class="note sig">Het signaalmoment (${esc(fmtLong(s))}) is al bereikt. De taak staat direct bij <b>Nu voorbereiden</b>.</div>`
                        : `<div class="note">Vanaf <b>${esc(fmtLong(s))}</b> komt deze taak bij <b>Nu voorbereiden</b> en op het dashboard te staan.</div>`;
}
function checklistEditHTML(editable){
  const cl = draft.checklist || [];
  const d = cl.filter(c => c.d).length;
  return `<div class="cl">
    <div class="cl-head"><span class="lbltxt">Checklist</span>${cl.length ? `<span class="cl-prog"><i style="width:${d/cl.length*100}%"></i></span><span class="lbltxt">${d}/${cl.length}</span>` : ''}</div>
    ${cl.map((c,i) => `<label class="cl-item ${c.d ? 'dn' : ''}"><input type="checkbox" data-cl="${i}" ${c.d ? 'checked' : ''}><span>${esc(c.t)}</span>${editable ? `<button type="button" data-cl-del="${i}" aria-label="Verwijder ${esc(c.t)}">${I.trash}</button>` : ''}</label>`).join('')}
    ${editable ? `<div class="cl-add"><input type="text" id="cl-new" placeholder="Stap toevoegen, bijv. ‘Installateur bellen’"><button type="button" class="btn sm" data-cl-add>Toevoegen</button></div>` : ''}
  </div>`;
}
function renderEdit(ghostDate, err){
  const isNew = !draft.id;
  const t = isNew ? null : data.tasks.find(x => x.id === draft.id);
  const ghostNote = ghostDate ? `<div class="note">Je bekijkt de herhaling van <b>${esc(fmtLong(ghostDate))}</b>. Die wordt automatisch aangemaakt zodra de huidige keer (${esc(draft.due ? fmtLong(draft.due) : '—')}) is afgerond. Hieronder staat de huidige taak.</div>` : '';
  const peopleOpts = data.settings.people.map(p => ({id:p.id, label:p.name})).concat([{id:'samen', label:'Samen'}, {id:'', label:'Niet toegewezen'}]);
  openDlg(`
    <div class="dlg-h"><div class="t"><small>${isNew ? 'Nieuwe werkorder' : 'Werkorder ' + woNr(draft)}</small><h2 id="dlg-title">${esc(draft.title || 'Nieuwe taak')}</h2></div><button type="button" class="x" data-close aria-label="Sluiten">${I.x}</button></div>
    <form class="dlg-b" id="taskform" novalidate>
      ${err ? `<div class="err">${esc(err)}</div>` : ''}
      ${ghostNote}
      <div class="fg">
        <div class="field all"><label for="f-title">Wat moet er gebeuren?</label><input type="text" id="f-title" value="${esc(draft.title)}" placeholder="Bijv. CV-ketel laten nakijken" required></div>
        <div class="field all"><label for="f-descr">Toelichting / werkomschrijving</label><textarea id="f-descr" class="tall" placeholder="Wat is er precies aan de hand, wat moet er gebeuren, wie is de contactpersoon, wat heb je nodig…">${esc(draft.descr)}</textarea></div>
        <div class="field"><label for="f-catx">Categorie</label><select id="f-catx">${opt(CATS, draft.cat)}</select></div>
        <div class="field"><label for="f-prio">Prioriteit</label><select id="f-prio">${opt(PRIOS, draft.prio)}</select></div>
        <div class="field"><label for="f-whox">Wie pakt het op?</label><select id="f-whox">${opt(peopleOpts, draft.who)}</select></div>
        <div class="field"><label for="f-due">Deadline</label><input type="date" id="f-due" value="${esc(draft.due)}"></div>
        <div class="field"><label for="f-lead">Signaal vooraf</label><select id="f-lead">${opt(LEADS, draft.lead, 'd')}</select></div>
        <div class="field"><label for="f-rep">Herhalen</label><select id="f-rep">${opt(REPEATS, draft.repeat)}</select></div>
        <div class="field"><label for="f-status">Status</label><select id="f-status">${opt(STATUSES, draft.status)}</select></div>
        <div class="field span2"><label for="f-loc">Plek</label><input type="text" id="f-loc" value="${esc(draft.loc)}" placeholder="Bijv. Lab 4 · Makerspace"></div>
        <div class="field all" id="leadnote">${leadNote()}</div>
      </div>
      ${checklistEditHTML(true)}
      ${notesHTML(draft, true)}
      ${bijlagenHTML(draft.id, true)}
      ${t && t.log && t.log.length ? `<details class="more"><summary>Geschiedenis (${t.log.length})</summary><ul class="hist">${[...t.log].reverse().map(l => `<li><time>${esc(fmtNum(l.at))}</time><span>${esc(l.by)}: ${esc(l.txt)}</span></li>`).join('')}</ul></details>` : ''}
    </form>
    <div class="dlg-f" id="dlgfoot">
      ${!isNew && can('delete') ? `<button type="button" class="btn danger" data-del>Verwijderen</button>` : ''}
      <span class="sp"></span>
      ${!isNew && draft.status !== 'klaar' ? `<button type="button" class="btn ok" data-done>Afronden</button>` : ''}
      <button type="button" class="btn ghost" data-close>Annuleren</button>
      <button type="button" class="btn primary" data-savetask>${isNew ? 'Taak toevoegen' : 'Opslaan'}</button>
    </div>`);
}
const fmtSize = n => !n ? '' : n < 1048576 ? Math.max(1, Math.round(n/1024)) + ' kB' : (n/1048576).toFixed(1).replace('.', ',') + ' MB';
function bijlagenHTML(taskId, canAdd){
  const list = (taskId && data.bijlagen[taskId]) || [];
  const mayDel = b => can('delete') || b.mine;
  return `<div class="bij">
    <span class="lbltxt">Bijlagen (${list.length})</span>
    ${list.length ? `<ul class="bij-list">${list.map(b => `<li><a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.naam)}</a><small>${esc(fmtSize(b.grootte))}${b.door ? ' · ' + esc(b.door) : ''}</small>${mayDel(b) ? `<button type="button" data-bij-del="${esc(b.id)}" data-task="${esc(taskId)}" aria-label="Verwijder ${esc(b.naam)}">${I.trash}</button>` : ''}</li>`).join('')}</ul>` : '<p class="hintsm">Nog geen bijlagen.</p>'}
    ${!taskId ? '<p class="hintsm">Sla de taak eerst op om bijlagen toe te voegen.</p>' : canAdd ? `<div class="bij-add"><input type="file" id="bij-file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"><span class="bij-busy" id="bij-busy" hidden>Uploaden…</span></div>` : ''}
  </div>`;
}
function notesHTML(t, canAdd){
  const n = t.notes || [];
  return `<div class="notes">
    <span class="lbltxt">Updates (${n.length})</span>
    ${n.length ? `<ul class="nl">${[...n].reverse().map(x => `<li><div class="nm"><b>${esc(x.by)}</b><time>${esc(fmtShort(x.at))}${x.tm ? ' · ' + esc(x.tm) : ''}</time></div><p>${esc(x.txt)}</p></li>`).join('')}</ul>` : '<p class="hintsm">Nog geen updates. Houd hier bij wat er gebeurd is, bijvoorbeeld wie je gebeld hebt of wat er besteld is.</p>'}
    ${canAdd ? `<div class="note-add"><textarea id="note-new" placeholder="Update toevoegen, bijv. ‘Monteur gebeld, komt dinsdag om 10:00’"></textarea><button type="button" class="btn sm primary" data-note-add>Update plaatsen</button></div>` : ''}
  </div>`;
}
function readForm(){
  draft.title = $('#f-title').value.trim();
  draft.cat = $('#f-catx').value; draft.prio = $('#f-prio').value; draft.who = $('#f-whox').value;
  draft.due = $('#f-due').value; draft.lead = parseInt($('#f-lead').value,10) || 0; draft.repeat = $('#f-rep').value;
  draft.status = $('#f-status').value; draft.loc = $('#f-loc').value.trim(); draft.descr = $('#f-descr').value.trim();
}
function saveTask(alsoDone){
  readForm();
  if(!draft.title){ renderEdit(null, 'Geef de taak een titel.'); return; }
  if(draft.repeat && !draft.due){ renderEdit(null, 'Een terugkerende taak heeft een deadline nodig, anders weet het systeem niet wanneer de volgende keer is.'); return; }
  let t, msg;
  if(!draft.id){
    const id = uid();
    t = Object.assign({}, draft, {id, nr:0, notes:draft.notes || [], seriesId:id, nextId:null, doneAt:null, createdAt:TODAY_ISO, log:[]});
    log(t, 'Taak aangemaakt');
    if(t.status === 'klaar'){ t.status = 'plannen'; alsoDone = true; }
    data.tasks.push(t); msg = `“${t.title}” is toegevoegd.`;
  } else {
    t = data.tasks.find(x => x.id === draft.id);
    const wasDone = t.status === 'klaar', toDone = draft.status === 'klaar';
    const changes = [];
    if(t.due !== draft.due) changes.push('deadline '+(draft.due ? fmtNum(draft.due) : 'verwijderd'));
    if(t.who !== draft.who) changes.push('toegewezen aan '+personName(draft.who));
    if(t.prio !== draft.prio) changes.push('prioriteit '+byId(PRIOS,draft.prio).label);
    const newStatus = draft.status;
    const {log:_skip, ...rest} = draft;
    Object.assign(t, rest, {status:t.status});
    if(changes.length) log(t, 'Gewijzigd: '+changes.join(', '));
    if(!wasDone && toDone) alsoDone = true;
    else if(wasDone && !toDone) reopenTask(t, newStatus);
    else if(t.status !== newStatus){ t.status = newStatus; log(t, 'Verplaatst naar '+byId(STATUSES,newStatus).label); }
    msg = 'Opgeslagen.';
  }
  if(alsoDone && t.status !== 'klaar'){ const n = completeTask(t); msg = n ? `Afgerond. De volgende keer staat al gepland op ${fmtLong(n.due)}.` : `“${t.title}” is afgerond.`; }
  save(); closeDlg(); render(); toast(msg);
}
function openView(t, ghostDate){
  dlgMode = 'view'; draft = JSON.parse(JSON.stringify(t));
  const tm = timing(t);
  const mayMove = can('move', t), mayCheck = can('check', t);
  const sigTxt = t.due && t.lead ? `${byId(LEADS,t.lead)?.label || t.lead+' dagen vooraf'} (${fmtLong(iso(addDays(parse(t.due), -t.lead)))})` : 'Geen';
  openDlg(`
    <div class="dlg-h"><div class="t"><small>Werkorder ${esc(woNr(t))} · ${esc(byId(CATS,t.cat)?.label || '')}</small><h2 id="dlg-title">${esc(t.title)}</h2></div><button type="button" class="x" data-close aria-label="Sluiten">${I.x}</button></div>
    <div class="dlg-b">
      ${ghostDate ? `<div class="note">Herhaling op <b>${esc(fmtLong(ghostDate))}</b>. Die wordt automatisch aangemaakt als de huidige keer is afgerond.</div>` : ''}
      ${tm.k === 'late' ? `<div class="err">Deadline was ${esc(fmtLong(t.due))}.</div>` : tm.k === 'signal' ? `<div class="note sig">Signaalmoment bereikt: nu voorbereiden.</div>` : ''}
      <dl class="dl">
        <dt>Wie</dt><dd>${can('assign', t) ? `<select id="v-who" style="max-width:240px">${data.settings.people.map(p => `<option value="${p.id}" ${t.who === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}<option value="samen" ${t.who === 'samen' ? 'selected' : ''}>Samen</option></select>` : esc(personName(t.who))}</dd>
        <dt>Status</dt><dd>${mayMove ? `<select id="v-status" style="max-width:240px">${opt(STATUSES, t.status)}</select>` : esc(byId(STATUSES,t.status).label)}</dd>
        <dt>Prioriteit</dt><dd>${prioLabel(t.prio)}</dd>
        <dt>Deadline</dt><dd>${t.due ? esc(fmtLong(t.due)) : '—'}</dd>
        <dt>Signaal</dt><dd>${esc(sigTxt)}</dd>
        <dt>Herhalen</dt><dd>${esc(byId(REPEATS,t.repeat).label)}</dd>
        ${t.loc ? `<dt>Plek</dt><dd>${esc(t.loc)}</dd>` : ''}
      </dl>
      <div class="field"><span class="lbltxt">Toelichting / werkomschrijving</span><div class="descbox">${t.descr ? esc(t.descr) : '<span class="hintsm">Geen toelichting.</span>'}</div></div>
      ${(t.checklist||[]).length ? `<div id="v-cl" ${mayCheck ? '' : 'inert'}>${checklistEditHTML(false)}</div>` : ''}
      ${notesHTML(t, can('note', t))}
      ${bijlagenHTML(t.id, can('note', t))}
      ${t.log && t.log.length ? `<details class="more"><summary>Geschiedenis (${t.log.length})</summary><ul class="hist">${[...t.log].reverse().map(l => `<li><time>${esc(fmtNum(l.at))}</time><span>${esc(l.by)}: ${esc(l.txt)}</span></li>`).join('')}</ul></details>` : ''}
      ${!mayMove ? `<p class="note">Je kunt deze werkorder inzien. Alleen de beheerder en de persoon aan wie hij is toegewezen kunnen hem aanpassen.</p>` : `<p class="note">Je kunt de status wijzigen, de werkorder overdragen, stappen afvinken en updates plaatsen. De toelichting zelf past de beheerder aan.</p>`}
    </div>
    <div class="dlg-f"><span class="sp"></span>
      ${mayMove && t.status !== 'klaar' ? `<button type="button" class="btn ok" data-vdone>Afronden</button>` : ''}
      <button type="button" class="btn ${mayMove ? 'primary' : ''}" data-vclose>${mayMove ? 'Opslaan en sluiten' : 'Sluiten'}</button>
    </div>`);
}
function confirmDelete(){
  const f = $('#dlgfoot');
  f.innerHTML = `<span style="font-weight:600">“${esc(draft.title)}” definitief verwijderen?</span><span class="sp"></span><button type="button" class="btn ghost" data-delno>Nee, terug</button><button type="button" class="btn danger solid" data-delyes>Ja, verwijderen</button>`;
}

/* ---------- Events ---------- */
root.addEventListener('click', e => {
  const el = e.target.closest('button,[data-open],tr[data-open]');
  if(!el) return;
  const d = el.dataset;

  // dialoog
  if('close' in d){ closeDlg(); return; }
  if('savetask' in d){ saveTask(false); return; }
  if('done' in d){ saveTask(true); return; }
  if('del' in d){ readForm(); confirmDelete(); return; }
  if('delno' in d){ renderEdit(); return; }
  if('delyes' in d){ data.tasks = data.tasks.filter(x => x.id !== draft.id); const ti = draft.title; save(); closeDlg(); render(); toast(`“${ti}” is verwijderd.`); return; }
  if('clAdd' in d){ readForm(); const v = $('#cl-new').value.trim(); if(v){ draft.checklist.push({t:v, d:false}); } renderEdit(); setTimeout(() => $('#cl-new') && $('#cl-new').focus()); return; }
  if('clDel' in d){ readForm(); draft.checklist.splice(+d.clDel,1); renderEdit(); return; }
  if('vdone' in d || 'vclose' in d){
    const t = data.tasks.find(x => x.id === draft.id);
    if(t && can('move', t)){
      const sel = $('#v-status'), ws = $('#v-who');
      const to = 'vdone' in d ? 'klaar' : (sel ? sel.value : t.status);
      const who = ws ? ws.value : t.who;
      closeDlg(); if(to !== t.status) moveTask(t.id, to);
      if(who !== t.who) assignTask(t.id, who);
      render();
    } else closeDlg();
    return;
  }
  if('alldone' in d){ state.showAllDone = !state.showAllDone; render(); return; }

  // bijlage verwijderen
  if(d.bijDel){
    const tid = d.task;
    fetch('/api/werkzaamheden/bijlagen?id=' + encodeURIComponent(d.bijDel), { method:'DELETE' }).then(r => r.json()).then(res => {
      if(res.ok){ data.bijlagen[tid] = (data.bijlagen[tid] || []).filter(b => b.id !== d.bijDel); toast('Bijlage verwijderd.'); }
      else toast(res.error || 'Verwijderen mislukt.');
      const t = data.tasks.find(x => x.id === tid);
      if(dlgMode === 'edit'){ readForm(); renderEdit(); } else if(t) openView(t);
    }).catch(() => toast('Verwijderen mislukt.'));
    return;
  }
  // overdragen
  if(d.hand){ e.stopPropagation(); assignTask(d.hand, d.to); render(); return; }
  // update plaatsen
  if('noteAdd' in d){
    const v = ($('#note-new')?.value || '').trim();
    if(!v){ $('#note-new')?.focus(); return; }
    const now = new Date();
    const note = {at:TODAY_ISO, tm:pad(now.getHours()) + ':' + pad(now.getMinutes()), by:meName(), txt:v};
    const t = draft.id ? data.tasks.find(x => x.id === draft.id) : null;
    if(dlgMode === 'edit'){
      readForm(); draft.notes = draft.notes || []; draft.notes.push(note);
      if(t){ t.notes = t.notes || []; t.notes.push(note); save(); render(); }
      renderEdit();
    } else if(t && can('note', t)){
      t.notes.push(note); save(); render(); openView(t);
    }
    toast('Update geplaatst.'); return;
  }
  // kaart verplaatsen
  if(d.move){ e.stopPropagation(); moveTask(d.move, d.to); return; }

  // snel toevoegen
  if(d.qa){ state.quickAdd = d.qa; render(); return; }
  if('qaCancel' in d){ state.quickAdd = null; render(); return; }
  if(d.qaSave){ quickAddSave(d.col, d.ctx); return; }

  // navigatie
  if(d.tab){ state.tab = d.tab; state.quickAdd = null; saveUI(); render(); return; }
  if(d.gotab){ state.tab = d.gotab; saveUI(); render(); window.scrollTo({top:0, behavior:'smooth'}); return; }
  if(d.group){ state.group = d.group; saveUI(); render(); return; }
  if(d.quick !== undefined && el.matches('[data-quick]')){ state.quick = state.quick === d.quick ? '' : d.quick; if(state.tab === 'vooruit') state.tab = 'bord'; render(); return; }
  if(d.cal !== undefined){ const n = +d.cal; state.calMonth = n === 0 ? new Date(TODAY.getFullYear(), TODAY.getMonth(), 1) : new Date(state.calMonth.getFullYear(), state.calMonth.getMonth()+n, 1); render(); return; }
  if(d.horizon){ state.horizon = +d.horizon; saveUI(); render(); return; }
  if(d.newdate){ openTask(null, null, {due:d.newdate, status: diffDays(TODAY, parse(d.newdate)) <= 7 ? 'week' : 'plannen'}); return; }

  if(d.open){ openTask(d.open, d.ghost); return; }
});
root.addEventListener('change', e => {
  const t = e.target;
  if(t.id === 'bij-file'){
    const files = [...t.files]; const tid = draft && draft.id; if(!files.length || !tid) return;
    const busy = $('#bij-busy'); if(busy) busy.hidden = false;
    (async () => {
      for(const f of files){
        const fd = new FormData(); fd.append('taskId', tid); fd.append('file', f);
        try{
          const r = await fetch('/api/werkzaamheden/bijlagen', { method:'POST', body:fd }); const res = await r.json();
          if(r.ok){ (data.bijlagen[tid] = data.bijlagen[tid] || []).push(res.bijlage); toast('Bijlage toegevoegd.'); }
          else toast(res.error || 'Uploaden mislukt.');
        }catch(err){ toast('Uploaden mislukt.'); }
      }
      const task = data.tasks.find(x => x.id === tid);
      if(dlgMode === 'edit'){ readForm(); renderEdit(); } else if(task) openView(task);
    })();
    return;
  }
  if(t.id === 'f-who'){ state.who = t.value; render(); return; }
  if(t.id === 'f-cat'){ state.cat = t.value; render(); return; }
  if(t.id === 'sigtoggle'){ state.showSig = t.checked; saveUI(); render(); return; }
  if(t.id === 'f-due' || t.id === 'f-lead'){ readForm(); $('#leadnote').innerHTML = leadNote(); return; }
  if(t.dataset.cl !== undefined){
    const i = +t.dataset.cl;
    if(dlgMode === 'edit'){ readForm(); draft.checklist[i].d = t.checked; renderEdit(); }
    else if(dlgMode === 'view'){
      const task = data.tasks.find(x => x.id === draft.id);
      if(task && can('check', task)){ task.checklist[i].d = t.checked; draft.checklist[i].d = t.checked; log(task, (t.checked ? 'Afgevinkt: ' : 'Teruggezet: ') + task.checklist[i].t); save(); render(); t.closest('.cl-item').classList.toggle('dn', t.checked); const cl = $('#v-cl'); if(cl) cl.innerHTML = checklistEditHTML(false); }
    }
  }
});
let qTimer;
$('#f-q').addEventListener('input', e => { clearTimeout(qTimer); qTimer = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 160); });
$('#f-clear').addEventListener('click', () => { state.q = ''; state.who = ''; state.cat = ''; state.quick = ''; $('#f-q').value = ''; render(); });
$('#btn-new').addEventListener('click', () => openTask(null));
$('#ov').addEventListener('mousedown', e => { if(e.target.id === 'ov') closeDlg(); });
docOn('keydown', e => {
  if(e.key === 'Escape'){ if(!$('#ov').hidden) closeDlg(); else if(state.quickAdd){ state.quickAdd = null; render(); } return; }
  if(e.target.id === 'qa-input' && e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); const b = root.querySelector('[data-qa-save]'); quickAddSave(b.dataset.col, b.dataset.ctx); return; }
  if(e.target.id === 'note-new' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); root.querySelector('[data-note-add]').click(); return; }
  if(e.target.id === 'cl-new' && e.key === 'Enter'){ e.preventDefault(); root.querySelector('[data-cl-add]').click(); return; }
  if(e.target.id === 'f-title' && e.key === 'Enter'){ e.preventDefault(); saveTask(false); return; }
  if((e.key === 'Enter' || e.key === ' ') && e.target.matches('.card[data-open]')){ e.preventDefault(); openTask(e.target.dataset.open); }
});
function quickAddSave(col, ctx){
  const inp = $('#qa-input'); const title = inp ? inp.value.trim() : '';
  if(!title){ state.quickAdd = null; render(); return; }
  const id = uid();
  const t = {id, nr:0, title, descr:'', cat:'onderhoud', prio:'normaal', who:'', status:'plannen', due:'', lead:0, repeat:'', loc:'', checklist:[], notes:[], seriesId:id, nextId:null, doneAt:null, createdAt:TODAY_ISO, log:[]};
  if(state.tab === 'bord' && state.group === 'prio') t.prio = col; else t.status = col;
  if(ctx && ctx.startsWith('p')){ const w = ctx.slice(1, -1); t.who = w === 'none' ? '' : w; }
  else if(state.who && state.who !== 'none') t.who = state.who;
  if(state.cat) t.cat = state.cat;
  log(t, 'Taak aangemaakt');
  data.tasks.push(t); save();
  state.quickAdd = (ctx || '') + col; // blijf in invoermodus voor de volgende
  render(); toast(`“${title}” toegevoegd. Klik op de kaart voor deadline en details.`);
}

/* Slepen (muis en iPad) */
let dragId = null;
root.addEventListener('dragstart', e => {
  const c = e.target.closest && e.target.closest('.card[draggable="true"]'); if(!c) return;
  dragId = c.dataset.open; c.classList.add('dragging'); document.body.classList.add('wk-dragging');
  try{ e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; }catch(err){}
});
root.addEventListener('dragend', e => { const c = e.target.closest && e.target.closest('.card'); if(c) c.classList.remove('dragging'); document.body.classList.remove('wk-dragging'); root.querySelectorAll('.drop').forEach(x => x.classList.remove('drop')); dragId = null; });
root.addEventListener('dragover', e => {
  const col = e.target.closest && e.target.closest('.col, .lane'); if(!col || !dragId) return;
  e.preventDefault(); root.querySelectorAll('.drop').forEach(x => x !== col && x.classList.remove('drop')); col.classList.add('drop');
});
root.addEventListener('drop', e => {
  const col = e.target.closest && e.target.closest('.col, .lane'); if(!col || !dragId) return;
  e.preventDefault(); root.querySelectorAll('.drop').forEach(x => x.classList.remove('drop')); document.body.classList.remove('wk-dragging');
  const id = dragId; dragId = null;
  if(col.dataset.lanedrop){ const w = col.dataset.lanedrop; assignTask(id, w === 'none' ? '' : w); render(); return; }
  const ctx = col.dataset.ctx;
  moveTask(id, col.dataset.col);          // eerst status (met de rechten van vóór het overdragen)
  if(ctx && ctx.startsWith('p')){ const w = ctx.slice(1,-1); assignTask(id, w === 'none' ? '' : w); }
  render();
});

render();

// Deep link vanaf het dashboard: ?open=<id>
try { const oid = new URLSearchParams(location.search).get('open'); if (oid && data.tasks.find(x => x.id === oid)) openTask(oid); } catch(e) {}
cleanups.push(() => { document.body.classList.remove('wk-lock', 'wk-dragging'); });
return () => cleanups.forEach(f => { try { f(); } catch(e) {} });
}
