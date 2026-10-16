/* Extensiones para ambos clubes. El partido original y el Control rápido comparten estado. */
(()=>{
'use strict';
const get=id=>document.getElementById(id);
if(!get('halfMinutes')||!get('yellowDialog')||!get('confirmYellow'))return;
const style=document.createElement('style');
style.textContent=`
/* Duración editable en Configuración */
.duration-setup{margin-top:16px;padding:14px;border:1px solid #ffffff30;border-radius:12px;background:#101923}
.duration-setup>label{display:block;font-weight:850;font-size:15px;margin-bottom:9px;color:#f2eef6}
.duration-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.duration-row input.minutes{width:104px;min-height:49px;min-width:100px;padding:10px 12px;font-size:21px;font-weight:850;text-align:center;border:2px solid var(--green);border-radius:11px;background:#121923;color:#fff;position:static}
.duration-row span{font-weight:750;color:#d2cbd9;font-size:15px}
.duration-setup .note{margin-top:8px}
/* Casilla de contabilización de faltas en amarillas y rojas */
.card-foul-option{display:flex;align-items:center;gap:12px;padding:14px 12px;border:1px solid #c4a15588;border-radius:12px;background:#332816;margin-top:14px;cursor:pointer;min-height:62px}
.card-foul-option input[type=checkbox]{flex:0 0 24px;width:24px;height:24px;accent-color:#ffe08b;cursor:pointer}
.card-foul-option strong{display:block;font-size:15px;color:#fff0c3}
.card-foul-option small{display:block;font-size:12px;color:#ead6a2;margin-top:4px}
/* Acceso a la gráfica de redes sociales */
.iconbtn.instagram-post{background:#332140;color:#ffe9f5;border:1px solid #cc8fd8;line-height:1;font-size:23px}
.iconbtn.instagram-post:hover{filter:brightness(1.18)}
#igDialog{max-width:590px;width:calc(100% - 16px);padding:16px;border:1px solid #8f709c;max-height:96dvh;overflow-y:auto}
.ig-subtitle{font-size:12px;color:#c8c5cf;line-height:1.5;margin:2px 0 12px}
.ig-controls{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:10px}
.ig-controls .field{min-width:0}
.ig-controls input[type=file]{padding:9px 4px;color:#f7f4fa;font-size:12px;min-width:0}
.ig-controls label{font-size:12px;color:#c5c7d1;display:block;margin:0 0 6px}
.ig-controls input[type=text]{border:1px solid #5a4c68;background:#121820;color:#fff;padding:11px 10px;width:100%;border-radius:9px;font-size:14px}
#igCanvas{width:min(100%,430px);height:auto;aspect-ratio:4/5;display:block;margin:10px auto 12px;border:1px solid #826d8d;border-radius:9px;background:#10111a;box-shadow:0 7px 26px #0008}
.ig-buttons{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.ig-buttons .btn{min-height:48px;font-size:13px}
.ig-tip{font-size:12px;color:#c5c8ce;line-height:1.5;margin-top:9px}
.ig-status{min-height:18px;color:#d7f7e2;font-size:12px;margin-top:6px}
@media(max-width:450px){.ig-controls{grid-template-columns:1fr}.ig-buttons{grid-template-columns:1fr 1fr}#igDialog{padding:11px}.duration-setup{padding:12px}}
`;
document.head.appendChild(style);

// Desplazar físicamente el campo existente; no se crea un segundo valor ni contador.
const duration=document.querySelector('section.timer .clock-settings');
const config=document.querySelector('details.config-fold > section.panel');
if(duration&&config){
 const input=get('halfMinutes');
 const group=document.createElement('div');group.className='duration-setup';
 const label=document.createElement('label');label.htmlFor='halfMinutes';label.textContent='⏱️ Duración de cada tiempo';
 const row=document.createElement('div');row.className='duration-row';
 const unit=document.createElement('span');unit.textContent='minutos (por tiempo)';
 row.append(input,unit);group.append(label,row);
 const note=document.createElement('p');note.className='note';note.textContent='Modifica los minutos desde aquí. El reloj principal se mantiene despejado.';
 group.append(note);
 config.insertBefore(group,config.querySelector('.roster-tools'));
 duration.remove();
}

// Anotar una tarjeta puede contar opcionalmente como una falta del mismo equipo/tiempo.
const hint=get('cardDialogHint');
const option=document.createElement('label');option.className='card-foul-option';option.htmlFor='cardCountsAsFoul';
option.innerHTML='<input type="checkbox" id="cardCountsAsFoul"><span><strong>🚩 ¿Contabilizar también una falta?</strong><small>Márcalo si la jugada suma una falta. Se reflejará en el tiempo actual y el acumulado.</small></span>';
hint.insertAdjacentElement('afterend',option);
const cardFoulCheckbox=get('cardCountsAsFoul');
const originalOpenYellow=openYellow;
openYellow=function(team,kind='yellow'){
 cardFoulCheckbox.checked=false;
 return originalOpenYellow(team,kind);
};
function revertCardFoul(card){
 if(!card?.foulCounted)return;
 const side=card.team==='home'?0:1;
 if(state.period===card.period&&state.periodFouls[side]>0)state.periodFouls[side]--;
 if(state.totalFouls[side]>0)state.totalFouls[side]--;
 card.foulCounted=false;
}
const originalConfirmCard=get('confirmYellow').onclick;
get('confirmYellow').onclick=function(ev){
 const side=get('yellowTeam').value;
 const kind=cardKind;
 const collection=kind==='red'?state.redCards:state.cards;
 const before=collection.length;
 originalConfirmCard.call(this,ev);
 if(collection.length!==before+1)return; // Validación fallida: no registrar falta.
 const record=collection[collection.length-1];
 if(!cardFoulCheckbox.checked)return;
 const idx=side==='home'?0:1;
 const oldUndo=actionUndo;
 record.foulCounted=true;
 state.periodFouls[idx]++;
 state.totalFouls[idx]++;
 render();
 setLastAction((kind==='red'?'🟥 Roja':'🟨 Amarilla')+' y 🚩 falta para '+record.player+'.',()=>{
   revertCardFoul(record);
   if(typeof oldUndo==='function')oldUndo();
   else {const i=collection.indexOf(record);if(i>=0)collection.splice(i,1);render();}
 });
};
// Si se elimina una tarjeta del historial también se revierte la falta asociada.
const oldRenderCards=renderCards;
renderCards=function(){
 oldRenderCards();
 get('yellowList').querySelectorAll('.yellow-card').forEach((row,i)=>{
   const c=state.cards[i];if(!c)return;
   if(c.foulCounted)row.querySelector('small').textContent+=' · Falta contabilizada';
   const btn=row.querySelector('button');if(!btn)return;
   const old=btn.onclick;
   btn.onclick=e=>{revertCardFoul(c);old?.call(btn,e);};
 });
};
const oldRenderRedCards=renderRedCards;
renderRedCards=function(){
 oldRenderRedCards();
 get('redList').querySelectorAll('.yellow-card').forEach((row,i)=>{
   const c=state.redCards[i];if(!c)return;
   if(c.foulCounted)row.querySelector('small').textContent+=' · Falta contabilizada';
   const btn=row.querySelector('button');if(!btn)return;
   const old=btn.onclick;
   btn.onclick=e=>{revertCardFoul(c);old?.call(btn,e);};
 });
};

// El resumen mantiene eventos, faltas y goleadores, pero quita el texto redundante 2 × 25 min.
const oldFormatSummary=formatMatchSummary;
formatMatchSummary=function(m){
 const base=oldFormatSummary(m);
 const time=m.period===3?'⏱️ Partido finalizado · segundo tiempo terminado':
  '⏱️ '+(m.period===1?'Primer tiempo':'Segundo tiempo')+' · minuto '+fmt(m.elapsed||0);
 return base.replace(/^⏱️[^\n]*/m,time);
};

// Diseñador de post para Instagram. Generación local con Canvas, no sube fotos ni publica en redes.
const igBtn=document.createElement('button');
igBtn.id='openInstagramPost';igBtn.type='button';igBtn.className='iconbtn instagram-post';
igBtn.textContent='📸';igBtn.title='Crear post de Instagram';igBtn.setAttribute('aria-label','Crear imagen para Instagram');
get('shareBtn').insertAdjacentElement('beforebegin',igBtn);
const igDialog=document.createElement('dialog');igDialog.id='igDialog';
igDialog.innerHTML=`
 <div class="modal-head"><h2>📸 Crear post de Instagram</h2><button class="close" type="button" id="closeIgDialog" aria-label="Cerrar">✕</button></div>
 <p class="ig-subtitle">Carga una foto desde tu galería. La imagen incluirá automáticamente el resultado, goleadores y estadísticas de este partido.</p>
 <div class="ig-controls">
  <div class="field"><label for="igPhoto">Foto del partido</label><input id="igPhoto" type="file" accept="image/*" aria-label="Subir foto desde galería"></div>
  <div class="field"><label for="igHeadline">Texto destacado</label><input id="igHeadline" type="text" maxlength="32" value="DÍA DE PARTIDO"></div>
 </div>
 <canvas id="igCanvas" width="1080" height="1350" aria-label="Vista previa del post vertical de Instagram">Tu navegador necesita Canvas para generar el post.</canvas>
 <div class="ig-buttons"><button type="button" id="igSave" class="btn primary">⬇ Guardar imagen PNG</button><button type="button" id="igShare" class="btn">↗ Compartir imagen</button></div>
 <div id="igStatus" class="ig-status" role="status" aria-live="polite"></div>
 <div class="ig-tip">Formato vertical 1080 × 1350 px (4:5). La foto permanece en tu dispositivo. Instagram no se publica automáticamente: comparte o guarda el PNG y súbelo desde la aplicación.</div>
`;
document.body.appendChild(igDialog);
let picture=null;
let pendingImageURL='';
const igCanvas=get('igCanvas');
const ctx=igCanvas.getContext('2d');
const isLarraguibel=document.title.toLowerCase().includes('larraguibel')||teamName()==='Larraguibel';
const accent=isLarraguibel?'#ee3c4f':'#b383ec';
const accentSoft=isLarraguibel?'#ff919b':'#e3bcff';
const darkBase=isLarraguibel?'#130b0f':'#130f1d';
function fitText(text,maxWidth,fontSize=46,minSize=22,weight='900'){
 let size=fontSize;
 do{ctx.font=`${weight} ${size}px system-ui, -apple-system, sans-serif`;if(ctx.measureText(text).width<=maxWidth)break;size-=2;}while(size>minSize);
 return size;
}
function drawContainLine(text,x,y,width,size=43,color='#fff',align='left'){
 const t=String(text||'');ctx.fillStyle=color;fitText(t,width,size,20);ctx.textAlign=align;ctx.fillText(t,x,y,width);
}
function roundedRect(x,y,w,h,r=18){
 ctx.beginPath();
 if(typeof ctx.roundRect==='function')ctx.roundRect(x,y,w,h,r);
 else {ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
}
function drawPhotoCover(image,x,y,w,h){
 const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
 const ratio=Math.max(w/iw,h/ih),dw=iw*ratio,dh=ih*ratio;
 ctx.drawImage(image,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
}
function countCards(cards,team){return (cards||[]).filter(c=>c.team===team).length;}
function scorerLines(){
 const records=state.goals.filter(g=>g.team==='home');
 if(!records.length)return ['Aún sin goles locales registrados'];
 const grouped=new Map();
 for(const g of records){
  const label=g.ownGoal?'Autogol':(g.scorer||'Autor no registrado');
  grouped.set(label,(grouped.get(label)||0)+1);
 }
 const results=[...grouped].map(([name,num])=>name+(num>1?' ×'+num:''));
 return results.length>3?[...results.slice(0,2),`+ ${results.length-2} más`]:results;
}
function drawPost(){
 if(!ctx)return;
 const W=1080,H=1350;ctx.clearRect(0,0,W,H);ctx.textBaseline='alphabetic';
 const base=ctx.createLinearGradient(0,0,W,H);base.addColorStop(0,darkBase);base.addColorStop(.64,'#0b0f18');base.addColorStop(1,'#20202a');ctx.fillStyle=base;ctx.fillRect(0,0,W,H);
 if(picture){ctx.save();ctx.beginPath();ctx.rect(0,180,W,795);ctx.clip();drawPhotoCover(picture,0,180,W,795);ctx.restore();}
 else{
  ctx.save();ctx.globalAlpha=.16;ctx.strokeStyle=accent;ctx.lineWidth=8;ctx.strokeRect(110,240,860,580);ctx.beginPath();ctx.ellipse(540,520,140,140,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(540,240);ctx.lineTo(540,820);ctx.stroke();ctx.restore();
  drawContainLine('TU FOTO AQUÍ',540,570,630,54,'#d6cbd9','center');
 }
 const fade=ctx.createLinearGradient(0,190,0,990);fade.addColorStop(0,'rgba(5,8,15,.24)');fade.addColorStop(.3,'rgba(5,8,15,0)');fade.addColorStop(.66,'rgba(5,8,15,.62)');fade.addColorStop(1,'#0d1018');ctx.fillStyle=fade;ctx.fillRect(0,180,W,810);
 ctx.fillStyle=darkBase;ctx.fillRect(0,0,W,190);
 ctx.fillStyle=accent;ctx.fillRect(0,0,16,190);ctx.fillRect(68,168,940,5);
 drawContainLine(get('igHeadline').value.trim().toUpperCase()||'DÍA DE PARTIDO',70,84,925,50,accentSoft);
 const date=new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'long',year:'numeric'}).format(new Date()).toUpperCase();
 drawContainLine(date,70,137,820,27,'#c7c9d2');
 const label=state.period===3?'RESULTADO FINAL':state.period===1?`PRIMER TIEMPO · ${fmt(state.elapsed)}`:`SEGUNDO TIEMPO · ${fmt(state.elapsed)}`;
 ctx.fillStyle='rgba(10,12,20,.80)';roundedRect(52,654,976,306,28);ctx.fill();
 ctx.fillStyle=accent;roundedRect(52,654,976,10,5);ctx.fill();
 drawContainLine(label,540,714,860,31,accentSoft,'center');
 const h=teamName(),a=get('awayName').value.trim()||'Rival';
 drawContainLine(h.toUpperCase(),280,778,405,36,'#fff','center');
 drawContainLine(a.toUpperCase(),800,778,405,36,'#d7dce5','center');
 ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='950 126px ui-monospace,Consolas,monospace';ctx.fillText(`${state.scores[0]}  –  ${state.scores[1]}`,540,912,815);
 ctx.fillStyle='#0d1018';ctx.fillRect(0,976,1080,374);
 ctx.fillStyle=accent;ctx.fillRect(60,998,7,150);
 drawContainLine('⚽ GOLEADORES LOCALES',88,1046,850,36,accentSoft);
 const scorers=scorerLines();
 for(let i=0;i<Math.min(3,scorers.length);i++){
  drawContainLine(scorers[i],92,1095+i*40,892,30,'#f3f3f7');
 }
 const baseY=1230;ctx.strokeStyle='#ffffff22';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(60,baseY-40);ctx.lineTo(1020,baseY-40);ctx.stroke();
 const stats=[['FALTAS',`${state.totalFouls[0]} – ${state.totalFouls[1]}`],['AMARILLAS',`${countCards(state.cards,'home')} – ${countCards(state.cards,'away')}`],['ROJAS',`${countCards(state.redCards,'home')} – ${countCards(state.redCards,'away')}`]];
 stats.forEach(([label,num],i)=>{const x=185+i*352;drawContainLine(label,x,1232,294,27,'#afb8c4','center');drawContainLine(num,x,1285,288,45,'#ffffff','center');});
 ctx.fillStyle=accent;ctx.fillRect(0,1333,W,17);
}
function updatePost(){try{drawPost();get('igStatus').textContent='Vista previa lista para descargar.';}catch(e){get('igStatus').textContent='No fue posible generar la imagen. Prueba con otra foto.';}}
get('openInstagramPost').onclick=()=>{drawPost();igDialog.showModal();};
get('closeIgDialog').onclick=()=>igDialog.close();
get('igHeadline').addEventListener('input',updatePost);
get('igPhoto').addEventListener('change',function(){
 const file=this.files?.[0];if(!file)return;
 if(!file.type.startsWith('image/')){get('igStatus').textContent='Selecciona una imagen de tu galería.';return;}
 if(file.size>25*1024*1024){get('igStatus').textContent='La imagen supera 25 MB. Selecciona una foto más pequeña.';return;}
 if(pendingImageURL)URL.revokeObjectURL(pendingImageURL);
 pendingImageURL=URL.createObjectURL(file);
 const img=new Image();
 img.onload=()=>{picture=img;updatePost();URL.revokeObjectURL(pendingImageURL);pendingImageURL='';};
 img.onerror=()=>{get('igStatus').textContent='El formato de esta foto no se pudo abrir. Prueba con JPG o PNG.';URL.revokeObjectURL(pendingImageURL);pendingImageURL='';};
 img.src=pendingImageURL;
});
function pngBlob(){return new Promise((resolve,reject)=>igCanvas.toBlob(blob=>blob?resolve(blob):reject(new Error('No se pudo exportar PNG')),'image/png'));}
get('igSave').onclick=async()=>{
 try{
  drawPost();const blob=await pngBlob(),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='futbolito-'+(isLarraguibel?'larraguibel':'mala-clase')+'-resultado.png';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  get('igStatus').textContent='Imagen generada. Si tu iPhone la abre, mantén pulsada la imagen y elige Guardar en Fotos.';
 }catch(e){get('igStatus').textContent='No fue posible descargar la imagen. Intenta compartirla.';}
};
get('igShare').onclick=async()=>{
 try{
  drawPost();const blob=await pngBlob();const name='futbolito-resultado.png';
  const file=new File([blob],name,{type:'image/png'});
  if(navigator.share && navigator.canShare?.({files:[file]})){
   await navigator.share({files:[file],title:teamName()+' vs '+(get('awayName').value||'Rival')});
   get('igStatus').textContent='Imagen enviada al menú para compartir.';
  }else get('igStatus').textContent='Tu navegador no permite compartir imágenes directamente. Usa «Guardar imagen PNG» y súbela a Instagram.';
 }catch(e){if(e?.name!=='AbortError')get('igStatus').textContent='No se pudo compartir la imagen. Puedes guardarla como PNG.';}
};
})();
