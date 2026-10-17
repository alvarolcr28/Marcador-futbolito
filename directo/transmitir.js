import{createClient}from"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm";
(()=>{
"use strict";
const db=createClient("https://cpqvrmorbwrrorrsobgj.supabase.co","sb_publishable_KDivcfl1sf6CumXuMhi77w_k-01gmD4",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const slug=document.documentElement.dataset.club||"mala-clase";
let clubId=null,liveId=null,activeSince=0,checking=false,sending=false,started=false;
let seen=new Set(),pending=[],lastServerCheck=0,consecutiveErrors=0;
const head=document.querySelector(".top-actions");
const share=document.createElement("button");
share.type="button";share.className="iconbtn";share.id="publishMatchQr";
share.textContent="📱 QR";share.title="Preparar o compartir transmisión en vivo";
share.setAttribute("aria-label","Gestionar el QR público del partido");
share.style.cssText="font:800 12px system-ui;min-width:49px;border:1px solid #9d7be2;background:#39234f;color:white";
share.hidden=true;share.addEventListener("click",()=>location.assign("/Marcador-futbolito/directo/"));
head?.append(share);
const indicator=document.createElement("span");
indicator.id="liveMatchIndicator";indicator.hidden=true;
indicator.style.cssText="font:850 11px system-ui;border:1px solid #3d9d7e;background:#173e31;color:#9debd0;border-radius:8px;padding:7px 8px";
indicator.textContent="● En vivo";
head?.append(indicator);
function unlocked(){return document.documentElement.classList.contains("futbolito-unlocked");}
function matchReady(){return unlocked()&&typeof state!=="undefined"&&typeof teamName==="function"&&
 Array.isArray(state.scores)&&Array.isArray(state.cards);}
function eventRows(){
 if(!matchReady())return [];
 const all=[];
 for(let i=0;i<(state.goals||[]).length;i++){
  const g=state.goals[i];
  const key="goal:"+String(g.createdAt||"")+":"+i+":"+(g.team||"")+":"+g.elapsedAt;
  all.push({key,createdAt:g.createdAt||0,type:"goal",team:g.team==="away"?"away":"home",
   player:g.team==="home"?(g.scorer||""):"",period:g.period||1,
   minute:Math.max(1,Math.ceil(Number(g.elapsedAt||0)/60))});
 }
 for(const [type,arr] of [["yellow",state.cards||[]],["red",state.redCards||[]]]){
  for(let i=0;i<arr.length;i++){
   const c=arr[i];
   const key=type+":"+String(c.createdAt||"")+":"+i+":"+String(c.player||"")+":"+String(c.period||1);
   all.push({key,createdAt:c.createdAt||0,type,team:c.team==="away"?"away":"home",
    player:String(c.player||""),period:c.period||1,
    minute:c.minute||Math.max(1,Math.ceil(Number(c.matchElapsed||0)/60))});
  }
 }
 return all.sort((a,b)=>a.createdAt-b.createdAt);
}
function snapshot(){
 return {
  home_name:String(teamName()||"Local"),
  away_name:String((document.getElementById("awayName")?.value||state.awayName||"Rival").trim()||"Rival"),
  scores:[Number(state.scores[0])||0,Number(state.scores[1])||0],
  period_fouls:[Number(state.periodFouls?.[0])||0,Number(state.periodFouls?.[1])||0],
  yellow_cards:[
   state.cards.filter(c=>c.team==="home").length,
   state.cards.filter(c=>c.team==="away").length
  ],
  red_cards:[
   (state.redCards||[]).filter(c=>c.team==="home").length,
   (state.redCards||[]).filter(c=>c.team==="away").length
  ],
  period:Number(state.period)||1,
  elapsed:Math.max(0,Math.floor(Number(state.elapsed)||0)),
  half_minutes:Number(document.getElementById("halfMinutes")?.value||state.halfMinutes||25),
  running:Boolean(state.running)
 };
}
async function detect(){
 if(checking||!unlocked())return;checking=true;
 try{
  const {data:{user}}=await db.auth.getUser();
  if(!user)return;
  if(!clubId){
   const {data,error}=await db.from("clubs").select("id,slug").eq("slug",slug).maybeSingle();
   if(error||!data?.id)return;
   clubId=data.id;
   const [admin,manager]=await Promise.all([
    db.rpc("is_platform_admin"),
    db.rpc("is_club_manager",{p_club:clubId})
   ]);
   share.hidden=!(admin.data===true||manager.data===true);
  }
  const {data,error}=await db.rpc("get_active_match_for_operator",{p_club_id:clubId});
  if(error)throw error;
  const newid=data?.id||null;
  if(newid!==liveId){
    liveId=newid;activeSince=Date.now();
    seen=new Set(eventRows().map(e=>e.key));pending=[];
  }
  indicator.hidden=!liveId;
  indicator.textContent=liveId?"● En vivo":"";
  consecutiveErrors=0;
 }catch(e){
  consecutiveErrors++;if(consecutiveErrors>3){indicator.textContent="⚠ Transmisión";indicator.hidden=false;}
 }finally{checking=false;lastServerCheck=Date.now();}
}
async function transmit(){
 if(sending||!liveId||!matchReady())return;
 sending=true;
 try{
  const snap=snapshot();
  const fresh=eventRows();
  for(const ev of fresh){
   if(!seen.has(ev.key)){
    seen.add(ev.key);
    pending.push(ev);
   }
  }
  if(seen.size>250)seen=new Set(fresh.map(e=>e.key));
  const candidate=pending[0]||null;
  const safeEvent=candidate?{
   type:candidate.type,team:candidate.team,period:candidate.period,
   minute:candidate.minute,player:candidate.player
  }:null;
  const {data,error}=await db.rpc("sync_match_broadcast",{
   p_id:liveId,p_snapshot:snap,
   p_event:safeEvent,p_event_key:candidate?.key||null
  });
  if(error)throw error;
  if(candidate)pending.shift();
  indicator.hidden=false;indicator.textContent="● En vivo";
  consecutiveErrors=0;
  if(data?.status==="finished"){
   liveId=null;indicator.hidden=true;pending=[];
  }
 }catch(e){
  consecutiveErrors++;
  if(consecutiveErrors>=3){
   indicator.hidden=false;indicator.textContent="⚠ Transmisión";
  }
  if(/vence|vencido|no está publicado|permisos/i.test(e.message||"")){
   liveId=null;pending=[];indicator.hidden=true;
  }
 }finally{sending=false;}
}
setInterval(()=>{if(unlocked()&&Date.now()-lastServerCheck>11500)detect()},4000);
setInterval(()=>{if(unlocked())transmit()},2300);
// Publica el cambio de tiempo y el pitazo final sin esperar al siguiente ciclo.
document.getElementById("periodBtn")?.addEventListener("click",()=>setTimeout(transmit,250));
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&unlocked())detect()});
setTimeout(detect,1200);
})();
