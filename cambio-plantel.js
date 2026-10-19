/* Cambio rápido de plantel. Cada plantilla mantiene una partida local independiente. */
(()=>{
"use strict";
if(window.FutbolitoCambiarPlantel||document.documentElement.dataset.club==="larraguibel")return;
const $=id=>document.getElementById(id);
if(typeof state==="undefined"||typeof save!=="function"||!$("homeTeam"))return;
const names=["Mala Clase +30","Mala Clase TC"];
const key=n=>"futbolito-partido-por-plantel:v1:mala-clase:"+encodeURIComponent(n);
const originalSave=save;
save=function(...args){
 originalSave.apply(this,args);
 try{
  const n=state.homeTeam;
  if(names.includes(n))localStorage.setItem(key(n),JSON.stringify({...state,running:false,startedAt:0}));
 }catch(e){console.warn("No se pudo guardar el plantel",e);}
};
save(); // Migración no destructiva del partido que ya estaba en uso.
let switching=false;
function hasActivity(){
 return state.running||state.elapsed>0||state.period!==1||
  state.scores?.some(n=>n>0)||state.totalFouls?.some(n=>n>0)||
  state.cards?.length||state.redCards?.length||state.goals?.length;
}
function updateButtons(){
 const current=state.homeTeam;
 document.querySelectorAll(".squad-switch-button").forEach(b=>{
  const active=b.dataset.squad===current;
  b.classList.toggle("selected",active);
  b.setAttribute("aria-pressed",String(active));
 });
 const note=$("squadSwitchCurrent");
 if(note)note.textContent=current;
}
function selectSquad(next){
 const previous=state.homeTeam;
 if(!names.includes(next)||!state.teams[next]){updateButtons();return false;}
 if(next===previous){updateButtons();return true;}
 $("homeTeam").value=previous;
 if(hasActivity()&&!confirm("El partido de "+previous+" tiene registros. Se guardará y quedará pausado. ¿Cambiar a "+next+"?")){
  updateButtons();return false;
 }
 // Pausar y conservar el marcador ANTES de cambiar cualquier dato visible.
 if(state.running)stop();else save();
 let restore=null;
 try{const raw=localStorage.getItem(key(next));if(raw)restore=JSON.parse(raw);}
 catch(e){console.warn("Estado anterior inválido para "+next,e);}
 const teams=state.teams;
 const blank={period:1,elapsed:0,running:false,startedAt:0,scores:[0,0],
  periodFouls:[0,0],totalFouls:[0,0],cards:[],redCards:[],goals:[],
  awayName:"Rival",halfMinutes:25,archiveId:null,archivePending:false,firstHalfFouls:null};
 state={...state,...blank,...(restore||{}),teams,homeTeam:next,running:false,startedAt:0};
 $("homeTeam").value=next;
 $("awayName").value=state.awayName||"Rival";
 $("halfMinutes").value=state.halfMinutes||25;
 if($("editTeamSelect"))$("editTeamSelect").value=next;
 populatePlayerSelect();
 if(typeof actionUndo!=="undefined")actionUndo=null;
 $("lastAction")?.classList.add("hidden");
 render();
 // Avisar a Campeonato para recuperar exclusivamente el contexto del plantel elegido.
 switching=true;
 try{$("homeTeam").dispatchEvent(new Event("change",{bubbles:true}));}
 finally{switching=false;}
 window.dispatchEvent(new CustomEvent("futbolito:squad-changed",{detail:{previous,team:next}}));
 updateButtons();
 return true;
}
$("homeTeam").addEventListener("change",event=>{
 if(switching)return;
 const requested=$("homeTeam").value;
 if(requested===state.homeTeam)return;
 event.stopImmediatePropagation();
 selectSquad(requested);
},true);
const style=document.createElement("style");
style.textContent=`
.squad-switcher{display:grid;gap:6px;margin:0 0 11px;padding:10px;border-radius:12px;background:#161d2e;border:1px solid #7e6b92}
.squad-switch-caption{font:800 11px system-ui,sans-serif;text-transform:uppercase;letter-spacing:.5px;color:#e1caec}
.squad-switch-options{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.squad-switch-button{cursor:pointer;min-height:49px;border:1px solid #79648c;border-radius:10px;background:#252036;color:#ede3f3;font:800 clamp(12px,3.5vw,15px) system-ui,sans-serif;touch-action:manipulation}
.squad-switch-button.selected{background:#a879ed;color:#1c0b2e;border:2px solid #f7e5ff;box-shadow:0 0 0 2px #a879ed33}
.squad-switch-button:focus-visible{outline:3px solid #f6e0ad;outline-offset:2px}
#squadSwitchInCompetition{margin:0}
`;
document.head.append(style);
function createBar(id){
 const section=document.createElement("section");section.id=id;section.className="squad-switcher";
 section.setAttribute("aria-label","Cambiar plantel activo");
 const caption=document.createElement("div");caption.className="squad-switch-caption";
 caption.textContent="Plantel activo · cambio rápido";
 const group=document.createElement("div");group.className="squad-switch-options";
 for(const name of names){
  const b=document.createElement("button");b.type="button";b.className="squad-switch-button";
  b.textContent=name;b.dataset.squad=name;
  b.addEventListener("click",()=>selectSquad(name));
  group.append(b);
 }
 section.append(caption,group);
 return section;
}
document.querySelector("header.top")?.insertAdjacentElement("afterend",createBar("squadSwitchHeader"));
$("hubCompetition")?.insertBefore(createBar("squadSwitchInCompetition"),$("hubCompetition").firstChild);
window.FutbolitoCambiarPlantel={seleccionar:selectSquad,actual:()=>state.homeTeam};
window.addEventListener("futbolito:squad-changed",updateButtons);
updateButtons();
})();