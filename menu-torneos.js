/* Campeonatos, rivales, fechas de playoffs e historial de partidos. */
(()=>{
"use strict";
const $=id=>document.getElementById(id),hub=()=>window.FutbolitoHub;
let mounted=false,initialized=false,club=null,admin=false,manager=false;
let opponents=[],competitions=[],fixtures=[],history=[],busy=false;
// El contexto de torneo es propio de cada plantel, incluso si dos planteles comparten club.
const currentSquad=()=>($("homeTeam")?.value||(typeof state!=="undefined"?state.homeTeam:"")||"");
const ctxtKey=()=>("futbolito-current-competition:"+hub().slug+":"+currentSquad());
const storedContext=()=>{try{return JSON.parse(localStorage.getItem(ctxtKey())||"null")||{}}catch{return {}}};
let ctx={};
function keepContext(){localStorage.setItem(ctxtKey(),JSON.stringify(ctx))}
function message(text,error=false){
 const x=$("hubTournamentStatus");
 if(!x)return;x.textContent=text;x.style.borderLeftColor=error?"#fd8585":"#b58cea";
}
function opt(value,label){
 const o=document.createElement("option");o.value=value;o.textContent=label;return o;
}
function button(text,action){
 const b=document.createElement("button");b.className="btn";b.textContent=text;b.type="button";
 b.addEventListener("click",()=>action().catch(e=>message(e.message||"No se pudo realizar la operación.",true)));
 return b;
}
async function api(){if(!hub())throw Error("No se cargó la sesión.");return hub().db()}
async function clubInfo(){
 if(!club)club=await hub().getClub();
 const db=await api();
 const [a,m]=await Promise.all([
  db.rpc("is_platform_admin"),db.rpc("is_club_manager",{p_club:club.id})
 ]);
 admin=a.data===true;manager=m.data===true||admin;
 return db;
}
async function fetchAllHistory(db){
 const cols="id,competition_id,fixture_id,home_name,away_name,home_score,away_score,total_fouls,period_fouls,yellow_cards,red_cards,goals,half_minutes,fouls_by_period,ended_at,played_on,result_only,created_at";
 const out=[],size=500;
 // Paginación real: no se descartan los partidos 81 en adelante.
 for(let start=0;start<50000;start+=size){
  const part=await db.from("match_history").select(cols).eq("club_id",club.id).order("created_at",{ascending:false}).range(start,start+size-1);
  if(part.error)throw part.error;
  const rows=part.data||[];out.push(...rows);
  if(rows.length<size)return out;
 }
 throw Error("El historial supera 50.000 partidos. Contacta al administrador para cargar el resto.");
}
async function queryAll(){
 if(!club)return;
 const db=await api();
 const [o,c,f,h]=await Promise.all([
  db.from("club_opponents").select("id,name").eq("club_id",club.id).order("name"),
  db.from("club_competitions").select("id,name,format,status").eq("club_id",club.id).order("created_at",{ascending:false}),
  db.from("competition_fixtures").select("id,competition_id,opponent_id,round_name,scheduled_at,scheduled_on,status,venue").order("created_at",{ascending:false}).limit(200),
  fetchAllHistory(db)
 ]);
 for(const r of [o,c,f])if(r.error)throw r.error;
 opponents=o.data||[];competitions=c.data||[];
 const ids=new Set(competitions.map(x=>x.id));
 fixtures=(f.data||[]).filter(x=>ids.has(x.competition_id));
 history=h.sort((a,b)=>{
  const da=a.played_on||(a.ended_at||a.created_at||"").slice(0,10);
  const db=b.played_on||(b.ended_at||b.created_at||"").slice(0,10);
  return db.localeCompare(da)||String(b.created_at||"").localeCompare(String(a.created_at||""));
 });
 render();
}
function chooseOpponent(id){
 const o=opponents.find(x=>x.id===id);
 if(!o)throw Error("Selecciona primero un rival.");
 if(typeof state==="undefined")throw Error("El marcador no está listo.");
 if((state.goals?.length||state.elapsed||0)>0 &&
 !confirm("Ya hay actividad registrada en el marcador. ¿Cambiar el rival sin reiniciar el partido?"))return;
 const input=$("awayName");if(input)input.value=o.name;
 state.awayName=o.name;
 if(typeof render==="function")render();
 if(typeof save==="function")save();
 message("Rival cargado: "+o.name+". Puedes comenzar el encuentro.");
}
function formatMode(f){
 return f==="eliminacion"?"Playoffs":f==="grupos"?"Grupos":f==="liga"?"Liga":"Amistosos";
}
function localDate(d){
 if(!d)return "Sin fecha definida";
 return new Date(d).toLocaleString("es-CL",{dateStyle:"medium",timeStyle:"short"});
}
function roundDateOnly(d){
 if(!d)return "Sin fecha definida";
 return new Intl.DateTimeFormat("es-CL",{dateStyle:"medium",timeZone:"UTC"}).format(new Date(d+"T12:00:00Z"));
}
function showFixtures(){
 const root=$("hubFixtureList");root.replaceChildren();
 const selected=$("hubCompSelect").value;
 const list=fixtures.filter(f=>f.competition_id===selected).sort((a,b)=>
  (Number(a.round_name.match(/\d+/)?.[0]||0)-Number(b.round_name.match(/\d+/)?.[0]||0))||
  a.round_name.localeCompare(b.round_name,"es"));
 if(!selected){
  const p=document.createElement("p");p.className="fhub-small";p.textContent="Selecciona un campeonato para ver sus partidos.";root.append(p);return;
 }
 if(!list.length){
  const p=document.createElement("p");p.className="fhub-small";p.textContent="No hay partidos programados todavía.";root.append(p);return;
 }
 for(const f of list){
  const rival=f.status==="bye"?"Fecha libre":(opponents.find(o=>o.id===f.opponent_id)?.name||"Rival");
  const row=document.createElement("div");row.className="fhub-item";
  const title=document.createElement("strong");title.textContent=f.round_name+" · "+rival;
  const savedMatch=history.find(m=>m.fixture_id===f.id);
  const when=f.scheduled_at?localDate(f.scheduled_at):f.scheduled_on?roundDateOnly(f.scheduled_on):savedMatch?historyDate(savedMatch):"Sin fecha definida";
  const note=document.createElement("small");
  note.textContent=when+(f.venue?" · "+f.venue:"")+" · "+(f.status==="played"?"Jugado":f.status==="cancelled"?"Cancelado":f.status==="bye"?"Sin partido":"Pendiente")+
   (savedMatch?" · "+savedMatch.home_score+"–"+savedMatch.away_score:"");
  const b=button(f.status==="bye"?"Descanso de jornada":"Preparar este partido",async()=>{
   ctx.competitionId=f.competition_id;ctx.fixtureId=f.id;keepContext();
   chooseOpponent(f.opponent_id);
   message("Partido seleccionado: "+rival+" · "+f.round_name+". La próxima finalización se asociará a esta fecha.");
  });
  b.disabled=f.status!=="scheduled";
  row.append(title,note,b);root.append(row);
 }
}
function detailsLine(name,value){
 const p=document.createElement("div");p.className="fhub-small";p.textContent=name+": "+value;return p;
}
function matchCategory(match){
 const comp=competitions.find(x=>x.id===match.competition_id);
 if(!comp)return "unclassified";
 if(comp.format==="amistoso")return "friendly";
 if(comp.format==="liga")return "league";
 return "tournament";
}
function visibleHistory(){
 const squad=$("hubHistorySquad")?.value||"all",type=$("hubHistoryType")?.value||"all",comp=$("hubHistoryCompetition")?.value||"all";
 return history.filter(m=>(squad==="all"||m.home_name===squad)&&
  (type==="all"||matchCategory(m)===type)&&
  (comp==="all"||m.competition_id===comp));
}
function historyCategoryLabel(match){
 const comp=competitions.find(x=>x.id===match.competition_id);
 return comp?comp.name:"Sin clasificar";
}
function populateHistoryFilters(){
 const squadEl=$("hubHistorySquad"),compEl=$("hubHistoryCompetition");
 const formerSquad=squadEl.value||"all",formerComp=compEl.value||"all";
 squadEl.replaceChildren(opt("all","Todos los planteles"));
 const names=new Set(history.map(m=>m.home_name).filter(Boolean));
 if(typeof state!=="undefined")Object.keys(state.teams||{}).forEach(n=>names.add(n));
 [...names].sort((a,b)=>a.localeCompare(b,"es")).forEach(n=>squadEl.append(opt(n,n)));
 squadEl.value=names.has(formerSquad)?formerSquad:"all";
 compEl.replaceChildren(opt("all","Todos los campeonatos"));
 competitions.forEach(c=>compEl.append(opt(c.id,c.name)));
 compEl.value=competitions.some(c=>c.id===formerComp)?formerComp:"all";
}
function historyDate(match){
 if(match.played_on)return new Intl.DateTimeFormat("es-CL",{dateStyle:"medium",timeZone:"UTC"}).format(new Date(match.played_on+"T12:00:00Z"));
 return localDate(match.ended_at);
}
function renderHistory(){
 const root=$("hubHistoryList");root.replaceChildren();
 const filtered=visibleHistory();
 const stats=$("hubHistoryStats");
 if(!filtered.length){
  stats.textContent=history.length?"No hay partidos que coincidan con estos filtros.":"Aún no hay partidos archivados en este club.";
  const p=document.createElement("p");p.className="fhub-small";
  p.textContent=history.length?"Prueba otra combinación de filtros.":"Los encuentros aparecerán al finalizar y archivar partidos en Futbolito.";
  root.append(p);return;
 }
 const count=filtered.length,wins=filtered.filter(m=>Number(m.home_score)>Number(m.away_score)).length,
  draws=filtered.filter(m=>Number(m.home_score)===Number(m.away_score)).length,losses=count-wins-draws,
  gf=filtered.reduce((n,m)=>n+(Number(m.home_score)||0),0),
  ga=filtered.reduce((n,m)=>n+(Number(m.away_score)||0),0),
  detailed=filtered.filter(m=>!m.result_only),
  fouls=detailed.reduce((n,m)=>n+(Number(m.total_fouls?.[0])||0),0),
  yellows=detailed.reduce((n,m)=>n+(m.yellow_cards||[]).filter(c=>c.team==="home").length,0),
  reds=detailed.reduce((n,m)=>n+(m.red_cards||[]).filter(c=>c.team==="home").length,0);
 stats.textContent=count+" partidos de "+history.length+" archivados · "+wins+" ganados · "+draws+" empatados · "+losses+" perdidos · "+
  "Rendimiento: "+Math.round(wins/count*100)+"% victorias · Goles: "+gf+" a favor / "+ga+" en contra · "+
  "Diferencia: "+(gf-ga>0?"+":"")+(gf-ga)+" · Promedio a favor: "+(gf/count).toFixed(2)+" · "+
  (detailed.length?"Disciplina de "+detailed.length+" partidos detallados: Faltas "+fouls+", amarillas "+yellows+", rojas "+reds+".":
  "Faltas y tarjetas: sin datos registrados.")+
  (detailed.length<count?" · "+(count-detailed.length)+" partidos solo con resultado.":"");
 for(const match of filtered){
  const row=document.createElement("details");row.className="fhub-item";
  const heading=document.createElement("summary");heading.style.cursor="pointer";heading.style.fontWeight="900";
  heading.textContent=match.home_name+" "+match.home_score+" - "+match.away_score+" "+match.away_name;
  const sub=document.createElement("small");sub.textContent=historyDate(match)+" · "+historyCategoryLabel(match)+(match.result_only?" · Solo resultado":"");
  row.append(heading,sub);
  if(match.result_only){
   row.append(detailsLine("Estadísticas","No registradas: se conoce únicamente el resultado. No se informó el horario."));
   root.append(row);continue;
  }
  const f=match.total_fouls||[0,0],fbp=match.fouls_by_period||[[0,0],[0,0]];
  const ys=match.yellow_cards||[],rs=match.red_cards||[],gs=match.goals||[];
  row.append(detailsLine("Faltas totales",f.join(" - ")),
   detailsLine("Primer tiempo",Array.isArray(fbp[0])?fbp[0].join(" - "):"Sin detalle"),
   detailsLine("Segundo tiempo",Array.isArray(fbp[1])?fbp[1].join(" - "):"Sin detalle"),
   detailsLine("Amarillas",ys.length+" registradas"),
   detailsLine("Rojas",rs.length+" registradas"));
  if(gs.length){
   const g=document.createElement("div");g.className="fhub-small";
   g.textContent="Goles: "+gs.map(x=>(x.period===2?"2T ":"1T ")+
     Math.ceil(Number(x.elapsedAt||0)/60)+"′ "+(x.team==="home"?match.home_name:match.away_name)+
     (x.scorer?" · "+x.scorer:"")+(x.assist&&x.team==="home"?" · 🅰 asistencia: "+x.assist:"")).join("; ");
   row.append(g);
  }
  if(ys.length||rs.length){
   const cards=document.createElement("div");cards.className="fhub-small";
   cards.textContent="Tarjetas: "+
    ys.map(x=>"🟨 "+x.player+" "+(x.minute||"")+"′").concat(
      rs.map(x=>"🟥 "+x.player+" "+(x.minute||"")+"′")).join("; ");
   row.append(cards);
  }
  root.append(row);
 }
}
function exportHistoryCSV(){
 const filtered=visibleHistory();
 if(!filtered.length){message("No hay partidos para exportar con estos filtros.",true);return;}
 const lines=[["Fecha","Equipo","Rival","Competencia","Tipo","Goles a favor","Goles en contra","Resultado","Faltas","Amarillas","Rojas","Registro"]];
 for(const m of filtered){
  const outcome=m.home_score>m.away_score?"Ganado":m.home_score<m.away_score?"Perdido":"Empatado";
  lines.push([historyDate(m),m.home_name,m.away_name,historyCategoryLabel(m),matchCategory(m),
   m.home_score,m.away_score,outcome,m.result_only?"":(m.total_fouls?.[0]??""),
   m.result_only?"":(m.yellow_cards||[]).filter(c=>c.team==="home").length,
   m.result_only?"":(m.red_cards||[]).filter(c=>c.team==="home").length,
   m.result_only?"Solo resultado":"Completo"]);
 }
 const safe=v=>'"'+String(v??"").replaceAll('"','""')+'"';
 const content="\uFEFF"+lines.map(row=>row.map(safe).join(";")).join("\r\n");
 const url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8"}));
 const link=document.createElement("a");link.href=url;link.download="futbolito-historial-"+(hub()?.slug||"club")+".csv";
 document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 message("Historial exportado: "+filtered.length+" partidos.");
}

function squadCompetitions(){
 const team=currentSquad().toLowerCase(),is30=team.includes("+30")||team.includes("más 30"),isTC=/\btc\b/.test(team);
 return competitions.filter(c=>{
  if(hub().slug==="larraguibel")return true;
  const n=c.name.toLowerCase();
  if(/\+\s*30|más\s*30|mas\s*30/.test(n))return is30;
  if(/serie\s*e\b|mala clase tc/.test(n))return isTC;
  return true; // Los torneos sin categoría explícita siguen disponibles.
 });
}
function preferredCompetition(list){
 const team=currentSquad().toLowerCase();
 const filtered=list.filter(c=>{
  const n=c.name.toLowerCase();
  return (team.includes("+30")||team.includes("más 30"))?/\+\s*30|más\s*30|mas\s*30/.test(n):
   /\btc\b/.test(team)?/serie\s*e\b|mala clase tc/.test(n):
   hub().slug==="larraguibel"?/serie\s*d\b/.test(n):false;
 });
 return (filtered[0]||list[0])?.id||"";
}
function fixtureList(id){
 return fixtures.filter(f=>f.competition_id===id).sort((a,b)=>
  Number(a.round_name.match(/\d+/)?.[0]||0)-Number(b.round_name.match(/\d+/)?.[0]||0)||
  a.round_name.localeCompare(b.round_name,"es"));
}
function fixtureRival(f){return opponents.find(o=>o.id===f?.opponent_id)?.name||"Rival";}
function matchDateLocal(dt){
 if(!dt)return "";
 const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Santiago",
  year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(dt));
 const v=Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
 return v.year+"-"+v.month+"-"+v.day+"T"+v.hour+":"+v.minute;
}
function setFixtureFields(f,keepManualRound=false){
 const r=$("hubRound"),date=$("hubFixtureDate"),info=$("hubFixtureInfo"),prep=$("hubPrepRound");
 if(f){
  r.value=f.round_name;
  $("hubOpponentSelect").value=f.opponent_id||"";
  $("hubFixtureOpponent").value=f.opponent_id||"";
  prep.value=f.id;
  date.value=matchDateLocal(f.scheduled_at);
  date.disabled=true; // No modificar las fechas y horas acordadas.
  $("hubFixtureSave").disabled=true;
  const when=f.scheduled_at?localDate(f.scheduled_at):f.scheduled_on?roundDateOnly(f.scheduled_on):"Sin día confirmado";
  info.textContent=f.round_name+": "+(f.status==="bye"?"Fecha libre":fixtureRival(f))+" · "+when+
   (f.venue?" · "+f.venue:"")+". Jornada registrada; no se duplicará ni alterará.";
  $("hubPrepHint").textContent=f.status==="bye"?"Esta jornada es libre; no hay rival para preparar.":
   f.round_name+" · "+fixtureRival(f)+(f.status==="played"?" · Partido jugado":"");
  $("hubOpponentUse").disabled=f.status!=="scheduled";
 }else{
  if(!keepManualRound)r.value="";
  prep.value="";
  date.disabled=false;
  date.value="";
  $("hubFixtureSave").disabled=!manager||!$("hubCompSelect").value;
  info.textContent="Las fechas y horas existentes son fijas. Para otra jornada nueva, introduce sus datos.";
  $("hubPrepHint").textContent=$("hubCompSelect").value?
   "Selecciona una fecha o rival de este torneo.":"Amistoso: puedes elegir cualquier rival guardado.";
  $("hubOpponentUse").disabled=!$("hubOpponentSelect").value;
 }
}
function buildFixtureSelectors({reset=false}={}){
 const id=$("hubCompSelect").value,list=fixtureList(id);
 const oldPrep=reset?"":$("hubPrepRound").value,oldRound=reset?"":$("hubRound").value;
 const oldRival=reset?"":$("hubOpponentSelect").value;
 const prep=$("hubPrepRound"),opp=$("hubOpponentSelect"),program=$("hubFixtureOpponent");
 $("hubPrepCompetition").value=id;
 prep.replaceChildren(opt("","Seleccionar fecha"));
 list.forEach(f=>prep.append(opt(f.id,f.round_name+" · "+(f.status==="bye"?"Libre":fixtureRival(f)))));
 opp.replaceChildren(opt("",id?"Seleccionar rival del torneo":"Seleccionar rival"));
 program.replaceChildren(opt("","Seleccionar rival"));
 const visible=id?opponents.filter(o=>list.some(f=>f.opponent_id===o.id)):opponents;
 for(const o of visible){
  const rounds=list.filter(f=>f.opponent_id===o.id).map(f=>f.round_name).join(", ");
  opp.append(opt(o.id,(rounds?rounds+" · ":"")+o.name));
  program.append(opt(o.id,o.name));
 }
 // Un torneo recién creado puede programar su primera fecha con los rivales del club.
 if(id&&!visible.length)for(const o of opponents)program.append(opt(o.id,o.name));
 const match=list.find(f=>f.id===oldPrep)||list.find(f=>f.round_name.toLowerCase()===oldRound.trim().toLowerCase())||
  list.find(f=>f.id===ctx.fixtureId)||list.find(f=>f.status==="scheduled")||null;
 if(match)setFixtureFields(match);
 else {
  opp.value=visible.some(o=>o.id===oldRival)?oldRival:"";
  setFixtureFields(null,Boolean(oldRound));
 }
}
function programByRound(){
 const name=$("hubRound").value.trim().toLocaleLowerCase("es");
 const f=fixtureList($("hubCompSelect").value).find(x=>x.round_name.trim().toLocaleLowerCase("es")===name);
 setFixtureFields(f||null,!f);
}
function programByRival(fromPrep=false){
 const id=$(fromPrep?"hubOpponentSelect":"hubFixtureOpponent").value,list=fixtureList($("hubCompSelect").value);
 const candidates=list.filter(f=>f.opponent_id===id);
 const current=list.find(f=>f.id===$("hubPrepRound").value);
 const f=candidates.find(x=>x.id===current?.id)||candidates.find(x=>x.status==="scheduled")||candidates[0];
 if(f)setFixtureFields(f);
 else {
  if(fromPrep)$("hubFixtureOpponent").value=id;
  setFixtureFields(null,true);
  $("hubOpponentSelect").value=id;
  $("hubFixtureOpponent").value=id;
  $("hubOpponentUse").disabled=!id;
 }
}
function activeCompetitionChanged(value){
 ctx.competitionId=value||null;ctx.fixtureId=null;keepContext();
 $("hubCompSelect").value=value;
 $("hubPrepCompetition").value=value;
 buildFixtureSelectors({reset:true});showFixtures();
 const selected=competitions.find(c=>c.id===value);
 message(selected?"Campeonato seleccionado: "+selected.name:"Modo amistoso seleccionado.");
}

function render(){
 const compSelect=$("hubCompSelect"),options=squadCompetitions(),current=ctx.competitionId||compSelect.value;
 compSelect.replaceChildren(opt("","Sin campeonato · amistoso"));
 for(const c of options)compSelect.append(opt(c.id,c.name+" · "+formatMode(c.format)+(c.status==="archived"?" (archivado)":"")));
 const selected=options.some(c=>c.id===current)?current:preferredCompetition(options);
 compSelect.value=selected;
 ctx.competitionId=selected||null;
 keepContext();
 const prepComp=$("hubPrepCompetition");
 prepComp.replaceChildren(...[...compSelect.options].map(o=>opt(o.value,o.textContent)));
 $("hubCompSave").disabled=!manager;
 $("hubOpponentSave").disabled=!manager;
 buildFixtureSelectors();
 showFixtures();populateHistoryFilters();renderHistory();
}
async function refresh(){
 message("Actualizando rivales, campeonatos y partidos…");
 await clubInfo();
 await queryAll();
 message("Información cargada para "+club.name+".");
}
async function mount(target){
 if(!mounted){
  mounted=true;
  const res=await fetch("/Marcador-futbolito/menu-torneos.html?v=20261018-torneo-selectores-v2",{cache:"no-cache"});
  if(!res.ok)throw Error("No se pudo cargar el menú de campeonato.");
  target.innerHTML=await res.text();
  bind();
 }
 if(!initialized){
  initialized=true;
  ctx=storedContext();
  await refresh();
 }else{await queryAll();}
}
function bind(){
 $("hubOpponentSave").addEventListener("click",()=>perform(async()=>{
  if(!manager)throw Error("Solo un encargado o administrador puede guardar rivales.");
  const name=$("hubOpponentNew").value.trim();
  if(name.length<2||name.length>90)throw Error("El rival debe tener de 2 a 90 caracteres.");
  const db=await api();
  const r=await db.from("club_opponents").insert({club_id:club.id,name}).select("id,name").single();
  if(r.error)throw r.error;
  $("hubOpponentNew").value="";
  await queryAll();message("Rival "+name+" guardado. Al programarlo en una jornada aparecerá entre los rivales del torneo.");
 }));
 $("hubOpponentUse").addEventListener("click",()=>{
  try{
   const selected=$("hubCompSelect").value,opponent=$("hubOpponentSelect").value;
   const list=fixtureList(selected),f=list.find(x=>x.id===$("hubPrepRound").value&&x.opponent_id===opponent);
   if(selected&&!f)throw Error("Selecciona una fecha del torneo antes de preparar el partido.");
   if(f&&f.status!=="scheduled")throw Error("Solo se pueden preparar partidos pendientes.");
   ctx.competitionId=selected||null;ctx.fixtureId=f?.id||null;keepContext();
   chooseOpponent(opponent);
  }catch(e){message(e.message,true)}
 });
 $("hubCompSave").addEventListener("click",()=>perform(async()=>{
  if(!manager)throw Error("Solo un encargado o administrador puede crear campeonatos.");
  const name=$("hubCompNew").value.trim(),format=$("hubCompFormat").value;
  if(name.length<2||name.length>110)throw Error("El campeonato debe tener de 2 a 110 caracteres.");
  const db=await api(),usr=await db.auth.getUser();
  if(usr.error||!usr.data?.user)throw Error("No hay sesión válida.");
  const r=await db.from("club_competitions").insert({
   club_id:club.id,name,format,created_by:usr.data.user.id
  }).select("id,name").single();
  if(r.error)throw r.error;
  ctx.competitionId=r.data.id;ctx.fixtureId=null;keepContext();
  $("hubCompNew").value="";
  await queryAll();message("Campeonato "+name+" creado. Ahora puedes agregar rivales y rondas.");
 }));
 $("hubCompSelect").addEventListener("change",()=>activeCompetitionChanged($("hubCompSelect").value));
 $("hubPrepCompetition").addEventListener("change",()=>activeCompetitionChanged($("hubPrepCompetition").value));
 $("hubPrepRound").addEventListener("change",()=>{
  const f=fixtureList($("hubCompSelect").value).find(x=>x.id===$("hubPrepRound").value);
  setFixtureFields(f||null);
 });
 $("hubOpponentSelect").addEventListener("change",()=>programByRival(true));
 $("hubRound").addEventListener("input",programByRound);
 $("hubFixtureOpponent").addEventListener("change",()=>programByRival(false));
 $("hubFixtureSave").addEventListener("click",()=>perform(async()=>{
  if(!manager)throw Error("Solo un encargado o administrador puede programar fechas.");
  const competitionId=$("hubCompSelect").value,opponentId=$("hubFixtureOpponent").value;
  const round=$("hubRound").value.trim(),when=$("hubFixtureDate").value;
  if(!competitionId||!opponentId)throw Error("Selecciona campeonato y rival.");
  if(!round||round.length>90)throw Error("Ingresa una ronda o fecha válida.");
  if(fixtureList(competitionId).some(f=>f.round_name.trim().toLocaleLowerCase("es")===round.toLocaleLowerCase("es")))
   throw Error("Esta jornada ya está registrada. Su rival, fecha y hora no se modificarán.");
  const db=await api();
  const r=await db.from("competition_fixtures").insert({
   competition_id:competitionId,opponent_id:opponentId,round_name:round,
   scheduled_at:when?new Date(when).toISOString():null
  });
  if(r.error)throw r.error;
  await queryAll();message("Partido programado: "+round+". Selecciónalo para precargar el rival.");
 }));
 ["hubHistorySquad","hubHistoryType","hubHistoryCompetition"].forEach(id=>$(id).addEventListener("change",renderHistory));
 $("hubHistoryExport").addEventListener("click",exportHistoryCSV);
 $("homeTeam")?.addEventListener("change",()=>{ctx=storedContext();if(mounted)render();});
 $("hubRefreshHistory").addEventListener("click",()=>perform(refresh));
 $("hubArchiveNow").addEventListener("click",()=>perform(()=>archive(true)));
}
async function perform(task){
 if(busy)return;busy=true;
 try{await task()}catch(e){message(e.message||"No se pudo completar la acción.",true)}
 finally{busy=false}
}
async function archive(manual=false){
 if(typeof state==="undefined"||!state.scores)throw Error("El marcador no terminó de cargarse.");
 if(Number(state.period)!==3){
  if(manual)throw Error("Para guardar el resultado definitivo primero presiona «Finalizar partido».");
  return;
 }
 if(!hub())throw Error("Aún no se ha cargado la gestión de campeonatos.");
 const db=await api(),c=await hub().getClub();
 if(!state.archiveId){state.archiveId=crypto.randomUUID();if(typeof save==="function")save();}
 const context=storedContext();
 const data={
  p_club:c.id,
  p_id:state.archiveId,
  p_home_name:(typeof teamName==="function"?teamName():state.homeTeam)||"Local",
  p_away_name:($("awayName")?.value||state.awayName||"Rival").trim()||"Rival",
  p_scores:state.scores,
  p_total_fouls:state.totalFouls||[0,0],
  p_period_fouls:state.periodFouls||[0,0],
  p_yellow_cards:state.cards||[],
  p_red_cards:state.redCards||[],
  p_goals:state.goals||[],
  p_half_minutes:Number(state.halfMinutes)||25,
  p_competition:context.competitionId||null,
  p_fixture:context.fixtureId||null,
  p_fouls_by_period:[
   Array.isArray(state.firstHalfFouls)?state.firstHalfFouls:
      (hub().prefs().resetFouls!==false?[
        Math.max(0,(state.totalFouls?.[0]||0)-(state.periodFouls?.[0]||0)),
        Math.max(0,(state.totalFouls?.[1]||0)-(state.periodFouls?.[1]||0))
      ]:[0,0]),
   hub().prefs().resetFouls!==false?[...state.periodFouls]:[
    Math.max(0,(state.totalFouls?.[0]||0)-(state.firstHalfFouls?.[0]||0)),
    Math.max(0,(state.totalFouls?.[1]||0)-(state.firstHalfFouls?.[1]||0))
   ]
  ]
 };
 const r=await db.rpc("archive_match_with_period_fouls",data);
 if(r.error)throw r.error;
 state.archivePending=false;
 // Al completar una fecha, evitar reutilizarla accidentalmente en otro partido.
 if(context.fixtureId){ctx.fixtureId=null;keepContext();}
 if(typeof save==="function")save();
 if(mounted)await queryAll();
 message(r.data?.already_saved?
  "Este partido ya estaba guardado en Supabase. No se ha duplicado.":"Partido finalizado y guardado en el historial del club.");
 return r.data;
}
function wrapFinishAndReset(){
 const period=$("periodBtn"),reset=$("resetBtn");
 if(period){
  period.addEventListener("click",()=>{
   if(typeof state==="undefined"||state.period!==3)return;
   // Guardar resultado definitivo incluso cuando no esté abierto el menú de ajustes.
   archive(false).catch(e=>{
    console.error("Historial de Futbolito: ",e);
    state.archivePending=true;if(typeof save==="function")save();
    if(mounted)message("El historial aún no se guardó: "+e.message,true);
   });
  });
 }
 if(reset&&typeof reset.onclick==="function"){
  const old=reset.onclick;
  reset.onclick=function(...args){
   const scores=state?.scores;
   const out=old.apply(this,args);
   if(scores!==state.scores){state.archiveId=null;state.firstHalfFouls=null;state.archivePending=false;if(typeof save==="function")save();}
   return out;
  };
 }
}
wrapFinishAndReset();
let archiveRetrying=false;
async function retryPendingArchive(){
 if(archiveRetrying||typeof state==="undefined"||state.period!==3||!state.archivePending)return;
 archiveRetrying=true;
 try{await archive(false)}catch(e){console.warn("Historial pendiente de sincronizar",e.message)}
 finally{archiveRetrying=false}
}
window.addEventListener("online",retryPendingArchive);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)retryPendingArchive()});
setTimeout(retryPendingArchive,4500);
window.FutbolitoTorneos={mount,archive};
})();
