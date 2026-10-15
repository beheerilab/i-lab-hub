/* eslint-disable */
// Gebaseerd op ilab-planning-V2.5.html; Auth/Store/can zijn aan de hub gekoppeld.
export function mountPlanning(root, HUB){
'use strict';
const cleanups=[];

const CONFIG = { storageKey:'ilab_planning_v1', reportHeightToParent:false, maxSeries:40, version:'V2.5' };

const DEFAULT_SETTINGS = { openFrom:'08:30', openTo:'17:00', expiryWorkdays:5 };


const STATUS = { pending:'Aangevraagd', confirmed:'Bevestigd', rejected:'Afgewezen', withdrawn:'Ingetrokken', cancelled:'Geannuleerd', expired:'Verlopen' };
const STATUS_CHIP = { pending:'pend', confirmed:'ok', rejected:'bad', withdrawn:'', cancelled:'', expired:'bad' };

/* ---------- 1. Auth (vervangen door hub-sessie) ---------- */
const Auth = {
  user(){ return HUB.me; },
  isAdmin(){ return HUB.me.role==='beheerder'; },
  knownTeachers(){ return HUB.teachers || []; }
};

/* ---------- 2. Store (vervangen door hub-database) ---------- */
const Store = {
  synced:{ b:new Map(), c:new Map(), rooms:'', settings:'' }, busy:false, again:false, latest:null,
  mark(d){
    this.synced.b=new Map(d.bookings.map(x=>[x.id,JSON.stringify(x)]));
    this.synced.c=new Map(d.closures.map(x=>[x.id,JSON.stringify(x)]));
    this.synced.rooms=JSON.stringify(d.rooms); this.synced.settings=JSON.stringify(d.settings);
  },
  load(){ const d=JSON.parse(JSON.stringify(HUB)); this.mark(d); return { v:1, settings:d.settings, rooms:d.rooms, bookings:d.bookings, closures:d.closures }; },
  save(s){ this.latest=s; this.push(); },
  async push(){
    if(this.busy){ this.again=true; return; }
    const s=this.latest; if(!s) return;
    const upserts=s.bookings.filter(b=>this.synced.b.get(b.id)!==JSON.stringify(b));
    const have=new Set(s.bookings.map(b=>b.id));
    const deletes=[...this.synced.b.keys()].filter(id=>!have.has(id));
    const closureUpserts=s.closures.filter(c=>this.synced.c.get(c.id)!==JSON.stringify(c));
    const haveC=new Set(s.closures.map(c=>c.id));
    const closureDeletes=[...this.synced.c.keys()].filter(id=>!haveC.has(id));
    const rooms=JSON.stringify(s.rooms)!==this.synced.rooms ? s.rooms : undefined;
    const settings=JSON.stringify(s.settings)!==this.synced.settings ? s.settings : undefined;
    if(!upserts.length && !deletes.length && !closureUpserts.length && !closureDeletes.length && !rooms && !settings) return;
    this.busy=true; let failed=false;
    try{
      const r=await fetch('/api/planning',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({upserts,deletes,closureUpserts,closureDeletes,rooms,settings})});
      if(!r.ok) throw new Error('http '+r.status);
      const res=await r.json(); const bad=new Set((res.mislukt||[]).map(x=>x.id));
      upserts.forEach(b=>{ if(!bad.has(b.id)) this.synced.b.set(b.id,JSON.stringify(b)); });
      deletes.forEach(id=>{ if(!bad.has(id)) this.synced.b.delete(id); });
      closureUpserts.forEach(c=>this.synced.c.set(c.id,JSON.stringify(c)));
      closureDeletes.forEach(id=>this.synced.c.delete(id));
      if(rooms) this.synced.rooms=JSON.stringify(rooms);
      if(settings) this.synced.settings=JSON.stringify(settings);
      if(bad.size){ failed=true; toast('Niet opgeslagen: '+res.mislukt[0].reden+(bad.size>1?` (+${bad.size-1})`:'')); }
    }catch(e){ failed=true; toast('Opslaan lukte niet. Controleer je verbinding; de planning wordt ververst.'); }
    this.busy=false;
    if(failed) await this.refresh(true);
    else if(this.again){ this.again=false; this.push(); }
  },
  async refresh(force){
    if(this.busy && !force) return;
    if(!force && root.querySelector('dialog[open]')) return;
    try{
      const r=await fetch('/api/planning',{cache:'no-store'}); if(!r.ok) return;
      const d=await r.json();
      HUB.teachers=d.teachers;
      state.bookings=d.bookings; state.closures=d.closures; state.rooms=d.rooms; state.settings=d.settings;
      this.mark(d); render();
    }catch(e){}
  }
};

