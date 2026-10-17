/* Campeonatos, rivales, fechas de playoffs e historial de partidos. */
(()=>{
"use strict";
const $=id=>document.getElementById(id),hub=()=>window.FutbolitoHub;
let mounted=false,initialized=false,club=null,admin=false,manager=false;
let opponents=[],competitions=[],fixtures=[],history=[],busy=false;
const ctxtKey=()=>("futbolito-current-competition:"+hub().slug);
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
async function queryAll(){
 if(!club)return;
 const db=await api();
 const [o,c,f,h]=await Promise.all([
  db.from("club_opponents").select("id,name").eq("club_id",club.id).order("name"),
  db.from("club_competitions").select("id,name,format,status").eq("club_id",club.id).order("created_at",{ascending:false}),
  db.from("competition_fixtures").select("id,competition_id,opponent_id,round_name,scheduled_at,status").order("created_at",{ascending:false}).limit(200),
  db.from("match_history").select("id,competition_id,fixture_id,home_name,away_name,home_score,away_score,total_fouls,period_fouls,yellow_cards,red_cards,goals,half_minutes,fouls_by_period,ended_at").eq("club_id",club.id).order("ended_at",{ascending:false}).limit(80)
 ]);
 for(const r of [o,c,f,h])if(r.error)throw r.error;
 opponents=o.data||[];competitions=c.data||[];
 const ids=new Set(competitions.map(x=>x.id));
 fixtures=(f.data||[]).filter(x=>ids.has(x.competition_id));
 history=h.data||[];
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
function showFixtures(){
 const root=$("hubFixtureList");root.replaceChildren();
 const selected=$("hubCompSelect").value;
 const list=fixtures.filter(f=>f.competition_id===selected);
 if(!selected){
  const p=document.createElement("p");p.className="fhub-small";p.textContent="Selecciona un campeonato para ver sus partidos.";root.append(p);return;
 }
 if(!list.length){
  const p=document.createElement("p");p.className="fhub-small";p.textContent="No hay partidos programados todavía.";root.append(p);return;
 }
 for(const f of list){
  const rival=opponents.find(o=>o.id===f.opponent_id)?.name||"Rival";
  const row=document.createElement("div");row.className="fhub-item";
  const title=document.createElement("strong");title.textContent=f.round_name+" · "+rival;
  const note=document.createElement("small");note.textContent=localDate(f.scheduled_at)+" · "+(f.status==="played"?"Jugado":f.status==="cancelled"?"Cancelado":"Pendiente");
  const b=button("Preparar este partido",async()=>{
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
function renderHistory(){
 const root=$("hubHistoryList");root.replaceChildren();
 if(!history.length){const p=document.createElement("p");p.className="fhub-small";p.textContent="Aún no hay partidos archivados en Supabase.";root.append(p);return;}
 for(const match of history){
  const row=document.createElement("details");row.className="fhub-item";
  const heading=document.createElement("summary");heading.style.cursor="pointer";heading.style.fontWeight="900";
  heading.textContent=match.home_name+" "+match.home_score+" - "+match.away_score+" "+match.away_name;
  const sub=document.createElement("small");sub.textContent=localDate(match.ended_at)+" · "+(competitions.find(x=>x.id===match.competition_id)?.name||"Amistoso");
  row.append(heading,sub);
  const f=match.total_fouls||[0,0], pf=match.period_fouls||[0,0];
  const fbp=match.fouls_by_period||[[0,0],[0,0]];
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
     (x.scorer?" · "+x.scorer:"")).join("; ");
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
function render(){
 const rivalSelect=$("hubOpponentSelect"),fixtureOpponent=$("hubFixtureOpponent");
 rivalSelect.replaceChildren(opt("","Seleccionar rival"));
 fixtureOpponent.replaceChildren(opt("","Seleccionar rival"));
 for(const o of opponents){
  rivalSelect.append(opt(o.id,o.name));
  fixtureOpponent.append(opt(o.id,o.name));
 }
 const compSelect=$("hubCompSelect");
 const current=ctx.competitionId||compSelect.value;
 compSelect.replaceChildren(opt("","Sin campeonato · amistoso"));
 for(const c of competitions)compSelect.append(opt(c.id,c.name+" · "+formatMode(c.format)+(c.status==="archived"?" (archivado)":"")));
 compSelect.value=competitions.some(c=>c.id===current)?current:"";
 $("hubFixtureSave").disabled=!manager;
 $("hubCompSave").disabled=!manager;
 $("hubOpponentSave").disabled=!manager;
 showFixtures();renderHistory();
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
  const res=await fetch("/Marcador-futbolito/menu-torneos.html?v=20261017-1",{cache:"no-cache"});
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
  await queryAll();message("Rival "+name+" guardado.");
 }));
 $("hubOpponentUse").addEventListener("click",()=>{
  try{chooseOpponent($("hubOpponentSelect").value)}catch(e){message(e.message,true)}
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
 $("hubCompSelect").addEventListener("change",()=>{
  ctx.competitionId=$("hubCompSelect").value||null;ctx.fixtureId=null;keepContext();showFixtures();
  const selected=competitions.find(c=>c.id===ctx.competitionId);
  message(selected?"Campeonato seleccionado: "+selected.name:"Modo amistoso seleccionado.");
 });
 $("hubFixtureSave").addEventListener("click",()=>perform(async()=>{
  if(!manager)throw Error("Solo un encargado o administrador puede programar fechas.");
  const competitionId=$("hubCompSelect").value,opponentId=$("hubFixtureOpponent").value;
  const round=$("hubRound").value.trim(),when=$("hubFixtureDate").value;
  if(!competitionId||!opponentId)throw Error("Selecciona campeonato y rival.");
  if(!round||round.length>90)throw Error("Ingresa una ronda o fecha válida.");
  const db=await api();
  const r=await db.from("competition_fixtures").insert({
   competition_id:competitionId,opponent_id:opponentId,round_name:round,
   scheduled_at:when?new Date(when).toISOString():null
  });
  if(r.error)throw r.error;
  await queryAll();message("Partido programado: "+round+". Selecciónalo para precargar el rival.");
 }));
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
 state.archivePending=false;if(typeof save==="function")save();
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
