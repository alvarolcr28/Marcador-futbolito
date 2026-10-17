/* Registro opcional de asistencias y vinculación de dorsales de la plantilla local.
   Una cifra solo se vincula cuando encuentra un jugador único en la plantilla actual. */
(()=>{
'use strict';
const el=id=>document.getElementById(id);
if(!el('goalDialog')||!el('goalManualScorer')||!el('manualPlayer')||!el('homeTeam'))return;
const club=document.documentElement.dataset.club||(/larraguibel/i.test(location.pathname)?'larraguibel':'mala-clase');
const storageKey='futbolito-asistencias-v1:'+club;
let assistsEnabled=false;
try{assistsEnabled=localStorage.getItem(storageKey)==='true';}catch(e){}
const css=document.createElement('style');
css.textContent='.player-roster-hint{font-size:12px;line-height:1.5;color:#c8d9e4;margin-top:5px;min-height:17px}.assist-box{margin-top:12px;padding:10px;border:1px solid #5e6781;border-radius:11px;background:#101b2e}.assist-box[hidden]{display:none!important}.assist-box .field{margin-top:8px}.assist-box .field label{display:block;margin-bottom:5px}.assist-box input,.assist-box select{width:100%;min-height:43px;border:1px solid #61718c;border-radius:9px;padding:8px;color:white;background:#101829;font:inherit}';
document.head.appendChild(css);
const field=el('goalManualField');
const assistBox=document.createElement('div');
assistBox.id='futAssistBox';assistBox.className='assist-box';
assistBox.innerHTML='<strong>🅰 Asistencia (opcional)</strong>'+
 '<div class="field"><label for="assistScorer">Elegir asistente de la plantilla</label><select id="assistScorer"></select></div>'+
 '<div class="field"><label for="assistManualScorer">O escribir dorsal o nombre</label><input id="assistManualScorer" autocomplete="off" placeholder="Ej.: 7 o #7"></div>'+
 '<div class="player-roster-hint" id="assistHint" aria-live="polite"></div>';
field.insertAdjacentElement('afterend',assistBox);

function roster(){
 return Array.isArray(state?.teams?.[teamName()])?state.teams[teamName()]:[];
}
function normalize(value){
 return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
}
function lookup(value){
 const raw=String(value||'').trim();
 if(!raw)return {value:'',kind:'empty'};
 const dorsal=normalize(raw).match(/^(?:(?:camiseta|dorsal|n[°ºo])\s*)?#?\s*(\d{1,3})$/i);
 const matches=dorsal
  ?roster().filter(p=>String(Number(p[0]))===String(Number(dorsal[1])))
  :roster().filter(p=>normalize(p[1])===normalize(raw)||normalize('#'+p[0]+' '+p[1])===normalize(raw));
 if(matches.length===1){
  const [number,name]=matches[0];
  return {value:'#'+number+' '+name,kind:'linked'};
 }
 if(matches.length>1)return {value:raw,kind:'ambiguous'};
 return {value:raw,kind:'manual'};
}
function hintFor(result){
 if(result.kind==='linked')return '✓ Vinculado a la plantilla: '+result.value;
 if(result.kind==='ambiguous')return 'Hay dorsales o nombres duplicados: elige al jugador de la lista.';
 if(result.kind==='manual')return 'No se encontró en la plantilla local; quedará como texto manual.';
 return '';
}
function setAssistChoices(){
 const list=el('assistScorer');if(!list)return;
 list.replaceChildren(new Option('No registrar asistencia','__none__'));
 roster().forEach(([number,name])=>list.add(new Option('#'+number+' · '+name,'#'+number+' '+name)));
 list.value='__none__';
}
function bindManual(id,selectId,hintId,isHome){
 const input=el(id),select=el(selectId);
 if(!input)return;
 let hint=el(hintId);
 if(!hint){
  hint=document.createElement('div');hint.id=hintId;hint.className='player-roster-hint';hint.setAttribute('aria-live','polite');
  input.insertAdjacentElement('afterend',hint);
 }
 function refresh(){
  if(!isHome()){hint.textContent='';return;}
  const found=lookup(input.value);
  hint.textContent=hintFor(found);
  if(found.kind==='linked' && select && [...select.options].some(o=>o.value===found.value))select.value=found.value;
 }
 input.addEventListener('input',refresh);
 select?.addEventListener('change',()=>{
  if(input.value){input.value='';hint.textContent='';}
 });
 input.addEventListener('focus',refresh);
 return {input,select,refresh,isHome};
}
const homeGoal=bindManual('goalManualScorer','goalScorer','futGoalRosterHint',()=>true);
const homeCard=bindManual('manualPlayer','playerSelect','futCardRosterHint',()=>el('yellowTeam').value==='home');
const homeAssist=bindManual('assistManualScorer','assistScorer','assistHint',()=>true);

function prepareManual(binding){
 if(!binding||!binding.isHome())return;
 const val=binding.input.value.trim();
 if(!val)return;
 const match=lookup(val);
 if(match.kind==='linked'){
  binding.input.value=match.value;
  if(binding.select&&[...binding.select.options].some(o=>o.value===match.value))binding.select.value=match.value;
 }
}
function assistValue(){
 if(!assistsEnabled||!el('goalDialog').open)return '';
 const manual=el('assistManualScorer').value.trim();
 if(manual)return lookup(manual).value;
 const selected=el('assistScorer').value;
 return selected==='__none__'?'':selected;
}
function reflect(){
 assistBox.hidden=!assistsEnabled||el('goalRosterField').style.display==='none';
 const check=el('hubTrackAssists');if(check)check.checked=assistsEnabled;
}
function resetAssist(){
 setAssistChoices();el('assistManualScorer').value='';el('assistHint').textContent='';
 reflect();
}
el('homePlus')?.addEventListener('click',resetAssist);
el('quickHomeGoal')?.addEventListener('click',()=>setTimeout(resetAssist,0));
// También se reinicia si otra función abre el diálogo desde código.
el('goalDialog').addEventListener('close',resetAssist);
el('yellowTeam').addEventListener('change',()=>{homeCard.refresh();});
el('homeTeam').addEventListener('change',()=>{if(el('goalDialog').open)resetAssist();homeGoal.refresh();homeCard.refresh();});
el('confirmGoal').addEventListener('click',()=>prepareManual(homeGoal),true);
el('confirmYellow').addEventListener('click',()=>prepareManual(homeCard),true);
const priorGoal=openGoal;
openGoal=function(teamIndex){
 priorGoal(teamIndex);
 resetAssist();
 reflect();
};

const priorAddGoal=addGoal;
addGoal=function(teamIndex,scorer,ownGoal){
 const assistant=teamIndex===0&&!ownGoal?assistValue():'';
 const before=state.goals.length;
 const result=priorAddGoal.apply(this,arguments);
 if(assistant && state.goals.length===before+1){
  const added=state.goals[state.goals.length-1];
  if(added && added.team==='home'&&!added.ownGoal){
   added.assist=assistant;
   render();
  }
 }
 return result;
};
const oldRenderGoals=renderGoals;
renderGoals=function(){
 oldRenderGoals();
 const rows=el('goalList')?.querySelectorAll('.yellow-card')||[];
 rows.forEach((row,i)=>{
  const g=state.goals[i];
  if(!g?.assist||g.team!=='home'||g.ownGoal)return;
  const small=row.querySelector('small');
  if(small)small.textContent+=' · 🅰 Asistencia: '+g.assist;
 });
};
const previousFormat=formatMatchSummary;
formatMatchSummary=function(m){
 const original=previousFormat(m);
 const start=original.indexOf('⚽ *GOLES (');
 const end=original.indexOf('🟨 *AMARILLAS (',start);
 if(start<0||end<0)return original;
 const sorted=(m.goals||[]).filter(g=>g.period===1||g.period===2)
  .slice().sort((a,b)=>Number(a.period)-Number(b.period)||Number(a.elapsedAt||0)-Number(b.elapsedAt||0));
 const section=original.slice(start,end),lines=section.split('\n');
 const indices=lines.map((v,i)=>/^\d{2,3}'\s*\([12]T\s+\d+'\)/.test(v)?i:-1).filter(i=>i>=0);
 if(indices.length!==sorted.length)return original;
 sorted.forEach((goal,i)=>{
  if(goal.assist&&goal.team==='home'&&!goal.ownGoal)lines[indices[i]]+=' · 🅰 Asist.: '+goal.assist;
 });
 return original.slice(0,start)+lines.join('\n')+original.slice(end);
};

function mountSettings(){
 const container=el('hubGame');
 if(!container||el('hubTrackAssists'))return;
 const rule=el('hubResetFouls')?.closest('.fhub-line')||container;
 const setting=document.createElement('label');setting.className='fhub-switch';
 setting.innerHTML='<input id="hubTrackAssists" type="checkbox"> Registrar asistencias de los goles locales';
 const help=document.createElement('p');help.className='fhub-small';
 help.textContent='Desactivado por defecto. Al activarlo, aparecerá un campo opcional junto al goleador. Solo se mostrarán asistencias efectivamente registradas.';
 rule.append(setting,help);
 el('hubTrackAssists').checked=assistsEnabled;
 el('hubTrackAssists').addEventListener('change',e=>{
  assistsEnabled=e.target.checked;
  try{localStorage.setItem(storageKey,String(assistsEnabled));}catch(err){}
  reflect();
 });
}
mountSettings();
const observer=new MutationObserver(()=>{if(el('hubGame')){mountSettings();observer.disconnect();}});
if(!el('hubGame'))observer.observe(document.body,{subtree:true,childList:true});
reflect();
window.FutbolitoJugadorResolver={lookup};
})();