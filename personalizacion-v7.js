/* Personalización v7: doble amarilla, anotación simplificada, temas e Instagram editable.
   No implementa contraseñas inseguras: el acceso multiusuario exige backend y permisos. */
(()=>{
'use strict';
const el=id=>document.getElementById(id);
if(!el('yellowDialog')||!el('goalDialog')||!el('homeTeam'))return;
const isLarra=/larraguibel/i.test(location.pathname)||/larraguibel/i.test(document.title);
const brand=isLarra?'Larraguibel':'Mala Clase';
const preset=isLarra?{primary:'#e53343',secondary:'#5a101b',visitor:'#8895a5',visitor2:'#354252',background:'#0d090c',background2:'#210b11',mixHome:true,mixVisitor:false,mixBackground:true}:{primary:'#a879ed',secondary:'#352052',visitor:'#8292a6',visitor2:'#3e485c',background:'#0b0a12',background2:'#241431',mixHome:true,mixVisitor:false,mixBackground:true};
const css=document.createElement('style');css.id='personalizationCss';css.textContent=`
.theme-editor{margin-top:16px;padding:14px;border-radius:14px;border:1px solid #8b7898;background:#161822}
.theme-editor h3{font-size:16px;margin:0 0 6px}
.theme-editor p{font-size:12px;color:#c8c8d0;margin:3px 0 12px}
.theme-color-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
.theme-color-field{padding:10px;border:1px solid #ffffff30;border-radius:10px;background:#0002;min-width:0}
.theme-color-field label{display:block;font-size:12px;font-weight:850;margin:0 0 7px;color:#e4dcec}
.theme-color-field input[type=color]{width:100%;height:46px;padding:2px 4px;border:1px solid #ffffff35;border-radius:9px;background:#171923;cursor:pointer}
.theme-toggles{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}
.theme-toggles label,.ig-data-choices label{display:flex;align-items:center;gap:7px;font-size:13px;cursor:pointer}
.theme-toggles input,.ig-data-choices input{accent-color:var(--green);width:18px;height:18px}
.theme-buttons{display:flex;gap:9px;flex-wrap:wrap}
.theme-preview{border-radius:8px;margin:9px 0 0;height:24px;border:1px solid #ffffff55}
.auto-red-message{max-width:430px;border:2px solid #ff6476;background:#251016;color:#fff;padding:21px 18px;border-radius:17px}
.auto-red-message::backdrop{background:rgba(0,0,0,.72)}
.auto-red-message h3{margin:0 0 11px;font-size:21px}
.auto-red-message p{margin:0 0 16px;font-size:15px;line-height:1.5}
.auto-red-message button{width:100%;background:#e23c4c;border:0;border-radius:10px;min-height:49px;font-weight:900;color:white}
#igAdvancedDialog{width:calc(100% - 16px);max-width:660px;max-height:95dvh;overflow:auto;border-radius:18px;border:1px solid #b393ce;background:#14151d;color:white;padding:15px}
.ig-adv-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin:9px 0}
.ig-adv-grid label{display:block;font-size:12px;font-weight:750;color:#d9d5e2;margin-bottom:6px}
.ig-adv-grid input,.ig-adv-grid select{width:100%;min-width:0;border:1px solid #75667e;border-radius:9px;padding:9px;background:#11131b;color:white;font:inherit}
.ig-data-choices{display:flex;gap:12px;flex-wrap:wrap;padding:10px;background:#22232f;border-radius:10px;margin:9px 0}
.ig-advanced-preview{display:block;width:min(100%,390px);height:auto;margin:10px auto;border-radius:9px;border:1px solid #78678a;background:#0d0f15;touch-action:none;cursor:grab}
.ig-slider-row{display:grid;grid-template-columns:94px minmax(0,1fr) 39px;gap:8px;align-items:center;margin:10px 0;font-size:12px}
.ig-slider-row input{width:100%;accent-color:var(--green)}
.ig-adv-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:14px 0 8px}
.ig-adv-actions button{min-height:47px}
.ig-adv-help{font-size:12px;line-height:1.45;color:#c5bfd0}
.ig-adv-status{min-height:18px;font-size:12px;color:#c2f3d9}
@media(max-width:420px){.theme-editor{padding:10px}.ig-adv-grid{grid-template-columns:1fr}.ig-adv-actions button{font-size:12px;padding:8px 6px}.ig-data-choices{gap:8px}.ig-slider-row{grid-template-columns:74px minmax(0,1fr) 35px}}
`;
document.head.append(css);

// Tarjetas: normalización sensible a número o nombre, no depende de una lista visitante.
function playerAliases(label,team){
 const raw=String(label??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const clean=raw.replace(/^camiseta\s*/,'').replace(/^n[°ºo]\s*/,'').replace(/^#/,'').trim();
 const found=clean.match(/^(\d{1,3})(?:\s+(.+))?$/);
 const keys=new Set();
 if(found){keys.add('n:'+String(Number(found[1])));if(found[2])keys.add('t:'+found[2].replace(/\s+/g,' ').trim());}
 else if(clean)keys.add('t:'+clean.replace(/\s+/g,' ').trim());
 if(team==='home'){
  const roster=state.teams[teamName()]||[];
  for(const [number,name] of roster){
   const normalized=String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
   const num='n:'+String(Number(number));
   if(keys.has('t:'+normalized)||keys.has(num)){
    if(normalized)keys.add('t:'+normalized);
    if(Number.isFinite(Number(number)))keys.add(num);
   }
  }
 }
 return keys;
}
function samePlayer(a,b,team){
 const first=playerAliases(a,team),second=playerAliases(b,team);
 return [...first].some(key=>second.has(key));
}
const expulsionDialog=document.createElement('dialog');expulsionDialog.className='auto-red-message';expulsionDialog.id='doubleYellowNotice';
expulsionDialog.innerHTML='<h3>🟥 Expulsión por doble amarilla</h3><p id="doubleYellowMessage"></p><button type="button" id="doubleYellowOk">Entendido</button>';
document.body.append(expulsionDialog);
el('doubleYellowOk').onclick=()=>expulsionDialog.close();
// Ejecutar tras la extensión de tarjetas y faltas, respetando su lógica de Deshacer.
const priorConfirm=el('confirmYellow').onclick;
el('confirmYellow').onclick=function(ev){
 const yellowMode=cardKind==='yellow', side=el('yellowTeam').value;
 const previousCount=state.cards.length;
 priorConfirm?.call(this,ev);
 if(!yellowMode||state.cards.length!==previousCount+1)return;
 const current=state.cards[state.cards.length-1];
 const matches=state.cards.filter(c=>c.team===side && c.teamName===current.teamName && samePlayer(c.player,current.player,side));
 if(matches.length<2)return;
 // Evitar registrar dos expulsiones automáticas del mismo jugador.
 if(state.redCards.some(c=>c.team===side && c.teamName===current.teamName && samePlayer(c.player,current.player,side)))return;
 const autoId='double-'+Date.now()+'-'+state.cards.length;
 current.autoRedId=autoId;
 const red={...current,autoDoubleYellow:true,autoRedId:autoId,reason:'Doble amarilla',foulCounted:false};
 state.redCards.push(red);
 const oldUndo=actionUndo;
 render();
 setLastAction('🟥 Doble amarilla: '+current.player+' expulsado.',()=>{
  const i=state.redCards.findIndex(r=>r.autoRedId===autoId);
  if(i>=0)state.redCards.splice(i,1);
  if(typeof oldUndo==='function')oldUndo();
  else{const j=state.cards.indexOf(current);if(j>=0)state.cards.splice(j,1);render();}
 });
 el('doubleYellowMessage').textContent=current.player+' · '+(side==='home'?teamName():(el('awayName').value||'Rival'))+'. Segunda amarilla: expulsado.';
 expulsionDialog.showModal();
};
// Un expulsado no debe mostrar burbuja de reingreso por los dos minutos.
const previousSanctionRemaining=sanctionRemaining;
sanctionRemaining=function(card){
 if(state.redCards.some(r=>r.team===card.team&&samePlayer(r.player,card.player,card.team)))return 0;
 return previousSanctionRemaining(card);
};
// Si se elimina del historial la segunda amarilla, elimina también su roja vinculada.
function reconcileAutomaticReds(){
 for(let i=state.redCards.length-1;i>=0;i--){
  const red=state.redCards[i];
  if(!red.autoDoubleYellow)continue;
  const amount=state.cards.filter(y=>y.team===red.team && y.teamName===red.teamName && samePlayer(y.player,red.player,red.team)).length;
  if(amount<2)state.redCards.splice(i,1);
 }
}
const previousCardsRenderer=renderCards;
renderCards=function(){
 previousCardsRenderer();
 el('yellowList').querySelectorAll('.yellow-card').forEach(row=>{
  const del=row.querySelector('button');if(!del)return;
  const prior=del.onclick;
  del.onclick=e=>{prior?.call(del,e);reconcileAutomaticReds();render();};
 });
};
const previousRedsRenderer=renderRedCards;
renderRedCards=function(){
 previousRedsRenderer();
 el('redList').querySelectorAll('.yellow-card').forEach((row,index)=>{
  const record=state.redCards[index];
  if(record?.autoDoubleYellow){
   const detail=row.querySelector('small');if(detail)detail.textContent+=' · Automática por doble amarilla';
  }
 });
};
const beforeSummary=formatMatchSummary;
formatMatchSummary=function(m){
 const original=beforeSummary(m);
 const head='🟥 *ROJAS (';
 const begin=original.indexOf(head);
 if(begin<0)return original;
 const next=original.indexOf('🚩 *FALTAS*',begin);
 if(next<0)return original;
 let part=original.slice(begin,next);
 for(const red of (m.redCards||[]).filter(x=>x.autoDoubleYellow)){
  const lines=part.split('\n');
  const line=lines.findIndex(x=>x.includes(red.player)&&!x.includes('doble amarilla'));
  if(line>=0)lines[line]+=' · doble amarilla';
  part=lines.join('\n');
 }
 return original.slice(0,begin)+part+original.slice(next);
};

// Modal de gol: título explícito, autogol primera opción, sin autor sigue por defecto.
const basePopulateGoalScorer=populateGoalScorer;
populateGoalScorer=function(){
 basePopulateGoalScorer();
 const select=el('goalScorer');if(!select)return;
 const own=new Option('⚽ Autogol','__autogol__');
 select.insertBefore(own,select.firstChild);
 select.value='__none__';
};
const beforeOpenGoal=openGoal;
openGoal=function(teamIndex){
 beforeOpenGoal(teamIndex);
 el('goalDialogTitle').textContent='⚽ Guardar gol · '+(teamIndex===0?teamName():(el('awayName').value||'Rival'));
};
const oldGoalConfirm=el('confirmGoal').onclick;
el('confirmGoal').onclick=function(ev){
 if(el('goalScorer').value==='__autogol__'){
  el('ownGoalBtn').click();
  return;
 }
 oldGoalConfirm?.call(this,ev);
};
el('goalScorer').addEventListener('change',()=>{
 if(el('goalScorer').value==='__autogol__')el('goalManualScorer').value='';
});
el('ownGoalBtn').style.display='none';

// Temas editables: quedan solo en este navegador hasta implementar usuarios y servidor.
const themeKey='futbolito-theme-v1:'+location.pathname.toLowerCase();
function safeColor(value,fallback){return /^#[0-9a-fA-F]{6}$/.test(value||'')?value:fallback;}
let theme={...preset};
try{const saved=JSON.parse(localStorage.getItem(themeKey)||'null');if(saved&&typeof saved==='object')theme={...theme,...saved};}catch(e){}
const conf=document.querySelector('details.config-fold > section.panel');
const editor=document.createElement('section');editor.className='theme-editor';editor.id='themeEditor';
editor.innerHTML=`<h3>🎨 Personalizar colores</h3>
<p>Selecciona los colores del club, del visitante y del fondo. Puedes mezclar dos tonos. Se guarda en este dispositivo.</p>
<div class="theme-color-grid">
 <div class="theme-color-field"><label for="themePrimary">Equipo local · principal</label><input id="themePrimary" type="color"></div>
 <div class="theme-color-field"><label for="themeSecondary">Equipo local · segundo color</label><input id="themeSecondary" type="color"></div>
 <div class="theme-color-field"><label for="themeVisitor">Visitante · principal</label><input id="themeVisitor" type="color"></div>
 <div class="theme-color-field"><label for="themeVisitor2">Visitante · segundo color</label><input id="themeVisitor2" type="color"></div>
 <div class="theme-color-field"><label for="themeBackground">Fondo · principal</label><input id="themeBackground" type="color"></div>
 <div class="theme-color-field"><label for="themeBackground2">Fondo · segundo color</label><input id="themeBackground2" type="color"></div>
</div>
<div class="theme-toggles"><label><input type="checkbox" id="themeMixHome"> Mezclar colores del local</label><label><input type="checkbox" id="themeMixVisitor"> Mezclar colores del visitante</label><label><input type="checkbox" id="themeMixBg"> Mezclar fondo</label></div>
<div id="themePreview" class="theme-preview" aria-label="Vista previa del color local"></div>
<div id="themeVisitorPreview" class="theme-preview" aria-label="Vista previa del color visitante"></div>
<div class="theme-buttons"><button type="button" id="themeReset" class="btn">Restablecer colores del club</button></div>`;
if(conf)conf.appendChild(editor);
const themeNodes={primary:'themePrimary',secondary:'themeSecondary',visitor:'themeVisitor',visitor2:'themeVisitor2',background:'themeBackground',background2:'themeBackground2',mixHome:'themeMixHome',mixVisitor:'themeMixVisitor',mixBackground:'themeMixBg'};
const styleTheme=document.createElement('style');styleTheme.id='runtimeThemeCss';document.head.append(styleTheme);
function rgba(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;}
function contrastColor(hex){const n=parseInt(hex.slice(1),16),l=(.2126*((n>>16)&255)+.7152*((n>>8)&255)+.0722*(n&255))/255;return l>.54?'#11131a':'#ffffff';}
function gradient(a,b,mix){return mix?`linear-gradient(140deg,${a} 0%,${b} 100%)`:a;}
function applyTheme(){
 for(const [key,def] of Object.entries(preset)){
  if(typeof def==='boolean')theme[key]=Boolean(theme[key]);
  else theme[key]=safeColor(theme[key],def);
 }
 const t=theme, local=gradient(t.primary,t.secondary,t.mixHome),visitor=gradient(t.visitor,t.visitor2,t.mixVisitor),background=gradient(t.background,t.background2,t.mixBackground);
 const textOnLocal=contrastColor(t.primary),textOnAway=contrastColor(t.visitor);
 document.documentElement.style.setProperty('--green',t.primary);
 document.documentElement.style.setProperty('--blue',t.visitor);
 styleTheme.textContent=`
 body{background:${background}!important;background-attachment:fixed!important}
 .team.home{background:${local}!important;border-color:${t.primary}!important}
 .team.away{background:${visitor}!important;border-color:${t.visitor}!important}
 .timer{background:${rgba(t.background2,.90)}!important;border-left-color:${t.primary}!important}
 .g-action,.team.home .g-action,.quick-goal.home,.quick-pause,.view-tab.active{background:${t.primary}!important;border-color:${t.primary}!important;color:${textOnLocal}!important}
 .team.away .g-action,.quick-goal.away{background:${t.visitor}!important;border-color:${t.visitor}!important;color:${textOnAway}!important}
 .float-inner{background:${rgba(t.background2,.88)}!important;border-color:${rgba(t.primary,.6)}!important}
 #floatingHomeScore,.quick-score b:first-child,.quick-teamnames span:first-child{color:${t.primary}!important}
 #floatingAwayScore,.quick-score b:last-child{color:${t.visitor}!important}
 .quick-head{border-left-color:${t.primary}!important;background:${rgba(t.background2,.93)}!important}
 .quick-foul-box.home{border-color:${t.primary}!important}
 .quick-teamnames span:first-child{color:${t.primary}!important}
 .btn.primary{background:${t.primary}!important;border-color:${t.primary}!important;color:${textOnLocal}!important}
 .theme-preview{background:${local}}
 #themeVisitorPreview{background:${visitor}}
 `;
 el('themePreview')?.setAttribute('style',`background:${local}`);
 el('themeVisitorPreview')?.setAttribute('style',`background:${visitor}`);
 try{localStorage.setItem(themeKey,JSON.stringify(t));}catch(e){}
 if(document.getElementById('igAdvancedDialog')?.open)drawAdvancedPost();
}
function reflectTheme(){
 for(const [k,id] of Object.entries(themeNodes)){
  const node=el(id);if(!node)continue;
  if(node.type==='checkbox')node.checked=theme[k];else node.value=theme[k];
 }
 applyTheme();
}
for(const [k,id] of Object.entries(themeNodes))el(id)?.addEventListener('input',ev=>{theme[k]=ev.target.type==='checkbox'?ev.target.checked:ev.target.value;applyTheme();});
el('themeReset')?.addEventListener('click',()=>{theme={...preset};reflectTheme();});
reflectTheme();

// Generador flexible de imágenes, con reencuadre, formatos historia/post y estadísticas opcionales.
const igTrigger=el('openInstagramPost');
const postDialog=document.createElement('dialog');postDialog.id='igAdvancedDialog';
postDialog.innerHTML=`
 <div class="modal-head"><h2>📸 Diseño para Instagram</h2><button id="advancedClose" type="button" class="close" aria-label="Cerrar">✕</button></div>
 <p class="ig-adv-help">Sube una foto, ajusta el encuadre y elige qué datos mostrar. Nada se sube a un servidor.</p>
 <div class="ig-adv-grid">
  <div><label for="advancedPhoto">Foto del partido</label><input id="advancedPhoto" type="file" accept="image/*"></div>
  <div><label for="advancedFormat">Formato</label><select id="advancedFormat"><option value="story">Historia 9:16</option><option value="post">Publicación 4:5</option></select></div>
  <div><label for="advancedTitle">Título (nombre del equipo por defecto)</label><input id="advancedTitle" type="text" maxlength="44"></div>
  <div><label for="advancedSubtitle">Texto secundario</label><input id="advancedSubtitle" type="text" maxlength="48" placeholder="Ej.: Campeonato de amigos"></div>
 </div>
 <div class="ig-data-choices"><label><input id="advancedGoals" type="checkbox" checked>⚽ Goles</label><label><input id="advancedFouls" type="checkbox" checked>🚩 Faltas</label><label><input id="advancedYellows" type="checkbox" checked>🟨 Amarillas</label><label><input id="advancedReds" type="checkbox" checked>🟥 Rojas</label></div>
 <div class="ig-slider-row"><label for="advancedZoom">Zoom</label><input id="advancedZoom" type="range" min="100" max="250" value="100" step="5"><output id="advancedZoomValue">100%</output></div>
 <div class="ig-slider-row"><label for="advancedPanX">Horizontal</label><input id="advancedPanX" type="range" min="-100" max="100" value="0"><output id="advancedPanXValue">0</output></div>
 <div class="ig-slider-row"><label for="advancedPanY">Vertical</label><input id="advancedPanY" type="range" min="-100" max="100" value="0"><output id="advancedPanYValue">0</output></div>
 <p class="ig-adv-help">Arrastra la fotografía sobre la imagen para ajustar su posición, o utiliza los controles.</p>
 <canvas id="advancedCanvas" width="1080" height="1920" class="ig-advanced-preview" aria-label="Vista previa editable para Instagram"></canvas>
 <div class="ig-adv-actions"><button type="button" id="advancedDownload" class="btn primary">⬇ Guardar PNG</button><button type="button" id="advancedShare" class="btn">↗ Compartir</button></div>
 <div class="ig-adv-status" id="advancedStatus" role="status"></div>
 <p class="ig-adv-help">Podrás publicar el archivo desde Instagram; compartirlo no equivale a publicarlo automáticamente.</p>`;
document.body.appendChild(postDialog);
const cv=el('advancedCanvas'),cx=cv.getContext('2d');
let img=null,imgUrl='',panX=0,panY=0,zoom=1;
let currentPhotoRect={x:0,y:160,w:1080,h:900};
function textLine(txt,x,y,maxW,font=36,color='#fff',align='left',min=19,weight=850){
 cx.textAlign=align;cx.fillStyle=color;let sz=font;const t=String(txt??'');
 do{cx.font=`${weight} ${sz}px system-ui,Arial,sans-serif`;if(cx.measureText(t).width<=maxW||sz<=min)break;sz-=2;}while(sz>min);
 cx.fillText(t,x,y,maxW);
}
function drawRound(x,y,w,h,r=19){cx.beginPath();if(cx.roundRect)cx.roundRect(x,y,w,h,r);else cx.rect(x,y,w,h);}
function eventName(g){return g.ownGoal?'Autogol':(g.scorer||'Sin autor');}
function drawAdvancedPost(){
 if(!cx)return;
 const story=el('advancedFormat').value==='story',W=1080,H=story?1920:1350;
 if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
 const t=theme, bg=gradient(t.background,t.background2,t.mixBackground);
 cx.clearRect(0,0,W,H);cx.fillStyle=t.background;cx.fillRect(0,0,W,H);
 const baseGradient=cx.createLinearGradient(0,0,W,H);baseGradient.addColorStop(0,t.background);baseGradient.addColorStop(1,t.background2);cx.fillStyle=baseGradient;cx.fillRect(0,0,W,H);
 cx.fillStyle=t.primary;cx.fillRect(0,0,14,150);
 textLine(el('advancedTitle').value||teamName(),58,77,962,55,'#fff');
 const secondary=(el('advancedSubtitle').value||'PARTIDO DE FUTBOLITO').toUpperCase();
 textLine(secondary,60,126,925,27,'#ded4e7');
 cx.fillStyle=t.primary;cx.fillRect(58,146,962,5);
 const imgTop=164,photoBottom=H-535,photoHeight=photoBottom-imgTop;
 currentPhotoRect={x:0,y:imgTop,w:W,h:photoHeight};
 if(img){
  const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
  const ratio=Math.max(W/iw,photoHeight/ih)*zoom;
  const dw=iw*ratio,dh=ih*ratio;
  const dx=(dw-W)*(panX+1)/2,dy=(dh-photoHeight)*(panY+1)/2;
  cx.save();cx.beginPath();cx.rect(0,imgTop,W,photoHeight);cx.clip();cx.drawImage(img,-dx,imgTop-dy,dw,dh);cx.restore();
 }else{
  cx.fillStyle='#293044';cx.fillRect(0,imgTop,W,photoHeight);
  textLine('📷 AGREGA TU FOTO',540,imgTop+photoHeight/2,800,53,'#d5c8e2','center');
 }
 const fade=cx.createLinearGradient(0,photoBottom-480,0,photoBottom);fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(1,'rgba(5,4,9,.95)');cx.fillStyle=fade;cx.fillRect(0,photoBottom-480,W,480);
 const boxY=photoBottom-210;
 cx.fillStyle='rgba(10,9,17,.76)';drawRound(42,boxY,996,202,24);cx.fill();
 cx.fillStyle=t.primary;drawRound(42,boxY,996,8,4);cx.fill();
 textLine(state.period===3?'RESULTADO FINAL':(state.period===1?'PRIMER TIEMPO':'SEGUNDO TIEMPO')+' · '+fmt(state.elapsed),540,boxY+47,900,30,'#eee1ff','center');
 textLine(teamName(),250,boxY+100,410,39,'#fff','center');
 textLine(el('awayName').value||'Rival',835,boxY+100,390,39,'#f1eeee','center');
 textLine(state.scores[0]+'  –  '+state.scores[1],540,boxY+184,850,103,'#fff','center',64,950);
 const footerY=photoBottom-1,footerH=H-footerY;
 cx.fillStyle='rgba(8,9,16,.97)';cx.fillRect(0,footerY,W,footerH);
 cx.fillStyle=t.primary;cx.fillRect(55,footerY+15,8,footerH-32);
 const goalsEnabled=el('advancedGoals').checked;
 const enabledStats=[['FALTAS',state.totalFouls],['AMARILLAS',[(state.cards||[]).filter(c=>c.team==='home').length,(state.cards||[]).filter(c=>c.team==='away').length]],['ROJAS',[(state.redCards||[]).filter(c=>c.team==='home').length,(state.redCards||[]).filter(c=>c.team==='away').length]]]
 .filter(([label])=>label==='FALTAS'?el('advancedFouls').checked:label==='AMARILLAS'?el('advancedYellows').checked:el('advancedReds').checked);
 const startY=footerY+49;
 if(goalsEnabled){
  textLine('⚽ GOLES',86,startY,780,38,t.primary);
  const goals=(state.goals||[]).slice().sort((a,b)=>((a.period||1)-(b.period||1))||((a.elapsedAt||0)-(b.elapsedAt||0)));
  const capacity=enabledStats.length?16:20;
  const show=goals.slice(0,capacity);
  if(!show.length)textLine('Sin goles registrados',90,startY+55,850,27,'#d3d3dc');
  else for(let i=0;i<show.length;i++){
   const g=show[i],col=i%2,row=Math.floor(i/2);
   const teamMin=fmt(g.elapsedAt||0);
   const prefix=(g.period===1?'1T':'2T')+' '+teamMin+' · '+(g.team==='home'?'LOC ':'VIS ');
   const name=g.team==='home'?eventName(g):'Gol visitante';
   textLine(prefix+name,85+col*500,startY+52+row*37,470,25,'#f5f1f8', 'left',19,740);
  }
  if(goals.length>capacity)textLine('+'+(goals.length-capacity)+' goles más',700,startY+10,260,22,'#d4c2e1','left');
 }
 if(enabledStats.length){
  const sy=H-112;
  cx.strokeStyle='#ffffff3b';cx.lineWidth=2;cx.beginPath();cx.moveTo(80,sy-25);cx.lineTo(1006,sy-25);cx.stroke();
  enabledStats.forEach(([label,counts],i)=>{
   const x=540+(i-(enabledStats.length-1)/2)*320;
   textLine(label,x,sy+14,270,25,'#bec3cf','center');
   textLine(String(counts[0])+' – '+String(counts[1]),x,sy+65,270,45,'#f9f8fd','center');
  });
 }
 cx.fillStyle=t.primary;cx.fillRect(0,H-13,W,13);
}
function updateAdvanced(){
 try{drawAdvancedPost();el('advancedStatus').textContent='Vista previa lista.';}
 catch(err){el('advancedStatus').textContent='No se pudo actualizar la imagen. Intenta con otra foto.';}
}
function updateSliders(){
 zoom=Number(el('advancedZoom').value)/100;panX=Number(el('advancedPanX').value)/100;panY=Number(el('advancedPanY').value)/100;
 el('advancedZoomValue').textContent=Math.round(zoom*100)+'%';
 el('advancedPanXValue').textContent=el('advancedPanX').value;
 el('advancedPanYValue').textContent=el('advancedPanY').value;
 updateAdvanced();
}
const fields=['advancedTitle','advancedSubtitle','advancedFormat','advancedGoals','advancedFouls','advancedYellows','advancedReds'];
for(const id of fields)el(id).addEventListener('input',updateAdvanced);
for(const id of ['advancedZoom','advancedPanX','advancedPanY'])el(id).addEventListener('input',updateSliders);
let touch=null;
cv.addEventListener('pointerdown',e=>{
 const rect=cv.getBoundingClientRect();const y=(e.clientY-rect.top)*cv.height/rect.height;
 if(y<currentPhotoRect.y||y>currentPhotoRect.y+currentPhotoRect.h||!img)return;
 touch={x:e.clientX,y:e.clientY,sx:panX,sy:panY};cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove',e=>{
 if(!touch||!img)return;
 const rect=cv.getBoundingClientRect(),dw=(img.naturalWidth||img.width)*Math.max(1080/(img.naturalWidth||img.width),currentPhotoRect.h/(img.naturalHeight||img.height))*zoom;
 const dh=(img.naturalHeight||img.height)*Math.max(1080/(img.naturalWidth||img.width),currentPhotoRect.h/(img.naturalHeight||img.height))*zoom;
 const dx=(e.clientX-touch.x)*1080/rect.width,dy=(e.clientY-touch.y)*cv.height/rect.height;
 panX=Math.min(1,Math.max(-1,touch.sx-2*dx/Math.max(1,dw-1080)));
 panY=Math.min(1,Math.max(-1,touch.sy-2*dy/Math.max(1,dh-currentPhotoRect.h)));
 el('advancedPanX').value=Math.round(panX*100);el('advancedPanY').value=Math.round(panY*100);
 el('advancedPanXValue').textContent=el('advancedPanX').value;el('advancedPanYValue').textContent=el('advancedPanY').value;
 updateAdvanced();
});
cv.addEventListener('pointerup',()=>touch=null);cv.addEventListener('pointercancel',()=>touch=null);
el('advancedPhoto').addEventListener('change',e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(!file.type.startsWith('image/')){el('advancedStatus').textContent='Selecciona una foto.';return;}
 if(file.size>25e6){el('advancedStatus').textContent='La foto es muy pesada; selecciona otra de menos de 25 MB.';return;}
 if(imgUrl)URL.revokeObjectURL(imgUrl);
 imgUrl=URL.createObjectURL(file);
 const candidate=new Image();candidate.onload=()=>{img=candidate;panX=panY=0;zoom=1;el('advancedZoom').value=100;el('advancedPanX').value=el('advancedPanY').value=0;updateSliders();URL.revokeObjectURL(imgUrl);imgUrl='';};
 candidate.onerror=()=>{el('advancedStatus').textContent='Formato no compatible; prueba con JPG o PNG.';URL.revokeObjectURL(imgUrl);imgUrl='';};candidate.src=imgUrl;
});
if(igTrigger)igTrigger.onclick=()=>{
 el('advancedTitle').value=teamName();
 updateAdvanced();postDialog.showModal();
};
el('advancedClose').onclick=()=>postDialog.close();
function asPng(){return new Promise((resolve,reject)=>{drawAdvancedPost();cv.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG no disponible')),'image/png');});}
el('advancedDownload').onclick=async()=>{
 try{const blob=await asPng(),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(isLarra?'larraguibel':'mala-clase')+'-resultado-instagram.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);el('advancedStatus').textContent='PNG listo para guardar o publicar.';}
 catch(e){el('advancedStatus').textContent='No se pudo guardar; intenta compartir.';}
};
el('advancedShare').onclick=async()=>{
 try{const blob=await asPng(),file=new File([blob],'resultado-futbolito.png',{type:'image/png'});
  if(navigator.canShare?.({files:[file]})&&navigator.share)await navigator.share({files:[file],title:teamName()});
  else el('advancedStatus').textContent='Tu navegador no permite compartir archivos; usa Guardar PNG.';
 }catch(e){if(e?.name!=='AbortError')el('advancedStatus').textContent='No se pudo compartir. Usa Guardar PNG.';}
};
})();