/* ---------- Datum- en tijdhulpjes (alles in lokale tijd, Europe/Amsterdam) ---------- */
const $ = s => root.querySelector(s);
const byId = id => root.querySelector('[id="'+String(id).replace(/"/g,'\\"')+'"]');
const ACT_LABELS = { les:'Les', project:'Project', vrij_gebruik:'Vrij gebruik', extern_bezoek:'Extern bezoek', evenement:'Evenement', vergadering:'Vergadering', anders:'Anders' };
const ACT_LES = ['les','project','vrij_gebruik','extern_bezoek'];
const ACT_BIJ = ['evenement','vergadering','anders'];
const typeLabel = b => b.activiteit==='anders' && b.activiteitAnders ? 'Anders: '+b.activiteitAnders : (ACT_LABELS[b.activiteit]||'Les');
const canBookRoom = id => { if(Auth.isAdmin()) return true; const r=state.rooms.find(x=>x.id===id); return !!(r && r.docentBoekbaar); };
const bookableRooms = () => activeRooms().filter(r=>canBookRoom(r.id));
const rl = r => r.name ? r.id+' · '+r.name : r.id;
const z = n => String(n).padStart(2,'0');
const iso = d => `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
const parse = s => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
const addDays = (s,n) => { const d=parse(s); d.setDate(d.getDate()+n); return iso(d); };
const dow = s => parse(s).getDay();
const isWorkday = s => { const d=dow(s); return d>=1 && d<=5; };
const stepWorkday = (s,dir) => { let x=s; do{ x=addDays(x,dir); }while(!isWorkday(x)); return x; };
const toWorkday = s => isWorkday(s) ? s : stepWorkday(s,1);
const addWorkdays = (s,n) => { let x=s; for(let i=0;i<n;i++) x=stepWorkday(x,1); return x; };
const workdaysUntil = (a,b) => { if(b<=a) return 0; let n=0,x=a; while(x<b){ x=addDays(x,1); if(isWorkday(x)) n++; } return n; };
const mondayOf = s => addDays(s, -((dow(s)+6)%7));
const mins = t => { const [h,m]=String(t).split(':').map(Number); return h*60+m; };
const hm = m => `${z(Math.floor(m/60))}:${z(m%60)}`;
const today = () => iso(new Date());
const nowMins = () => { const d=new Date(); return d.getHours()*60+d.getMinutes(); };
const localDateOf = isoStamp => iso(new Date(isoStamp));
const cap1 = s => s.charAt(0).toUpperCase()+s.slice(1);
const fmtDay = s => cap1(parse(s).toLocaleDateString('nl-NL',{weekday:'short',day:'numeric',month:'short'}));
const fmtLong = s => cap1(parse(s).toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}));
const fmtStamp = t => new Date(t).toLocaleString('nl-NL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
const esc = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{ const r=Math.random()*16|0; return (c==='x'?r:(r&3|8)).toString(16); });
const plural = (n,one,many) => `${n} ${n===1?one:many}`;

/* ---------- Voorbeeldgegevens ---------- */

/* ---------- Toestand ---------- */
let state, ui;
const find = id => state.bookings.find(b=>b.id===id);
const roomOf = id => state.rooms.find(r=>r.id===id) || {id, name:'Onbekende ruimte', capacity:0, active:false};
const activeRooms = () => state.rooms.filter(r=>r.active);
const shownRooms = () => activeRooms().filter(r=>ui.room==='all' || r.id===ui.room);
const S = () => mins(state.settings.openFrom);
const E = () => mins(state.settings.openTo);
const isActive = b => b.status==='pending' || b.status==='confirmed';
const isMine = b => b.teacherId===Auth.user().id;

/* ---------- 3. Rechten (in de hub ook server-side afdwingen) ---------- */
function can(action, b){
  const admin = Auth.isAdmin(), own = !!b && isMine(b);
  switch(action){
    case 'see':      return admin || own;                                    // alle details zien
    case 'review':   return admin && b.status==='pending';                   // bevestigen / afwijzen
    case 'edit':     return admin ? isActive(b) : (own && b.status==='pending');
    case 'withdraw': return !admin && own && b.status==='pending';
    case 'cancel':   return (admin || own) && b.status==='confirmed' && b.date>=today();
    case 'manage':   return admin;                                           // ruimtes, sluitingen, instellingen, export
    case 'delete':   return admin;                                           // boeking definitief verwijderen
    case 'past':     return admin;                                           // achteraf registreren
  }
  return false;
}

/* ---------- Beschikbaarheid ---------- */
function closureHits(c, room, date){ return date>=c.from && date<=c.to && (c.rooms==='all' || c.rooms.includes(room)); }
function closureRange(c){ return c.allDay ? [0,1440] : [mins(c.start), mins(c.end)]; }
function closureTime(c){ return c.allDay ? 'hele dag' : `${c.start}–${c.end}`; }
function findBlockers(room, date, start, end, ignore){
  const s=mins(start), e=mins(end), out=[];
  for(const b of state.bookings){
    if((ignore && ignore.has(b.id)) || !isActive(b) || b.room!==room || b.date!==date) continue;
    if(mins(b.start)<e && s<mins(b.end)) out.push({kind:'booking', b});
  }
  for(const c of state.closures){
    if(!closureHits(c,room,date)) continue;
    const [cs,ce]=closureRange(c); if(cs<e && s<ce) out.push({kind:'closure', c});
  }
  return out;
}
function blockerText(x){
  if(x.kind==='closure') return `${x.c.title} (${closureTime(x.c)})`;
  const b=x.b;
  if(can('see',b)) return `${b.title}, ${b.start}–${b.end} (${STATUS[b.status].toLowerCase()})`;
  return `${b.status==='pending'?'gereserveerd door een lopende aanvraag':'bezet'}, ${b.start}–${b.end}`;
}
function firstFree(room, date, len=60){
  for(let t=S(); t+len<=E(); t+=15){ if(!findBlockers(room,date,hm(t),hm(t+len)).length) return {start:hm(t), end:hm(t+len)}; }
  return {start:hm(S()), end:hm(Math.min(S()+len,E()))};
}
function closureConflicts(b){ return state.closures.filter(c=>closureHits(c,b.room,b.date) && (()=>{const [cs,ce]=closureRange(c); return cs<mins(b.end) && mins(b.start)<ce;})()); }

/* ---------- Verval van aanvragen ---------- */
function deadline(b){ const d=addWorkdays(localDateOf(b.createdAt), state.settings.expiryWorkdays); return d<b.date ? d : b.date; }
function expiryChip(b){
  const dl=deadline(b), t=today(), left=workdaysUntil(t,dl);
  if(dl===t) return `<span class="pl-chip bad" title="Wordt na vandaag automatisch vrijgegeven">Vervalt vandaag</span>`;
  return `<span class="pl-chip ${left<=1?'warn':''}" title="Vervalt op ${esc(fmtDay(dl))} als hij niet bevestigd is">Vervalt over ${plural(left,'werkdag','werkdagen')}</span>`;
}
function sweepExpired(){ /* verlopen aanvragen worden door de server afgesloten */ }
function log(b, action, by){ (b.history ||= []).push({at:new Date().toISOString(), by:by || Auth.user().name, action}); }

/* ---------- Weergave ---------- */
const narrow = () => window.matchMedia('(max-width: 760px)').matches;
function views(){
  return Auth.isAdmin()
    ? [['dag','Dagplanning'],['week','Weekoverzicht'],['aanvragen','Aanvragen'],['beheer','Beheer']]
    : [['dag','Dagplanning'],['week','Weekoverzicht'],['mijn','Mijn boekingen']];
}
function saveUi(){ try{ localStorage.setItem(CONFIG.storageKey+':ui', JSON.stringify({room:ui.room})); }catch(e){} }

function render(){
  sweepExpired();
  if(!views().some(v=>v[0]===ui.view)) ui.view='dag';
  if(ui.room!=='all' && !activeRooms().some(r=>r.id===ui.room)) ui.room='all';
  renderUser(); renderStats(); renderTabs(); renderToolbar();
  const v=$('#view');
  v.innerHTML = ui.view==='dag' ? dayHtml() : ui.view==='week' ? weekHtml() : ui.view==='aanvragen' ? requestsHtml() : ui.view==='mijn' ? mineHtml() : manageHtml();
  postHeight();
}

function renderUser(){
  $('#lead').textContent = Auth.isAdmin()
    ? 'Alle labs, lessen en aanvragen in één overzicht. Aanvragen worden pas definitief als jij of een collega ze bevestigt.'
    : 'Bekijk welke labs vrij zijn en dien een aanvraag in. Je tijdvak is direct voor je gereserveerd tot i-lab het bevestigt.';
}

function renderStats(){
  const t=today(), admin=Auth.isAdmin(), act=state.bookings.filter(isActive), rooms=activeRooms();
  const lessons = act.filter(b=>b.date===t && b.status==='confirmed').length;
  const n=nowMins(); let free='–', freeSub='Buiten openingstijden';
  if(isWorkday(t) && n>=S() && n<E()){ free=rooms.filter(r=>!findBlockers(r.id,t,hm(n),hm(n+1)).length).length; freeSub=`van de ${rooms.length} labs, om ${hm(n)}`; }
  const tiles=[];
  tiles.push({label:'Lessen vandaag', value: isWorkday(t)?lessons:'–', sub: isWorkday(t)?'Bevestigd, alle labs':'Vandaag gesloten', act:`data-act="goToday"`});
  if(admin){
    const open=act.filter(b=>b.status==='pending');
    const soon=open.filter(b=>workdaysUntil(t,deadline(b))<=1);
    tiles.push({label:'Open aanvragen', value:groupSeries(open).length, sub:open.length?'Wachten op bevestiging':'Alles is afgehandeld', act:`data-act="view" data-view="aanvragen"`});
    tiles.push({label:'Labs nu vrij', value:free, sub:freeSub});
    tiles.push({label:'Vervalt binnenkort', value:groupSeries(soon).length, sub:'Binnen 1 werkdag vrijgegeven', act:`data-act="view" data-view="aanvragen"`, alert:soon.length>0});
  }else{
    const mine=state.bookings.filter(isMine);
    tiles.push({label:'Mijn open aanvragen', value:groupSeries(mine.filter(b=>b.status==='pending')).length, sub:'Wachten op i-lab', act:`data-act="view" data-view="mijn"`});
    tiles.push({label:'Labs nu vrij', value:free, sub:freeSub});
    tiles.push({label:'Mijn komende lessen', value:mine.filter(b=>b.status==='confirmed' && b.date>=t).length, sub:'Bevestigd', act:`data-act="view" data-view="mijn"`});
  }
  $('#stats').innerHTML = tiles.map(x=>{
    const tag = x.act ? 'button' : 'div';
    return `<${tag} class="pl-stat ${x.alert?'alert':''}" ${x.act?`type="button" ${x.act}`:''}><small>${x.label}</small><strong>${x.value}</strong><span>${esc(x.sub)}</span></${tag}>`;
  }).join('');
}

function renderTabs(){
  const pendingGroups = Auth.isAdmin()
    ? groupSeries(state.bookings.filter(b=>b.status==='pending')).length
    : groupSeries(state.bookings.filter(b=>isMine(b) && b.status==='pending')).length;
  $('#tabs').innerHTML = views().map(([id,label])=>{
    const count = (id==='aanvragen'||id==='mijn') && pendingGroups ? `<span class="pl-count">${pendingGroups}</span>` : '';
    return `<button type="button" class="pl-tab" role="tab" aria-selected="${ui.view===id}" data-act="view" data-view="${id}">${label}${count}</button>`;
  }).join('');
}

function renderToolbar(){
  const planning = ui.view==='dag' || ui.view==='week';
  $('#dateNav').hidden = !planning; $('#legend').hidden = !planning;
  $('#newBtn').textContent = Auth.isAdmin() ? '+ Nieuwe boeking' : '+ Aanvraag indienen';
  $('#dateInput').value = ui.date;
  $('#prevBtn').setAttribute('aria-label', ui.view==='week'?'Vorige week':'Vorige werkdag');
  $('#nextBtn').setAttribute('aria-label', ui.view==='week'?'Volgende week':'Volgende werkdag');
  const rooms=activeRooms();
  $('#roomFilter').innerHTML = `<option value="all">Alle labs (${rooms.length})</option>` + rooms.map(r=>`<option value="${r.id}">${esc(rl(r))}</option>`).join('');
  $('#roomFilter').value = ui.room;
  $('#legendTip').textContent = narrow() ? '' : (ui.view==='week' ? 'Klik op een lege cel om een aanvraag te maken · klik op een dag om die te openen' : 'Klik op een lege plek in de tijdlijn om een aanvraag te maken');
}

/* Label van een boeking, met privacy: anderen zien alleen bezet/gereserveerd */
function evInfo(b){
  if(can('see',b)) return { title:b.title, sub:`${b.start}–${b.end} · ${b.teacherName}` };
  return { title: b.status==='pending' ? 'Gereserveerd' : 'Bezet', sub:`${b.start}–${b.end}` };
}
function evClass(b){ return `${b.status}${isMine(b)?' mine':''}${closureConflicts(b).length?' warn':''}`; }

function dayItems(roomId, date){
  const bs = state.bookings.filter(b=>isActive(b) && b.room===roomId && b.date===date);
  const cs = state.closures.filter(c=>closureHits(c,roomId,date));
  return {bs, cs};
}

function dayHtml(){
  const date=ui.date;
  if(!isWorkday(date)) return `<div class="pl-closedday"><b>${esc(fmtLong(date))}</b><br>In het weekend zijn de labs gesloten. <button type="button" class="pl-btn pl-sm" data-act="goDate" data-date="${stepWorkday(date,1)}">Naar maandag</button></div>`;
  const rooms=shownRooms();
  if(narrow()) return dayListHtml(rooms, date);
  const s=S(), e=E(), span=e-s, pct=m=>((Math.min(Math.max(m,s),e)-s)/span*100);
  const ticks=[`<span class="pl-tick first" style="left:0">${hm(s)}</span>`];
  for(let h=Math.floor(s/60)+1; h*60<e; h++) ticks.push(`<span class="pl-tick" style="left:${pct(h*60)}%">${z(h)}:00</span>`);
  ticks.push(`<span class="pl-tick last" style="left:100%">${hm(e)}</span>`);
  const nowLine = date===today() && nowMins()>s && nowMins()<e ? `<span class="pl-now" style="left:${pct(nowMins())}%" title="Nu, ${hm(nowMins())}"></span>` : '';
  let html = `<div class="pl-day" style="--step:${(30/span*100).toFixed(4)}%"><div class="pl-dhead"><div class="pl-dlabel">${esc(fmtDay(date))}</div><div class="pl-scale">${ticks.join('')}</div></div>`;
  for(const r of rooms){
    const {bs,cs}=dayItems(r.id,date);
    html += `<div class="pl-row"><div class="pl-lab"><b>${esc(r.id)}</b><span>${esc(r.name)}</span><small>max. ${r.capacity} pers.</small></div>`;
    html += `<div class="pl-track" data-act="slot" data-room="${esc(r.id)}" title="Klik voor een ${Auth.isAdmin()?'boeking':'aanvraag'} in ${esc(r.id)}">`;
    for(const c of cs){ const [cs1,ce1]=closureRange(c); const a=Math.max(cs1,s), b2=Math.min(ce1,e); if(b2<=a) continue;
      html += `<button type="button" class="pl-ev closed" data-act="closure" data-id="${c.id}" style="left:${pct(a)}%;width:${pct(b2)-pct(a)}%" title="${esc(c.title)} · ${closureTime(c)}"><strong>${esc(c.title)}</strong><small>${closureTime(c)}</small></button>`; }
    for(const b of bs.sort((x,y)=>x.start.localeCompare(y.start))){
      const i=evInfo(b), a=mins(b.start), b2=mins(b.end);
      html += `<button type="button" class="pl-ev ${evClass(b)}" data-act="detail" data-id="${b.id}" style="left:${pct(a)}%;width:${pct(b2)-pct(a)}%" title="${esc(i.title)}&#10;${esc(i.sub)}&#10;${STATUS[b.status]}"><strong>${esc(i.title)}</strong><small>${esc(i.sub)}</small></button>`;
    }
    html += nowLine + `</div></div>`;
  }
  if(!rooms.length) html += `<div class="pl-closedday">Geen actieve labs. Zet labs aan onder Beheer.</div>`;
  return html + `</div>`;
}

function listItem(b){
  const i=evInfo(b);
  return `<button type="button" class="pl-litem ${evClass(b)}" data-act="detail" data-id="${b.id}"><span class="t">${b.start}–${b.end}</span><span class="d">${esc(i.title)}${can('see',b)?` · ${esc(b.teacherName)}`:''}${b.status==='pending'?' · <em>aangevraagd</em>':''}</span></button>`;
}
function mergedItems(cs,bs){ return cs.map(c=>({k:c.allDay?'00:00':c.start, h:closureItem(c)})).concat(bs.map(b=>({k:b.start, h:listItem(b)}))).sort((x,y)=>x.k.localeCompare(y.k)).map(x=>x.h).join(''); }
function closureItem(c){ return `<button type="button" class="pl-litem closed" data-act="closure" data-id="${c.id}"><span class="t">${closureTime(c)}</span><span class="d">${esc(c.title)}</span></button>`; }

function dayListHtml(rooms, date){
  let html=`<div class="pl-list"><div class="pl-lgroup" style="background:var(--head)"><h3>${esc(fmtLong(date))}</h3></div>`;
  for(const r of rooms){
    const {bs,cs}=dayItems(r.id,date);
    html += `<section class="pl-lgroup"><header><h3>${esc(r.id)} <span>· ${esc(r.name)}</span></h3><button type="button" class="pl-btn pl-sm" data-act="newAt" data-room="${esc(r.id)}" data-date="${date}">+ ${Auth.isAdmin()?'Boeken':'Aanvragen'}</button></header>`;
    html += mergedItems(cs,bs);
    if(!bs.length && !cs.length) html += `<p class="pl-free">Hele dag vrij (${state.settings.openFrom}–${state.settings.openTo})</p>`;
    html += `</section>`;
  }
  return html + `</div>`;
}

function weekHtml(){
  const M=mondayOf(ui.date), days=[0,1,2,3,4].map(i=>addDays(M,i)), t=today(), rooms=shownRooms();
  if(narrow()){
    let html=`<div class="pl-list">`;
    for(const d of days){
      html += `<section class="pl-lgroup"><header><h3>${esc(fmtLong(d))}${d===t?' <span>· vandaag</span>':''}</h3><button type="button" class="pl-btn pl-sm" data-act="goDate" data-date="${d}">Dag openen</button></header>`;
      let any=false;
      for(const r of rooms){
        const {bs,cs}=dayItems(r.id,d); if(!bs.length && !cs.length) continue; any=true;
        html += `<div class="pl-meta"><b>${esc(r.id)}</b> · ${esc(r.name)}</div>` + mergedItems(cs,bs);
      }
      if(!any) html += `<p class="pl-free">Alle ${rooms.length===1?'gekozen labs':'labs'} zijn de hele dag vrij</p>`;
      html += `</section>`;
    }
    return html + `</div>`;
  }
  let html = `<table class="pl-week"><colgroup><col style="width:var(--labw)">${days.map(()=>'<col>').join('')}</colgroup><thead><tr><th>Lab / ruimte</th>`;
  html += days.map(d=>`<th class="${d===t?'is-today':''}"><button type="button" data-act="goDate" data-date="${d}" title="Open dagplanning">${esc(fmtDay(d))}</button></th>`).join('') + `</tr></thead><tbody>`;
  for(const r of rooms){
    html += `<tr><td><b>${esc(r.id)}</b><br><span class="pl-meta">${esc(r.name)}</span></td>`;
    for(const d of days){
      const {bs,cs}=dayItems(r.id,d);
      html += `<td class="${d===t?'is-today':''}" data-act="cell" data-room="${esc(r.id)}" data-date="${d}">`;
      const items = cs.map(c=>({k:c.allDay?'00:00':c.start, h:`<button type="button" class="pl-wc closed" data-act="closure" data-id="${c.id}"><b>${closureTime(c)}</b>${esc(c.title)}</button>`}))
        .concat(bs.map(b=>{ const i=evInfo(b); return {k:b.start, h:`<button type="button" class="pl-wc ${evClass(b)}" data-act="detail" data-id="${b.id}" title="${esc(i.sub)} · ${STATUS[b.status]}"><b>${b.start}–${b.end}</b>${esc(i.title)}</button>`}; }));
      html += items.sort((x,y)=>x.k.localeCompare(y.k)).map(x=>x.h).join('');
      html += `</td>`;
    }
    html += `</tr>`;
  }
  return html + `</tbody></table>`;
}

/* Reeksen samenvoegen tot één aanvraag in de lijsten */
function groupSeries(list){
  const map=new Map();
  for(const b of list){ const k=b.seriesId||b.id; if(!map.has(k)) map.set(k,[]); map.get(k).push(b); }
  return [...map.values()].map(g=>g.sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)));
}

function reqCard(g, mode){
  const b=g[0], r=roomOf(b.room), series=g.length>1, st=b.status;
  const dates = series ? `${plural(g.length,'datum','data')}: ${g.map(x=>esc(fmtDay(x.date))).join(', ')}` : esc(fmtLong(b.date));
  const chips=[`<span class="pl-chip ${STATUS_CHIP[st]}">${STATUS[st]}</span>`];
  if(series) chips.push(`<span class="pl-chip info">Reeks · ${g.length}×</span>`);
  if(st==='pending') chips.push(expiryChip(g.reduce((m,x)=>deadline(x)<deadline(m)?x:m,g[0])));
  if(b.students>r.capacity) chips.push(`<span class="pl-chip warn" title="Capaciteit ${esc(r.id)}: ${r.capacity}">${b.students} leerlingen · max. ${r.capacity}</span>`);
  const conflicts=g.filter(x=>isActive(x) && closureConflicts(x).length);
  if(conflicts.length) chips.push(`<span class="pl-chip bad">Valt in sluiting (${conflicts.length})</span>`);
  const acts=[];
  if(mode==='review'){
    acts.push(series ? `<button type="button" class="pl-btn pl-okbtn" data-act="approve" data-id="${b.id}" data-all="1">✓ Reeks bevestigen</button>` : `<button type="button" class="pl-btn pl-okbtn" data-act="approve" data-id="${b.id}">✓ Bevestigen</button>`);
    acts.push(`<button type="button" class="pl-btn pl-dangerbtn" data-act="reject" data-id="${b.id}" ${series?'data-all="1"':''}>Afwijzen</button>`);
  }
  if(mode==='mine-open'){
    acts.push(`<button type="button" class="pl-btn" data-act="edit" data-id="${b.id}" ${series?'hidden':''}>Wijzigen</button>`);
    acts.push(`<button type="button" class="pl-btn pl-dangerbtn" data-act="withdraw" data-id="${b.id}">Intrekken</button>`);
  }
  if(mode==='mine-upcoming') acts.push(`<button type="button" class="pl-btn pl-dangerbtn" data-act="cancel" data-id="${b.id}">Annuleren</button>`);
  acts.push(`<button type="button" class="pl-btn" data-act="detail" data-id="${b.id}">Details</button>`);
  const cls = st==='pending'?'pending':st==='confirmed'?'confirmed':'done';
  return `<article class="pl-req ${cls}"><div class="pl-req-main">
    <div class="pl-req-title"><strong>${esc(b.title)}</strong><span class="pl-chips">${chips.join('')}</span></div>
    <div class="pl-meta"><b>${esc(rl(r))}</b> · ${b.start}–${b.end} · ${dates}</div>
    <div class="pl-meta">${esc(b.teacherName)}${b.school?` · ${esc(b.school)}`:''}${b.level?` · ${esc(b.level)}`:''} · ${plural(b.students,'leerling','leerlingen')}</div>
    ${b.notes?`<div class="pl-note">${esc(b.notes)}</div>`:''}
    ${st==='rejected'&&b.rejectReason?`<div class="pl-note"><b>Reden:</b> ${esc(b.rejectReason)}</div>`:''}
    ${b.reviewedAt&&!['pending'].includes(st)?`<div class="pl-hint">${STATUS[st]} door ${esc(b.reviewedBy||'i-lab')} · ${esc(fmtStamp(b.reviewedAt))}</div>`:''}
  </div><div class="pl-req-actions">${acts.join('')}</div></article>`;
}

function requestsHtml(){
  const open=groupSeries(state.bookings.filter(b=>b.status==='pending')).sort((a,b)=>{
    const da=a.reduce((m,x)=>deadline(x)<m?deadline(x):m,'9999'), db=b.reduce((m,x)=>deadline(x)<m?deadline(x):m,'9999');
    return da.localeCompare(db) || (a[0].date+a[0].start).localeCompare(b[0].date+b[0].start);
  });
  const done=groupSeries(state.bookings.filter(b=>b.reviewedAt && b.status!=='pending'))
    .sort((a,b)=>String(b[0].reviewedAt).localeCompare(String(a[0].reviewedAt))).slice(0,8);
  const expired=groupSeries(state.bookings.filter(b=>b.status==='expired')).slice(-5).reverse();
  return `<div class="pl-panel">
    <section class="pl-sect"><h2>Open aanvragen</h2>
      <p class="pl-hint">Een aanvraag houdt het tijdvak vast tot je hem bevestigt of afwijst. Na ${plural(state.settings.expiryWorkdays,'werkdag','werkdagen')} (of op de lesdag zelf) vervalt hij en komt het tijdvak weer vrij. Bovenaan staat wat het eerst vervalt.</p>
      ${open.length?open.map(g=>reqCard(g,'review')).join(''):`<div class="pl-empty">Geen open aanvragen. Alles is afgehandeld.</div>`}
    </section>
    ${expired.length?`<section class="pl-sect"><h2>Onlangs verlopen</h2>${expired.map(g=>reqCard(g,'view')).join('')}</section>`:''}
    <section class="pl-sect"><h2>Recent afgehandeld</h2>
      ${done.length?done.map(g=>reqCard(g,'view')).join(''):`<div class="pl-empty">Nog niets afgehandeld.</div>`}
    </section></div>`;
}

function mineHtml(){
  const t=today(), mine=state.bookings.filter(isMine);
  const open=groupSeries(mine.filter(b=>b.status==='pending'));
  const up=mine.filter(b=>b.status==='confirmed' && b.date>=t).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)).map(b=>[b]);
  const past=groupSeries(mine.filter(b=>!isActive(b))).sort((a,b)=>String(b[0].reviewedAt||b[0].createdAt).localeCompare(String(a[0].reviewedAt||a[0].createdAt))).slice(0,10);
  return `<div class="pl-panel">
    <section class="pl-sect"><h2>Mijn open aanvragen</h2>
      <p class="pl-hint">Je tijdvak is gereserveerd: andere docenten kunnen het niet meer aanvragen. Het wordt definitief zodra i-lab het bevestigt. Gebeurt dat niet binnen ${plural(state.settings.expiryWorkdays,'werkdag','werkdagen')}, dan vervalt de aanvraag.</p>
      ${open.length?open.map(g=>reqCard(g,'mine-open')).join(''):`<div class="pl-empty">Je hebt geen open aanvragen. Klik in de dagplanning op een vrije plek om er een te maken.</div>`}
    </section>
    <section class="pl-sect"><h2>Mijn komende lessen</h2>
      ${up.length?up.map(g=>reqCard(g,'mine-upcoming')).join(''):`<div class="pl-empty">Nog geen bevestigde lessen gepland.</div>`}
    </section>
    <section class="pl-sect"><h2>Afgehandeld</h2>
      ${past.length?past.map(g=>reqCard(g,'view')).join(''):`<div class="pl-empty">Nog geen afgewezen, verlopen of geannuleerde boekingen.</div>`}
    </section></div>`;
}

function manageHtml(){
  const t=today(), st=state.settings;
  const cls=state.closures.filter(c=>c.to>=t).sort((a,b)=>a.from.localeCompare(b.from));
  const roomsTxt=c=>c.rooms==='all'?'alle labs':c.rooms.join(', ');
  const monthStart=t.slice(0,8)+'01', d=parse(monthStart); d.setMonth(d.getMonth()+1); d.setDate(0); const monthEnd=iso(d);
  return `<div class="pl-panel"><div class="pl-grid2">
    <section class="pl-card"><h2>Sluitingen en blokkades</h2>
      <p class="pl-hint">Vakanties, studiedagen of onderhoud in één keer blokkeren, voor alle labs of een selectie. Niemand kan dan nog aanvragen in die tijd.</p>
      <div class="pl-fields">
        <label class="full">Omschrijving<input id="cTitle" maxlength="80" placeholder="Bijv. Kerstvakantie, studiedag, onderhoud"></label>
        <label>Van<input type="date" id="cFrom" value="${t}"></label>
        <label>Tot en met<input type="date" id="cTo" value="${t}"></label>
        <label class="pl-checkrow full"><input type="checkbox" id="cAllDay" checked> Hele dag</label>
        <label>Van tijd<input type="time" id="cStart" step="900" value="${st.openFrom}" disabled></label>
        <label>Tot tijd<input type="time" id="cEnd" step="900" value="${st.openTo}" disabled></label>
        <fieldset class="pl-roomsel full"><legend>Labs</legend>
          <label class="pl-checkrow"><input type="checkbox" id="cAll" checked> Alle labs</label>
          <div class="pl-roomchecks" id="cRooms" hidden>${state.rooms.map(r=>`<label><input type="checkbox" value="${esc(r.id)}"> ${esc(rl(r))}</label>`).join('')}</div>
        </fieldset>
      </div>
      <div class="pl-actions"><button type="button" class="pl-btn pl-primary" data-act="addClosure">Sluiting toevoegen</button></div>
      <div class="pl-rowlist">${cls.length?cls.map(c=>`<div class="pl-cl"><div><b>${esc(c.title)}</b><span>${esc(fmtDay(c.from))}${c.to!==c.from?' t/m '+esc(fmtDay(c.to)):''} · ${closureTime(c)} · ${esc(roomsTxt(c))}</span></div><button type="button" class="pl-btn pl-sm pl-dangerbtn" data-act="delClosure" data-id="${c.id}">Verwijderen</button></div>`).join(''):'<div class="pl-empty">Geen komende sluitingen.</div>'}</div>
    </section>

    <section class="pl-card"><h2>Ruimtes</h2>
      <p class="pl-hint">Naam, capaciteit en volgorde per lab. Met de pijltjes bepaal je welk lab bovenaan de planning staat; dat geldt voor iedereen. Bij te veel leerlingen krijgen docent en beheer een waarschuwing. Een lab dat uit staat verdwijnt uit de planning.</p>
      <div>
        <div class="pl-roomrow head"><span>Lab</span><span>Omschrijving</span><span>Capaciteit</span><span>Actief</span><span>Docent mag boeken</span><span>Leerlingen ok</span><span>Volgorde</span></div>
        ${state.rooms.map((r,idx)=>`<div class="pl-roomrow"><b>${esc(r.id)}</b><input class="pl-input" id="rName-${esc(r.id)}" value="${esc(r.name)}" aria-label="Naam ${esc(r.id)}"><input class="pl-input" type="number" min="1" max="999" id="rCap-${esc(r.id)}" value="${r.capacity}" aria-label="Capaciteit ${esc(r.id)}"><label><input type="checkbox" id="rAct-${esc(r.id)}" ${r.active?'checked':''}> aan</label><label><input type="checkbox" id="rDoc-${esc(r.id)}" ${r.docentBoekbaar?'checked':''}> docent</label><label><input type="checkbox" id="rLln-${esc(r.id)}" ${r.leerlingenToegestaan?'checked':''}> leerlingen</label><span class="pl-order"><button type="button" class="pl-btn" data-act="moveRoom" data-id="${esc(r.id)}" data-dir="-1" aria-label="${esc(r.id)} omhoog" ${idx===0?'disabled':''}>↑</button><button type="button" class="pl-btn" data-act="moveRoom" data-id="${esc(r.id)}" data-dir="1" aria-label="${esc(r.id)} omlaag" ${idx===state.rooms.length-1?'disabled':''}>↓</button></span></div>`).join('')}
      </div>
      <div class="pl-fields" style="margin-top:14px"><label>Nieuw lab (naam)<input id="rNewName" maxlength="40" placeholder="Bijv. Lab 12"></label><label>Capaciteit<input type="number" id="rNewCap" min="1" max="999" value="30"></label></div>
      <div class="pl-actions"><button type="button" class="pl-btn" data-act="addRoom">Lab toevoegen</button><button type="button" class="pl-btn pl-primary" data-act="saveRooms">Ruimtes opslaan</button></div>
    </section>

    <section class="pl-card"><h2>Openingstijden en aanvragen</h2>
      <div class="pl-fields">
        <label>Open vanaf<input type="time" id="sFrom" step="900" value="${st.openFrom}"></label>
        <label>Open tot<input type="time" id="sTo" step="900" value="${st.openTo}"></label>
        <label class="full">Aanvraag vervalt na (werkdagen)<input type="number" id="sExpiry" min="1" max="20" value="${st.expiryWorkdays}"></label>
      </div>
      <p class="pl-hint">Geldt voor maandag t/m vrijdag. Een aanvraag vervalt ook als de lesdag zelf voorbij is zonder bevestiging.</p>
      <div class="pl-actions"><button type="button" class="pl-btn pl-primary" data-act="saveSettings">Instellingen opslaan</button></div>
    </section>

    <section class="pl-card"><h2>Export voor de verantwoording</h2>
      <p class="pl-hint">Alle bevestigde lessen in een periode, met school, niveau en aantal leerlingen. Plak ze direct in Excel.</p>
      <div class="pl-fields">
        <label>Van<input type="date" id="eFrom" value="${monthStart}"></label>
        <label>Tot en met<input type="date" id="eTo" value="${monthEnd}"></label>
      </div>
      <div class="pl-actions"><button type="button" class="pl-btn pl-primary" data-act="copyExport">Kopieer voor Excel</button></div>
      <div id="eResult"></div>
    </section>
  </div>
  </div>`;
}

/* ---------- Detailvenster ---------- */
function openDetail(id){
  const b=find(id); if(!b) return;
  const r=roomOf(b.room), dlg=$('#detailDlg');
  if(!can('see',b)){
    dlg.innerHTML = `<div class="pl-dlg-head"><div><span class="pl-eyebrow">${esc(rl(r))}</span><h2 id="detailTitle">${b.status==='pending'?'Gereserveerd':'Bezet'}</h2></div><button type="button" class="pl-x" data-close="detailDlg" aria-label="Sluiten">×</button></div>
      <div class="pl-dlg-body"><p>${esc(fmtLong(b.date))}, ${b.start}–${b.end}.</p><p class="pl-hint">${b.status==='pending'?'Een andere docent heeft dit tijdvak aangevraagd. Het blijft gereserveerd tot i-lab beslist.':'Dit tijdvak is bevestigd voor een andere les.'} Kies een ander tijdstip of lab.</p></div>
      <div class="pl-dlg-foot"><button type="button" class="pl-btn" data-close="detailDlg">Sluiten</button><button type="button" class="pl-btn pl-primary" data-act="newAt" data-room="${esc(b.room)}" data-date="${b.date}">Ander tijdstip aanvragen</button></div>`;
    dlg.classList.add('narrow'); dlg.showModal(); return;
  }
  dlg.classList.remove('narrow');
  const series = b.seriesId ? state.bookings.filter(x=>x.seriesId===b.seriesId).sort((x,y)=>x.date.localeCompare(y.date)) : [];
  const pendSeries = series.filter(x=>x.status==='pending');
  const chips=[`<span class="pl-chip ${STATUS_CHIP[b.status]}">${STATUS[b.status]}</span>`];
  if(b.status==='pending') chips.push(expiryChip(b));
  if(isMine(b)) chips.push(`<span class="pl-chip info">Jouw boeking</span>`);
  const cc=isActive(b)?closureConflicts(b):[];
  const acts=[];
  if(can('review',b)){
    if(pendSeries.length>1) acts.push(`<button type="button" class="pl-btn pl-okbtn" data-act="approve" data-id="${b.id}" data-all="1">✓ Hele reeks bevestigen (${pendSeries.length})</button>`);
    acts.push(`<button type="button" class="pl-btn ${pendSeries.length>1?'':'pl-okbtn'}" data-act="approve" data-id="${b.id}">✓ ${pendSeries.length>1?'Alleen deze datum':'Bevestigen'}</button>`);
    acts.push(`<button type="button" class="pl-btn pl-dangerbtn" data-act="reject" data-id="${b.id}" ${pendSeries.length>1?'data-all="1"':''}>Afwijzen</button>`);
  }
  if(can('edit',b)) acts.push(`<button type="button" class="pl-btn" data-act="edit" data-id="${b.id}">Wijzigen</button>`);
  if(can('withdraw',b)) acts.push(`<button type="button" class="pl-btn pl-dangerbtn" data-act="withdraw" data-id="${b.id}">Intrekken</button>`);
  if(can('cancel',b)) acts.push(`<button type="button" class="pl-btn pl-dangerbtn" data-act="cancel" data-id="${b.id}">Annuleren</button>`);
  if(can('delete',b)) acts.push(`<button type="button" class="pl-btn pl-dangersolid" data-act="delete" data-id="${b.id}">Verwijderen</button>`);
  dlg.innerHTML = `<div class="pl-dlg-head"><div><span class="pl-eyebrow">${esc(rl(r))}</span><h2 id="detailTitle">${esc(b.title)}</h2></div><button type="button" class="pl-x" data-close="detailDlg" aria-label="Sluiten">×</button></div>
    <div class="pl-dlg-body">
      <div class="pl-chips">${chips.join('')}</div>
      ${cc.length?`<div class="pl-error">Deze boeking valt binnen een sluiting: ${cc.map(c=>esc(c.title)).join(', ')}. Overleg met de docent of verplaats de les.</div>`:''}
      ${b.students>r.capacity?`<div class="pl-warnbox">${plural(b.students,'leerling','leerlingen')} is meer dan de capaciteit van ${esc(r.id)} (${r.capacity}).</div>`:''}
      <dl class="pl-dl">
        <dt>Datum en tijd</dt><dd>${esc(fmtLong(b.date))}, ${b.start}–${b.end}</dd>
        <dt>Docent / organisator</dt><dd>${esc(b.teacherName)}</dd>
        <dt>School / organisatie</dt><dd>${esc(b.school)||'–'}</dd>
        <dt>Niveau / klas</dt><dd>${esc(b.level)||'–'}</dd>
        <dt>Soort</dt><dd>${esc(b.categorie==='bijeenkomst'?'Bijeenkomst · ':'Les · ')}${esc(typeLabel(b))}</dd>
        <dt>Leerlingen</dt><dd>${b.students} <span class="pl-hint">(max. ${r.capacity} in dit lab)</span></dd>
        ${b.notes?`<dt>Toelichting</dt><dd>${esc(b.notes)}</dd>`:''}
        ${series.length>1?`<dt>Reeks</dt><dd>${series.map(x=>`<span class="pl-chip ${STATUS_CHIP[x.status]}" title="${STATUS[x.status]}">${esc(fmtDay(x.date))}</span>`).join(' ')}</dd>`:''}
        ${b.status==='rejected'?`<dt>Reden afwijzing</dt><dd>${esc(b.rejectReason)||'Geen reden opgegeven'}</dd>`:''}
      </dl>
      <div><div class="pl-hint" style="font-weight:700;margin-bottom:4px">Geschiedenis</div><ul class="pl-hist">${(b.history||[]).map(h=>`<li><time>${esc(fmtStamp(h.at))}</time><span>${esc(h.action)} · ${esc(h.by)}</span></li>`).join('')}</ul></div>
    </div>
    <div class="pl-dlg-foot"><button type="button" class="pl-btn pl-spacer" data-close="detailDlg">Sluiten</button>${acts.join('')}</div>`;
  dlg.showModal();
}

function openClosure(id){
  const c=state.closures.find(x=>x.id===id); if(!c) return;
  ask({ title:c.title, html:`<p>${esc(fmtLong(c.from))}${c.to!==c.from?' t/m '+esc(fmtLong(c.to)):''}</p><p class="pl-hint">${closureTime(c)} · ${c.rooms==='all'?'alle labs':esc(c.rooms.join(', '))}. In deze tijd kan niemand een aanvraag doen.</p>`,
        ok: can('manage')?'Sluiting verwijderen':'Sluiten', danger:can('manage'), noCancel:!can('manage') })
    .then(res=>{ if(res.ok && can('manage')) removeClosure(id, true); });
}

/* ---------- Bevestigingsvenster (vervangt alert/confirm) ---------- */
function ask(o){
  return new Promise(resolve=>{
    const d=$('#askDlg');
    const main = o.choices
      ? o.choices.map(c=>`<button type="button" class="pl-btn ${c.danger?'pl-dangersolid':'pl-primary'}" data-choice="${esc(c.value)}">${esc(c.label)}</button>`).join('')
      : `<button type="button" class="pl-btn ${o.danger?'pl-dangersolid':'pl-primary'}" data-choice="ok">${esc(o.ok||'Bevestigen')}</button>`;
    d.innerHTML = `<div class="pl-dlg-head"><h2>${esc(o.title)}</h2></div>
      <div class="pl-dlg-body">${o.html || `<p>${esc(o.text||'')}</p>`}
      ${o.input?`<label class="pl-field">${esc(o.input.label)}<textarea id="askInput" class="pl-input" rows="3" maxlength="300" placeholder="${esc(o.input.placeholder||'')}"></textarea></label>`:''}</div>
      <div class="pl-dlg-foot">${o.noCancel?'':'<button type="button" class="pl-btn" data-choice="">Annuleren</button>'}${main}</div>`;
    let result={ok:false, value:null};
    d.onclick = e => {
      const btn=e.target.closest('[data-choice]'); if(!btn) return;
      const v=btn.dataset.choice;
      result = v ? {ok:true, value: o.input ? $('#askInput').value.trim() : v} : {ok:false, value:null};
      d.close();
    };
    d.onclose = () => { d.onclick=null; d.onclose=null; resolve(result); };
    d.showModal();
    const focusEl = o.input ? $('#askInput') : d.querySelector('[data-choice]:last-child'); if(focusEl) focusEl.focus();
  });
}
function closeDialog(id){ const d=byId(id); if(d && d.open) d.close(); }

/* ---------- Acties op boekingen ---------- */
function seriesOf(b, pred){ return b.seriesId ? state.bookings.filter(x=>x.seriesId===b.seriesId && pred(x)) : [b]; }

async function approve(id, all){
  const b=find(id); if(!b || !can('review',b)) return;
  closeDialog('detailDlg');
  const list = all ? seriesOf(b, x=>x.status==='pending') : [b];
  const ok=[], blocked=[];
  for(const x of list){
    const bl=findBlockers(x.room,x.date,x.start,x.end,new Set([x.id]));
    if(bl.length){ blocked.push(`${fmtDay(x.date)}: ${blockerText(bl[0])}`); continue; }
    x.status='confirmed'; x.reviewedBy=Auth.user().name; x.reviewedAt=new Date().toISOString(); log(x,'Bevestigd'); ok.push(x);
  }
  commit();
  if(blocked.length) await ask({title:'Niet alles kon worden bevestigd', html:`<p>${ok.length?`${plural(ok.length,'datum is','data zijn')} bevestigd. `:''}Deze data overlappen met iets anders:</p><ul class="pl-ul">${blocked.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`, ok:'Begrepen', noCancel:true});
  else toast(ok.length>1 ? `Reeks bevestigd (${ok.length} data)` : `Bevestigd: ${b.title}, ${fmtDay(b.date)}`);
}

async function reject(id, all){
  const b=find(id); if(!b || !can('review',b)) return;
  closeDialog('detailDlg');
  const list = all ? seriesOf(b, x=>x.status==='pending') : [b];
  const res=await ask({ title: list.length>1 ? `Reeks afwijzen (${list.length} data)` : 'Aanvraag afwijzen',
    text:`"${b.title}" van ${b.teacherName}. De docent ziet de reden bij Mijn boekingen.`,
    input:{label:'Reden (optioneel, helpt de docent)', placeholder:'Bijv. het lab is die dag in gebruik; Lab-04 is wel vrij'}, ok:'Afwijzen', danger:true });
  if(!res.ok) return;
  for(const x of list){ x.status='rejected'; x.rejectReason=res.value; x.reviewedBy=Auth.user().name; x.reviewedAt=new Date().toISOString(); log(x,'Afgewezen'+(res.value?': '+res.value:'')); }
  commit(); toast(list.length>1 ? `Reeks afgewezen (${list.length} data)` : 'Aanvraag afgewezen, tijdvak is weer vrij');
}

async function pickScope(b, pred, verb, allLabel){
  const list=seriesOf(b,pred);
  if(list.length<=1){
    const r=await ask({title:`${verb}?`, text:`${b.title} · ${fmtLong(b.date)}, ${b.start}–${b.end}. Het tijdvak komt weer vrij.`, ok:verb, danger:true});
    return r.ok ? [b] : null;
  }
  const r=await ask({title:`${verb}?`, text:`Deze les hoort bij een reeks. Wat wil je ${verb.toLowerCase()}?`,
    choices:[{value:'one', label:'Alleen deze datum'}, {value:'all', label:`${allLabel} (${list.length})`, danger:true}]});
  if(!r.ok) return null;
  return r.value==='all' ? list : [b];
}

async function withdraw(id){
  const b=find(id); if(!b || !can('withdraw',b)) return;
  closeDialog('detailDlg');
  const list=await pickScope(b, x=>x.status==='pending', 'Intrekken', 'Hele reeks'); if(!list) return;
  for(const x of list){ x.status='withdrawn'; log(x,'Ingetrokken door docent'); }
  commit(); toast(list.length>1?`${list.length} aanvragen ingetrokken`:'Aanvraag ingetrokken');
}

async function cancelBooking(id){
  const b=find(id); if(!b || !can('cancel',b)) return;
  closeDialog('detailDlg');
  const list=await pickScope(b, x=>x.status==='confirmed' && x.date>=b.date, 'Annuleren', 'Deze en alle volgende'); if(!list) return;
  for(const x of list){ x.status='cancelled'; log(x,'Geannuleerd'); }
  commit(); toast(list.length>1?`${list.length} lessen geannuleerd`:'Les geannuleerd, tijdvak is weer vrij');
}

async function deleteBooking(id){
  const b=find(id); if(!b || !can('delete',b)) return;
  closeDialog('detailDlg');
  const series=seriesOf(b, ()=>true);
  const base=`${b.title} · ${b.room} · ${fmtLong(b.date)}, ${b.start}–${b.end}.`;
  const warn='Hij verdwijnt definitief uit de planning, de geschiedenis en de export. Dit kun je niet ongedaan maken.';
  const r = series.length>1
    ? await ask({title:'Boeking verwijderen?', html:`<p>${esc(base)}</p><p class="pl-hint">Deze boeking hoort bij een reeks van ${series.length} data. ${esc(warn)}</p>`,
        choices:[{value:'one',label:'Alleen deze datum'},{value:'all',label:`Hele reeks (${series.length})`,danger:true}]})
    : await ask({title:'Boeking verwijderen?', html:`<p>${esc(base)}</p><p class="pl-hint">${esc(warn)}</p>`, ok:'Definitief verwijderen', danger:true});
  if(!r.ok) return;
  const ids=new Set(r.value==='all' ? series.map(x=>x.id) : [b.id]);
  state.bookings=state.bookings.filter(x=>!ids.has(x.id));
  commit(); toast(ids.size>1 ? `${ids.size} boekingen verwijderd` : 'Boeking verwijderd');
}

/* ---------- Formulier: aanvraag / boeking ---------- */
let editing=null;
function openForm(p={}){
  closeDialog('detailDlg');
  const admin=Auth.isAdmin(), u=Auth.user(), f=$('#bookForm');
  editing = p.edit || null; f.reset();
  $('#fRoom').innerHTML = bookableRooms().map(r=>`<option value="${esc(r.id)}">${esc(rl(r))} (max. ${r.capacity})</option>`).join('');
  $('#teacherList').innerHTML = Auth.knownTeachers().map(t=>`<option value="${esc(t.name)}">`).join('');
  const src = editing || {};
  let room = src.room || p.room || (ui.room!=='all'?ui.room:activeRooms()[0]?.id);
  if(!editing && !canBookRoom(room)) room = bookableRooms()[0]?.id || room;
  let date = src.date || p.date || ui.date; if(!editing && !isWorkday(date)) date=toWorkday(date);
  const slot = (p.start && p.end) ? {start:p.start,end:p.end} : (src.start ? {start:src.start,end:src.end} : firstFree(room,date));
  $('#fRoom').value=room; $('#fDate').value=date; $('#fStart').value=slot.start; $('#fEnd').value=slot.end;
  for(const id of ['fStart','fEnd']){ $('#'+id).min=state.settings.openFrom; $('#'+id).max=state.settings.openTo; }
  $('#fDate').min = can('past') ? '' : today();
  $('#fCat').value=src.categorie||'les'; fillTypes(src.activiteit, src.activiteitAnders); $('#fTitle').value=src.title||''; $('#fSchool').value=src.school||''; $('#fLevel').value=src.level||'';
  $('#fStudents').value=src.students||''; $('#fNotes').value=src.notes||'';
  $('#fTeacher').value = editing ? editing.teacherName : (admin ? '' : u.name);
  $('#fTeacher').readOnly = !admin;
  $('#repeatWrap').hidden = !!editing; $('#fRepeat').value='none'; $('#untilWrap').hidden=true; $('#fUntil').value=addDays(date,63);
  $('#formEyebrow').textContent = admin ? 'Planning · beheer' : 'Planning · aanvraag';
  $('#formTitle').textContent = editing ? (editing.status==='pending'?'Aanvraag wijzigen':'Boeking wijzigen') : (admin?'Nieuwe boeking':'Nieuwe aanvraag');
  $('#fSubmit').textContent = editing ? 'Wijzigingen opslaan' : (admin?'Boeking vastleggen':'Aanvraag indienen');
  $('#formHint').textContent = admin ? (editing?'':'Als beheerder leg je de boeking direct definitief vast.') : 'Het tijdvak wordt direct voor je gereserveerd.';
  $('#fError').hidden=true;
  updateFormCheck();
  $('#formDlg').showModal();
  $(src.title ? '#fStudents' : '#fTitle').focus();
}

function fillTypes(sel, anders){
  const cat=$('#fCat').value, opts = cat==='les' ? ACT_LES : ACT_BIJ;
  const cur = opts.includes(sel) ? sel : opts[0];
  $('#fType').innerHTML = opts.map(o=>`<option value="${o}" ${o===cur?'selected':''}>${ACT_LABELS[o]}</option>`).join('');
  $('#fTypeAndersWrap').hidden = $('#fType').value!=='anders';
  if(anders!==undefined) $('#fTypeAnders').value = anders||'';
  $('#fStudentsLabel').textContent = cat==='les' ? 'Aantal leerlingen' : 'Aantal gasten';
}
function readForm(){
  return { room:$('#fRoom').value, date:$('#fDate').value, start:$('#fStart').value, end:$('#fEnd').value,
    title:$('#fTitle').value.trim(), teacherName:$('#fTeacher').value.trim(), school:$('#fSchool').value.trim(),
    level:$('#fLevel').value.trim(), students:Number($('#fStudents').value), notes:$('#fNotes').value.trim(),
    categorie:$('#fCat').value, activiteit:$('#fType').value, activiteitAnders:$('#fTypeAnders').value.trim(),
    repeat: editing ? 'none' : $('#fRepeat').value, until:$('#fUntil').value };
}
function occurrences(d){
  if(d.repeat==='none' || !d.until) return [d.date];
  const step = d.repeat==='2w' ? 14 : 7, out=[];
  for(let x=d.date; x<=d.until && out.length<CONFIG.maxSeries; x=addDays(x,step)) out.push(x);
  return out;
}
function checkDate(d, date){
  if(!isWorkday(date)) return 'weekend, de labs zijn gesloten';
  if(!can('past') && date<today()) return 'deze datum is al voorbij';
  const bl=findBlockers(d.room,date,d.start,d.end, editing?new Set([editing.id]):null);
  return bl.length ? blockerText(bl[0]) : null;
}
function timeProblem(d){
  if(!d.start || !d.end) return 'Vul een begin- en eindtijd in.';
  if(mins(d.start)<S() || mins(d.end)>E()) return `De labs zijn open van ${state.settings.openFrom} tot ${state.settings.openTo}. Kies een tijd daarbinnen.`;
  if(mins(d.end)<=mins(d.start)) return 'De eindtijd moet na de begintijd liggen.';
  return null;
}
function updateFormCheck(){
  const d=readForm(), out=$('#fCheck'), capOut=$('#fCap');
  $('#fError').hidden=true;
  $('#untilWrap').hidden = d.repeat==='none';
  const r=roomOf(d.room);
  capOut.innerHTML = d.students>r.capacity ? `<div class="pl-warnbox">${plural(d.students,'leerling','leerlingen')} is meer dan de capaciteit van ${esc(r.id)} (max. ${r.capacity}). Je kunt wel aanvragen; overleg dan even met i-lab.</div>` : '';
  if(!d.room || !d.date){ out.innerHTML=''; return; }
  const tp=timeProblem(d); if(tp){ out.innerHTML=`<div class="pl-check bad">${esc(tp)}</div>`; return; }
  const occ=occurrences(d), res=occ.map(date=>({date, why:checkDate(d,date)}));
  if(occ.length===1){
    const x=res[0];
    out.innerHTML = x.why ? `<div class="pl-check bad">✕ Niet beschikbaar: ${esc(x.why)}</div>` : `<div class="pl-check good">✓ ${esc(r.id)} is vrij op ${esc(fmtDay(x.date))} van ${d.start} tot ${d.end}</div>`;
    return;
  }
  const free=res.filter(x=>!x.why).length;
  out.innerHTML = `<div class="pl-check ${free===occ.length?'good':free?'mixed':'bad'}">${free} van ${occ.length} data vrij${free<occ.length?` · bezette data worden overgeslagen`:''}
    <div class="pl-chips">${res.map(x=>`<span class="pl-chip ${x.why?'bad':'ok'}" title="${esc(x.why||'Vrij')}">${x.why?'✕':'✓'} ${esc(fmtDay(x.date))}</span>`).join('')}</div></div>`;
}

function submitForm(e){
  e.preventDefault();
  const admin=Auth.isAdmin(), u=Auth.user(), d=readForm(), err=$('#fError');
  const fail = msg => { err.textContent=msg; err.hidden=false; };
  err.hidden=true;
  if(!d.title) return fail('Vul de naam van de les of activiteit in.');
  if(!d.teacherName) return fail('Vul de docent of organisator in.');
  if(!d.date) return fail('Kies een datum.');
  if(!Number.isInteger(d.students) || d.students<0) return fail('Vul het aantal leerlingen of gasten in (0 of meer).');
  if(d.activiteit==='anders' && !d.activiteitAnders) return fail('Vul in wat voor soort bijeenkomst dit is.');
  { const rm=roomOf(d.room); if(d.categorie==='les' && rm.leerlingenToegestaan===false) return fail('Deze ruimte is bedoeld voor volwassenen: kies de categorie Bijeenkomst.'); if(!canBookRoom(d.room)) return fail('Deze ruimte is niet boekbaar voor docenten.'); }
  const tp=timeProblem(d); if(tp) return fail(tp);
  const now=new Date().toISOString();
  if(editing){
    const why=checkDate(d,d.date); if(why) return fail(`Dit tijdvak is niet beschikbaar: ${why}.`);
    const b=find(editing.id); if(!b || !can('edit',b)) return fail('Je kunt deze boeking niet meer wijzigen.');
    const changes=[]; if(b.date!==d.date||b.start!==d.start||b.end!==d.end||b.room!==d.room) changes.push(`verplaatst naar ${d.room}, ${fmtDay(d.date)} ${d.start}–${d.end}`);
    Object.assign(b,{room:d.room,date:d.date,start:d.start,end:d.end,title:d.title,teacherName:d.teacherName,school:d.school,level:d.level,students:d.students,notes:d.notes,categorie:d.categorie,activiteit:d.activiteit,activiteitAnders:d.activiteitAnders});
    if(admin){ const m=Auth.knownTeachers().find(t=>t.name===d.teacherName); if(m) b.teacherId=m.id; }
    log(b,'Gewijzigd'+(changes.length?': '+changes.join(', '):''));
    closeDialog('formDlg'); ui.date=d.date; commit(); toast('Wijzigingen opgeslagen'); return;
  }
  if(d.repeat!=='none' && (!d.until || d.until<d.date)) return fail('Kies tot wanneer de les moet herhalen.');
  const occ=occurrences(d), free=occ.filter(date=>!checkDate(d,date));
  if(!free.length) return fail(occ.length>1 ? 'Geen van de gekozen data is vrij. Kies een ander tijdstip of lab.' : `Dit tijdvak is niet beschikbaar: ${checkDate(d,d.date)}.`);
  const seriesId = free.length>1 ? uid() : null;
  const teacher = admin ? (Auth.knownTeachers().find(t=>t.name===d.teacherName) || {id:'ext-'+d.teacherName.toLowerCase().replace(/[^a-z0-9]+/g,'-')}) : u;
  for(const date of free){
    const b={ id:uid(), seriesId, room:d.room, date, start:d.start, end:d.end, title:d.title, teacherId:teacher.id, teacherName:d.teacherName,
      school:d.school, level:d.level, students:d.students, notes:d.notes, categorie:d.categorie, activiteit:d.activiteit, activiteitAnders:d.activiteitAnders, status: admin?'confirmed':'pending', createdAt:now, createdBy:u.id,
      reviewedBy: admin?u.name:null, reviewedAt: admin?now:null, rejectReason:'', history:[] };
    log(b, admin ? 'Geboekt door beheer' : (seriesId?`Aangevraagd (reeks van ${free.length})`:'Aangevraagd'));
    state.bookings.push(b);
  }
  closeDialog('formDlg'); ui.date=free[0]; commit();
  const skipped=occ.length-free.length;
  toast((admin?'Vastgelegd':'Aanvraag ingediend, tijdvak gereserveerd') + (free.length>1?` · ${free.length} data`:'') + (skipped?` · ${skipped} bezet en overgeslagen`:''));
}

/* ---------- Beheer ---------- */
async function addClosure(){
  if(!can('manage')) return;
  const title=$('#cTitle').value.trim(), from=$('#cFrom').value, to=$('#cTo').value, allDay=$('#cAllDay').checked;
  const start=$('#cStart').value, end=$('#cEnd').value, all=$('#cAll').checked;
  const rooms = all ? 'all' : [...root.querySelectorAll('#cRooms input:checked')].map(i=>i.value);
  if(!title) return toast('Geef de sluiting een omschrijving.');
  if(!from || !to || to<from) return toast('Kies een geldige periode (tot en met ligt op of na de begindatum).');
  if(!allDay && (!start || !end || mins(end)<=mins(start))) return toast('Kies een geldige tijd voor de blokkade.');
  if(rooms!=='all' && !rooms.length) return toast('Kies minstens één lab.');
  const c={ id:uid(), title, from, to, allDay, start:allDay?'':start, end:allDay?'':end, rooms };
  const affected=state.bookings.filter(b=>isActive(b) && closureHits(c,b.room,b.date) && (()=>{const [cs,ce]=closureRange(c); return cs<mins(b.end)&&mins(b.start)<ce;})());
  if(affected.length){
    const res=await ask({ title:'Er staan al boekingen in deze periode',
      html:`<p>${plural(affected.length,'boeking valt','boekingen vallen')} binnen deze sluiting. Ze blijven staan en krijgen een rode markering, zodat je ze kunt verplaatsen of annuleren.</p><ul class="pl-ul">${affected.slice(0,8).map(b=>`<li>${esc(fmtDay(b.date))} · ${esc(b.room)} · ${b.start}–${b.end} · ${esc(b.title)}</li>`).join('')}${affected.length>8?`<li>en ${affected.length-8} meer</li>`:''}</ul>`,
      ok:'Toch toevoegen' });
    if(!res.ok) return;
  }
  state.closures.push(c); commit(); toast(`Sluiting toegevoegd: ${title}`);
}
async function removeClosure(id, skipAsk){
  const c=state.closures.find(x=>x.id===id); if(!c || !can('manage')) return;
  if(!skipAsk){ const r=await ask({title:'Sluiting verwijderen?', text:`${c.title} wordt verwijderd. De labs zijn in die tijd weer te boeken.`, ok:'Verwijderen', danger:true}); if(!r.ok) return; }
  state.closures=state.closures.filter(x=>x.id!==id); commit(); toast('Sluiting verwijderd');
}
function saveRooms(){
  if(!can('manage')) return;
  for(const r of state.rooms){
    const cap=Number(byId('rCap-'+r.id).value);
    if(!Number.isInteger(cap) || cap<1) return toast(`Vul voor ${r.id} een capaciteit van minimaal 1 in.`);
  }
  for(const r of state.rooms){ r.name=byId('rName-'+r.id).value.trim(); r.capacity=Number(byId('rCap-'+r.id).value); r.active=byId('rAct-'+r.id).checked; r.docentBoekbaar=byId('rDoc-'+r.id).checked; r.leerlingenToegestaan=byId('rLln-'+r.id).checked; }
  commit(); toast('Ruimtes opgeslagen');
}
function addRoom(){
  if(!can('manage')) return;
  const name=$('#rNewName').value.trim(), cap=Number($('#rNewCap').value);
  if(!name) return toast('Geef het nieuwe lab een naam.');
  if(state.rooms.some(r=>r.id.toLowerCase()===name.toLowerCase())) return toast('Er is al een lab met deze naam.');
  if(!Number.isInteger(cap) || cap<1) return toast('Vul een capaciteit van minimaal 1 in.');
  state.rooms.push({ id:name, name:'', capacity:cap, active:true, docentBoekbaar:false, leerlingenToegestaan:true });
  commit(); toast(`${name} toegevoegd`);
}
async function moveRoom(id, dir){
  if(!can('manage')) return;
  const i=state.rooms.findIndex(r=>r.id===id), j=i+dir;
  if(i<0 || j<0 || j>=state.rooms.length) return;
  // Wat al is ingetypt bij de ruimtes blijft behouden (als het geldig is)
  for(const r of state.rooms){
    const n=byId('rName-'+r.id), c=byId('rCap-'+r.id), a=byId('rAct-'+r.id), dd=byId('rDoc-'+r.id), ll=byId('rLln-'+r.id);
    if(n) r.name=n.value.trim();
    if(dd) r.docentBoekbaar=dd.checked; if(ll) r.leerlingenToegestaan=ll.checked;
    if(c && Number.isInteger(Number(c.value)) && Number(c.value)>=1) r.capacity=Number(c.value);
    if(a) r.active=a.checked;
  }
  [state.rooms[i], state.rooms[j]] = [state.rooms[j], state.rooms[i]];
  commit();
  const btn=root.querySelector(`[data-act="moveRoom"][data-id="${CSS.escape(id)}"][data-dir="${dir}"]`);
  if(btn && !btn.disabled) btn.focus(); else root.querySelector(`[data-act="moveRoom"][data-id="${CSS.escape(id)}"]:not([disabled])`)?.focus();
  toast(`${id} staat nu op plek ${j+1}`);
}
async function saveSettings(){
  if(!can('manage')) return;
  const from=$('#sFrom').value, to=$('#sTo').value, exp=Number($('#sExpiry').value);
  if(!from || !to || mins(to)<=mins(from)) return toast('De sluitingstijd moet na de openingstijd liggen.');
  if(!Number.isInteger(exp) || exp<1 || exp>20) return toast('Kies een vervaltermijn tussen 1 en 20 werkdagen.');
  const outside=state.bookings.filter(b=>isActive(b) && b.date>=today() && (mins(b.start)<mins(from) || mins(b.end)>mins(to)));
  if(outside.length){ const r=await ask({title:'Boekingen buiten de nieuwe tijden', text:`${plural(outside.length,'komende boeking valt','komende boekingen vallen')} (deels) buiten ${from}–${to}. Ze blijven staan, maar worden in de dagplanning afgekapt.`, ok:'Toch opslaan'}); if(!r.ok) return; }
  Object.assign(state.settings,{openFrom:from, openTo:to, expiryWorkdays:exp}); commit(); toast('Instellingen opgeslagen');
}
function copyExport(){
  const from=$('#eFrom').value, to=$('#eTo').value, out=$('#eResult');
  if(!from || !to || to<from) return toast('Kies een geldige periode.');
  const rows=state.bookings.filter(b=>b.status==='confirmed' && b.date>=from && b.date<=to).sort((a,b)=>(a.date+a.start+a.room).localeCompare(b.date+b.start+b.room));
  const head=['Datum','Begin','Eind','Lab','Ruimte','Les / activiteit','Docent','School / organisatie','Niveau / klas','Leerlingen','Categorie','Type'];
  const clean=v=>String(v??'').replace(/[\t\r\n]+/g,' ');
  const text=[head, ...rows.map(b=>[b.date.split('-').reverse().join('-'),b.start,b.end,b.room,roomOf(b.room).name,b.title,b.teacherName,b.school,b.level,b.students,b.categorie==='bijeenkomst'?'Bijeenkomst':'Les',typeLabel(b)])].map(r=>r.map(clean).join('\t')).join('\n');
  const schools=new Set(rows.map(b=>b.school).filter(Boolean)).size, pupils=rows.reduce((s,b)=>s+(Number(b.students)||0),0);
  out.innerHTML=`<div class="pl-summary"><b>${plural(rows.length,'les','lessen')}</b> · ${plural(schools,'school','scholen')} · ${pupils} leerlingen in deze periode</div>`;
  const fallback=()=>{ out.insertAdjacentHTML('beforeend',`<p class="pl-hint">Kopiëren lukte niet automatisch. Selecteer de tekst hieronder en kopieer met Ctrl+C.</p><textarea class="pl-input pl-export" id="eText" readonly>${esc(text)}</textarea>`); const t=$('#eText'); t.focus(); t.select(); };
  try{ navigator.clipboard.writeText(text).then(()=>toast(`${plural(rows.length,'regel','regels')} gekopieerd, plak in Excel`)).catch(fallback); }catch(e){ fallback(); }
}

/* ---------- Algemeen ---------- */
function commit(){ Store.save(state); render(); }
let toastTimer=null;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>{t.hidden=true;},3600); }
function postHeight(){
  if(!CONFIG.reportHeightToParent) return;
  try{ if(window.parent!==window) window.parent.postMessage({type:'ilab-hub:height', height:document.documentElement.scrollHeight},'*'); }catch(e){}
}
function shiftDate(dir){
  if(ui.view==='week') ui.date=addDays(ui.date,7*dir);
  else ui.date=stepWorkday(ui.date,dir);
  render();
}

function bind(){
  root.addEventListener('click', e=>{
    const closer=e.target.closest('[data-close]'); if(closer){ closeDialog(closer.dataset.close); return; }
    const t=e.target.closest('[data-act]'); if(!t) return;
    const a=t.dataset.act, id=t.dataset.id;
    switch(a){
      case 'slot': {
        const r=t.getBoundingClientRect(), s=S(), span=E()-s;
        let start=s+Math.floor(((e.clientX-r.left)/r.width)*span/15)*15; start=Math.max(s,Math.min(start,E()-15));
        if(!canBookRoom(t.dataset.room)) { toast('Deze ruimte is niet boekbaar voor docenten. Neem contact op met i-lab.'); break; }
        openForm({room:t.dataset.room, date:ui.date, start:hm(start), end:hm(Math.min(start+60,E()))}); break; }
      case 'cell': case 'newAt': if(!canBookRoom(t.dataset.room)) { toast('Deze ruimte is niet boekbaar voor docenten. Neem contact op met i-lab.'); break; } openForm({room:t.dataset.room, date:t.dataset.date}); break;
      case 'detail': openDetail(id); break;
      case 'closure': openClosure(id); break;
      case 'view': ui.view=t.dataset.view; render(); break;
      case 'goDate': ui.date=t.dataset.date; ui.view='dag'; closeDialog('detailDlg'); render(); break;
      case 'goToday': ui.date=toWorkday(today()); ui.view='dag'; render(); break;
      case 'approve': approve(id, !!t.dataset.all); break;
      case 'reject': reject(id, !!t.dataset.all); break;
      case 'withdraw': withdraw(id); break;
      case 'cancel': cancelBooking(id); break;
      case 'delete': deleteBooking(id); break;
      case 'edit': { const b=find(id); if(b && can('edit',b)) openForm({edit:b}); break; }
      case 'addClosure': addClosure(); break;
      case 'delClosure': removeClosure(id); break;
      case 'saveRooms': saveRooms(); break;
      case 'addRoom': addRoom(); break;
      case 'moveRoom': moveRoom(id, Number(t.dataset.dir)); break;
      case 'saveSettings': saveSettings(); break;
      case 'copyExport': copyExport(); break;
    }
  });
  root.addEventListener('change', e=>{
    if(e.target.id==='cAllDay'){ $('#cStart').disabled=e.target.checked; $('#cEnd').disabled=e.target.checked; }
    if(e.target.id==='cAll'){ $('#cRooms').hidden=e.target.checked; postHeight(); }
  });
  // Klik op de achtergrond sluit het detail- en formuliervenster
  for(const id of ['detailDlg','formDlg']) byId(id).addEventListener('mousedown', e=>{ if(e.target.id===id) closeDialog(id); });
  $('#bookForm').addEventListener('submit', submitForm);
  $('#bookForm').addEventListener('input', updateFormCheck);
  $('#fCat').addEventListener('change', ()=>{ fillTypes(); });
  $('#fType').addEventListener('change', ()=>{ $('#fTypeAndersWrap').hidden = $('#fType').value!=='anders'; });
  $('#bookForm').addEventListener('change', updateFormCheck);
  $('#newBtn').addEventListener('click', ()=>{ if(!bookableRooms().length){ toast('Er zijn nog geen ruimtes beschikbaar om aan te vragen.'); return; } openForm({}); });
  $('#prevBtn').addEventListener('click', ()=>shiftDate(-1));
  $('#nextBtn').addEventListener('click', ()=>shiftDate(1));
  $('#todayBtn').addEventListener('click', ()=>{ ui.date=toWorkday(today()); render(); });
  $('#dateInput').addEventListener('change', e=>{ if(e.target.value){ ui.date=e.target.value; render(); } });
  $('#roomFilter').addEventListener('change', e=>{ ui.room=e.target.value; saveUi(); render(); });
  const mq=window.matchMedia('(max-width: 760px)'); mq.addEventListener('change', render); cleanups.push(()=>mq.removeEventListener('change', render));
  // Elke minuut de nu-lijn en kengetallen bijwerken (niet als er een venster open is)
  const tick=setInterval(()=>{ if(!root.querySelector('dialog[open]')) render(); }, 60000); cleanups.push(()=>clearInterval(tick));
  const poll=setInterval(()=>Store.refresh(false), 60000); cleanups.push(()=>clearInterval(poll));
  const vis=()=>{ if(!document.hidden) Store.refresh(false); }; document.addEventListener('visibilitychange', vis); cleanups.push(()=>document.removeEventListener('visibilitychange', vis));
}

function init(){
  state = Store.load();
  ui = { view:'dag', date:toWorkday(today()), room:'all' };
  try{ const p=JSON.parse(localStorage.getItem(CONFIG.storageKey+':ui')||'{}'); if(p.room) ui.room=p.room; }catch(e){}
  bind(); render();
}
init();
return ()=>cleanups.forEach(f=>{try{f();}catch(e){}});
}
