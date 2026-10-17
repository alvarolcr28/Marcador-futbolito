import{createClient}from"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm";
const api=createClient("https://cpqvrmorbwrrorrsobgj.supabase.co","sb_publishable_KDivcfl1sf6CumXuMhi77w_k-01gmD4",{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const $=id=>document.getElementById(id);
const token=new URLSearchParams(location.hash.slice(1)).get("partido")||"";
let current=null,previousSeq=null,lastSuccess=0,fetchInProgress=false,showing=false;
const fmt=seconds=>{const s=Math.max(0,Math.floor(seconds));return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")};
function numberPair(id,value){
 const arr=Array.isArray(value)?value:[0,0];
 const root=$(id);root.replaceChildren();
 const h=document.createElement("span");h.textContent=String(Number(arr[0])||0);
 const a=document.createElement("span");a.textContent=String(Number(arr[1])||0);
 root.append(h,document.createTextNode(" - "),a);
}
function initials(name){
 const stop=new Set(["y","de","del","la","las","los","el","the","fc","f.c.","+30"]);
 const words=String(name||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .split(/\s+/).map(x=>x.replace(/[^A-Za-z0-9]/g,"").toLowerCase()).filter(x=>x&&!stop.has(x));
 return (words.slice(0,2).map(x=>x[0]).join("")||"⚽").toUpperCase();
}
function updateBadge(id,url,name){
 const root=$(id);root.replaceChildren();
 const fallback=()=>{
  root.replaceChildren();root.classList.add("fallback-badge");
  const label=document.createElement("span");label.className="letters";
  label.textContent=initials(name);
  root.append(label);
 };
 if(typeof url==="string"&&url.startsWith("https://cpqvrmorbwrrorrsobgj.supabase.co/storage/v1/object/public/futbolito-escudos/")){
  root.classList.remove("fallback-badge");
  const img=document.createElement("img");img.alt="Escudo de "+name;img.src=url;img.decoding="async";img.onerror=fallback;
  root.append(img);
 }else fallback();
}
function eventTeam(ev,snapshot){
 return ev.team==="home"?snapshot.home_name:snapshot.away_name;
}
function renderEvents(events,snapshot){
 const parent=$("events");parent.replaceChildren();
 if(!Array.isArray(events)||!events.length){const empty=document.createElement("div");empty.className="no-events";empty.textContent="Aún no hay eventos registrados.";parent.append(empty);return}
 for(const ev of [...events].slice(-30).reverse()){
  const kind=["goal","yellow","red"].includes(ev.type)?ev.type:"goal";
  const item=document.createElement("div");item.className="event "+(kind==="goal"?"":kind);
  const m=document.createElement("div");m.className="minute";
  m.textContent=(ev.period===2?"2T ":"1T ")+String(Number(ev.minute)||0)+"′";
  const ico=document.createElement("div");ico.className="event-icon";ico.textContent=kind==="goal"?"⚽":kind==="yellow"?"🟨":"🟥";
  const text=document.createElement("div");
  const label=document.createElement("div");label.className="event-label";
  const prefix=kind==="goal"?"Gol":kind==="yellow"?"Amarilla":"Roja";
  label.textContent=prefix+(ev.player?" · "+String(ev.player):"");
  const sub=document.createElement("div");sub.className="event-sub";sub.textContent=eventTeam(ev,snapshot)||"Equipo";
  text.append(label,sub);item.append(m,ico,text);parent.append(item);
 }
}
function clockValue(){
 if(!current)return 0;
 const s=current.snapshot||{};
 const recorded=Math.max(0,Number(s.elapsed)||0);
 const cap=(Number(s.half_minutes)||25)*60;
 if(!s.running||current.status==="finished")return Math.min(cap,recorded);
 const time=new Date(s.synced_at).getTime();
 if(!Number.isFinite(time))return Math.min(cap,recorded);
 const secs=Math.max(0,(Date.now()-time)/1000);
 // No extrapolar indefinidamente si la conexión se pierde.
 return Math.min(cap,Math.floor(recorded+Math.min(12,secs)));
}
function renderClock(){
 if(!current)return;
 $("clock").textContent=fmt(clockValue());
 if(Date.now()-lastSuccess>17000&&current.status!=="finished"){
  $("availability").textContent="⚠️ Conexión interrumpida · esperando reconexión";
 }
}
function showAnnouncement(ev,snapshot){
 if(showing||!ev)return;
 const kind=ev.type;
 if(!["goal","yellow","red"].includes(kind))return;
 showing=true;
 const container=$("notification");
 container.className=kind;
 $("announceIcon").textContent=kind==="goal"?"⚽":kind==="yellow"?"🟨":"🟥";
 $("announceTitle").textContent=kind==="goal"?"¡GOOOL!":kind==="yellow"?"TARJETA AMARILLA":"TARJETA ROJA";
 const who=String(ev.player||"Jugador");
 const minute=String(ev.minute||0);
 $("announcePlayer").textContent=(eventTeam(ev,snapshot)||"Equipo")+
   (who?" · "+who:"")+" · "+minute+"′";
 container.hidden=false;
 setTimeout(()=>{container.hidden=true;showing=false},kind==="goal"?3600:3100);
}
function showUnavailable(message,desc){
 $("content").hidden=true;$("message").hidden=false;
 $("message").querySelector("h2").textContent=message;
 $("message").querySelector("p").textContent=desc;
}
function apply(data){
 const first=previousSeq===null;
 const oldSeq=previousSeq;
 current=data;lastSuccess=Date.now();
 const s=data.snapshot||{}, live=data.status==="live";
 $("message").hidden=true;$("content").hidden=false;
 $("tournamentTitle").textContent=data.title||"Partido de Futbolito";
 $("homeTeam").textContent=s.home_name||"Local";
 $("awayTeam").textContent=s.away_name||"Rival";
 $("scoreHome").textContent=String(s.scores?.[0]??0);
 $("scoreAway").textContent=String(s.scores?.[1]??0);
 numberPair("fouls",s.period_fouls);
 numberPair("yellows",s.yellow_cards);
 numberPair("reds",s.red_cards);
 updateBadge("homeBadge",data.home_logo_url,s.home_name||"Local");
 updateBadge("awayBadge",data.away_logo_url,s.away_name||"Rival");
 $("statusBox").classList.toggle("finished",!live);
 const period=Number(s.period)||1;
 if(live){
  $("period").textContent=period===1?"Primer tiempo":"Segundo tiempo";
  $("clockState").textContent=s.running?"● Transmisión en vivo":"Cronómetro en pausa";
  $("availability").innerHTML='<span class="live"></span>Enlace público activo · Marcador en vivo';
  $("footer").innerHTML="◉ Vista de solo lectura<br><span class='note'>Sigue el partido sin registrarte. No se pueden realizar cambios.</span>";
 }else{
  $("period").textContent="🏆 PARTIDO FINALIZADO";
  $("clockState").textContent="Resultado final";
  $("availability").textContent="🏁 Este partido ya terminó";
  $("footer").innerHTML="🏁 Este partido ya terminó<br><span class='note'>Puedes consultar el resultado final y los eventos mientras el enlace siga vigente.</span>";
 }
 renderEvents(data.event_history,s);
 renderClock();
 const seq=Number(data.event_seq)||0;
 previousSeq=seq;
 if(!first&&seq>oldSeq&&live)showAnnouncement(data.last_event,s);
}
async function fetchCurrent(){
 if(fetchInProgress)return;
 if(!/^[a-f0-9]{64}$/.test(token)){
  showUnavailable("Enlace inválido","Abre el enlace o escanea el QR que compartió el encargado.");return;
 }
 fetchInProgress=true;
 try{
  const {data,error}=await api.rpc("get_public_match",{p_token:token});
  if(error)throw error;
  if(!data){
   current=null;previousSeq=null;
   showUnavailable("Enlace no disponible","Aún no se ha publicado, fue desactivado o ya venció. Solicita uno nuevo al encargado.");
   return;
  }
  apply(data);
 }catch(e){
  if(!current)showUnavailable("No se pudo conectar","Comprueba tu conexión y vuelve a intentarlo.");
  else $("availability").textContent="⚠️ Sin conexión · intentando recuperar la transmisión";
 }finally{fetchInProgress=false;}
}
setInterval(renderClock,450);
if(new URLSearchParams(location.search).get("demo")==="1"){
 const fake={
   title:"Amistoso de Futbolito · DEMOSTRACIÓN",status:"live",
   home_logo_url:null,away_logo_url:null,event_seq:3,
   snapshot:{home_name:"Mala Clase",away_name:"Larraguibel",scores:[3,2],
    period_fouls:[2,1],yellow_cards:[2,1],red_cards:[0,1],
    period:2,elapsed:1122,half_minutes:25,running:false,
    synced_at:new Date().toISOString()},
   event_history:[
    {type:"goal",team:"home",player:"Paine",period:1,minute:11},
    {type:"yellow",team:"away",player:"#7",period:2,minute:15},
    {type:"goal",team:"home",player:"Paine",period:2,minute:17}
   ]
 };
 function paintDemo(){
  apply(fake);
  $("availability").textContent="◉ DEMOSTRACIÓN · Datos ficticios";
  $("clockState").textContent=fake.status==="finished"?"Resultado final":"Marcador de ejemplo";
  document.title="Futbolito · Demostración del espectador";
 }
 paintDemo();
 const controls=document.createElement("div");
 controls.style.cssText="position:relative;z-index:2;max-width:850px;margin:0 auto 35px;padding:15px;border:1px solid #7355a6;border-radius:13px;background:#1b1733;text-align:center;font:14px system-ui";
 const cap=document.createElement("strong");
 cap.textContent="🎮 Modo demostración · Estos botones NO modifican un partido real.";
 controls.append(cap);
 const opts=[
  ["⚽ Probar gol","goal","Paine"],
  ["🟨 Probar amarilla","yellow","#7"],
  ["🟥 Probar roja","red","#4"]
 ];
 for(const [label,kind,player] of opts){
  const b=document.createElement("button");b.type="button";b.textContent=label;
  b.style.cssText="border:1px solid #a38bc4;color:white;background:#403052;border-radius:8px;padding:9px;margin:8px 4px;cursor:pointer";
  b.addEventListener("click",()=>showAnnouncement({
   type:kind,player,team:kind==="yellow"?"away":"home",minute:19
  },fake.snapshot));
  controls.append(b);
 }
 const finish=document.createElement("button");
 finish.type="button";finish.textContent="🏁 Ver partido finalizado";
 finish.style.cssText="border:1px solid #e4c979;color:white;background:#61502b;border-radius:8px;padding:9px;margin:8px 4px;cursor:pointer";
 finish.addEventListener("click",()=>{
  const ended=fake.status==="finished";
  fake.status=ended?"live":"finished";fake.snapshot.period=ended?2:3;
  if(!ended)fake.snapshot.scores=[4,2];else fake.snapshot.scores=[3,2];
  finish.textContent=ended?"🏁 Ver partido finalizado":"▶ Volver al partido en vivo";
  paintDemo();
 });
 controls.append(finish);
 document.body.append(controls);
}else{
 setInterval(()=>{if(!document.hidden)fetchCurrent()},4200);
 setInterval(()=>{if(document.hidden)fetchCurrent()},17000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)fetchCurrent()});
 fetchCurrent();
}
