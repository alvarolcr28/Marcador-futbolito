
// Vista rápida: opera sobre los controles y datos originales, sin crear otro partido.
const quickBindings={
 quickHomeGoal:'homePlus',quickAwayGoal:'awayPlus',
 quickHomeFoulPlus:'homeFoulPlus',quickHomeFoulMinus:'homeFoulMinus',
 quickAwayFoulPlus:'awayFoulPlus',quickAwayFoulMinus:'awayFoulMinus',
 quickHomeYellow:'yellowBtn',quickHomeRed:'redBtn',
 quickAwayYellow:'awayYellowBtn',quickAwayRed:'awayRedBtn',
 quickPeriodNext:'periodBtn',quickUndo:'undoAction',quickPause:'toggleBtn'
};
Object.entries(quickBindings).forEach(([quickId,sourceId])=>{
 $(quickId).addEventListener('click',()=>$(sourceId).click());
});
let currentView='full';
function switchView(next){
 currentView=next==='quick'?'quick':'full';
 const quick=currentView==='quick';
 $('quickBoard').hidden=!quick;
 $('mainMatchArea').hidden=quick;
 $('tabQuick').classList.toggle('active',quick);
 $('tabFull').classList.toggle('active',!quick);
 $('tabQuick').setAttribute('aria-selected',String(quick));
 $('tabFull').setAttribute('aria-selected',String(!quick));
 document.body.classList.toggle('quick-mode',quick);
 try{sessionStorage.setItem(APP_STORAGE_KEY+'-view',currentView);localStorage.setItem(APP_STORAGE_KEY+'-view',currentView);}catch(e){}
 window.scrollTo(0,0);
 if(window.updateFloating)window.updateFloating();
 refreshQuick();
}
$('tabQuick').onclick=()=>switchView('quick');
$('tabFull').onclick=()=>switchView('full');
function refreshQuick(){
 $('quickClock').textContent=fmt(state.elapsed);
 $('quickClock').classList.toggle('is-running',state.running);
 $('quickPeriod').textContent=state.period===1?'PRIMER TIEMPO':state.period===2?'SEGUNDO TIEMPO':'PARTIDO FINALIZADO';
 $('quickPause').textContent=state.running?'Ⅱ':'▶';
 $('quickPause').disabled=$('toggleBtn').disabled;
 $('quickPause').setAttribute('aria-label',state.running?'Pausar cronómetro':'Iniciar o reanudar cronómetro');
 $('quickHomeScore').textContent=state.scores[0];
 $('quickAwayScore').textContent=state.scores[1];
 $('quickHomeName').textContent=teamName();
 $('quickAwayName').textContent=$('awayName').value.trim()||'Rival';
 $('quickHomeFoulName').textContent=teamName();
 $('quickAwayFoulName').textContent=$('awayName').value.trim()||'Rival';
 $('quickHomeFouls').textContent=state.periodFouls[0];
 $('quickAwayFouls').textContent=state.periodFouls[1];
 $('quickHomeFoulsTotal').textContent='Acumulado: '+state.totalFouls[0];
 $('quickAwayFoulsTotal').textContent='Acumulado: '+state.totalFouls[1];
 $('quickPeriodNext').textContent=$('periodBtn').textContent;
 $('quickPeriodNext').disabled=$('periodBtn').disabled;
 $('quickUndo').disabled=$('lastAction').classList.contains('hidden');
}
const renderWithQuick=render;
render=function(){renderWithQuick();refreshQuick();};
const oldSetLastAction=setLastAction;
setLastAction=function(message,undo){oldSetLastAction(message,undo);refreshQuick();};
$('undoAction').addEventListener('click',()=>{refreshQuick();});
$('resetBtn').addEventListener('click',()=>{refreshQuick();});
// Usa el reinicio original: conserva su confirmación y evita duplicar reglas.
const quickActionRow=document.querySelector('#quickBoard .quick-actions');
if(quickActionRow&&!document.getElementById('quickReset')){
 const reset=document.createElement('button');
 reset.id='quickReset';reset.type='button';reset.className='btn quick-reset';
 reset.title='Reiniciar el partido completo';reset.setAttribute('aria-label','Reiniciar partido; solicitar confirmación');
 reset.textContent='↻ Reiniciar';
 quickActionRow.appendChild(reset);
 reset.addEventListener('click',()=>document.getElementById('resetBtn')?.click());
}
try{
 const wanted=new URLSearchParams(location.search).get('vista');
 const saved=sessionStorage.getItem(APP_STORAGE_KEY+'-view')||localStorage.getItem(APP_STORAGE_KEY+'-view');
 if(wanted==='rapida')switchView('quick');
 else if(wanted==='completa')switchView('full');
 else if(saved==='full')switchView('full');
 else switchView('quick');
}catch(e){switchView('quick');}
refreshQuick();

// Plantillas oficiales distribuidas por GitHub Pages.
// Editar solo en el teléfono es local; al aumentar version todos reciben la nueva edición.
async function syncOfficialRosters(){
 try{
  const resp=await fetch('./plantillas.json?actualizacion='+Date.now(),{cache:'no-store'});
  if(!resp.ok)return;
  const config=await resp.json();
  const version=Number(config.version);
  if(!Number.isSafeInteger(version)||version<1||!config.teams||typeof config.teams!=='object'||Array.isArray(config.teams))return;
  if(version<=Number(state.officialRosterVersion||0))return;
  const official={};
  for(const [name,list] of Object.entries(config.teams)){
   if(!name||name.length>50||!Array.isArray(list)||list.length>70)continue;
   const players=list.filter(p=>Array.isArray(p)&&p.length>=2&&String(p[1]).trim()).map(p=>[String(p[0]).slice(0,10),String(p[1]).slice(0,70)]);
   official[name]=players;
  }
  if(!Object.keys(official).length)return;
  const oldOfficial=Array.isArray(state.officialTeamNames)?state.officialTeamNames:[];
  for(const name of oldOfficial)if(!(name in official))delete state.teams[name];
  Object.assign(state.teams,official);
  state.officialTeamNames=Object.keys(official);
  state.officialRosterVersion=version;
  const selected=state.teams[teamName()]?teamName():Object.keys(official)[0];
  populateTeamSelectors(selected,selected);
  populatePlayerSelect();render();
 }catch(e){/* Sin conexión, se utiliza la plantilla incorporada al HTML. */}
}
// La edición oficial de plantillas ahora proviene de Supabase al iniciar sesión.
if(!document.documentElement.classList.contains("auth-trial"))syncOfficialRosters();
