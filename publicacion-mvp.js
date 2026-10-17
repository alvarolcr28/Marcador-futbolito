(function newMvp(){
 "use strict";
 const $=id=>document.getElementById(id);
 const share=$("fHubShare");
 if(!share||$("mvpPublicationDialog"))return;
 const trigger=document.createElement("button");
 trigger.type="button";trigger.className="fhub-opt";
 trigger.innerHTML="⭐ Publicación MVP<small>Foto del jugador y estadísticas reales, separadas de las del partido.</small>";
 ($("hubPhoto")||share.lastElementChild).insertAdjacentElement("afterend",trigger);
 const dialog=document.createElement("dialog");
 dialog.id="mvpPublicationDialog";dialog.className="fhub-dialog mvp-editor";
 dialog.innerHTML=`
 <div class="fhub-head"><h2>⭐ Publicación MVP</h2><button type="button" class="close" id="mvpClose">✕</button></div>
 <p class="fhub-small">Elige un jugador, carga su foto y selecciona un diseño. Solo aparecerán estadísticas individuales realmente registradas.</p>
 <div class="mvp-fields">
  <label class="fhub-field">Jugador<select id="mvpPlayer"></select></label>
  <label class="fhub-field">Foto (opcional)<input id="mvpPhoto" type="file" accept="image/png,image/jpeg,image/webp"></label>
  <label class="fhub-field">Título<input id="mvpTitle" maxlength="48" value="JUGADOR DEL PARTIDO"></label>
  <label class="fhub-field">Subtítulo<input id="mvpSubtitle" maxlength="48" placeholder="El destacado de la jornada"></label>
  <label class="fhub-field">Estilo<select id="mvpStyle"><option value="hero">1 · Protagonista</option><option value="editorial">2 · Editorial deportiva</option><option value="minimal">3 · Minimalista</option></select></label>
  <label class="fhub-field">Formato<select id="mvpFormat"><option value="post">Publicación 4:5</option><option value="story">Historia 9:16</option></select></label>
 </div>
 <label class="fhub-switch"><input id="mvpShowMatch" type="checkbox" checked> Mostrar datos colectivos del partido, en un bloque separado</label>
 <canvas id="mvpPreview" width="1080" height="1350" aria-label="Vista previa de publicación MVP"></canvas>
 <p id="mvpStatsHint" class="fhub-small" role="status"></p>
 <div class="fhub-actions"><button type="button" id="mvpDownload" class="btn primary">Guardar PNG</button><button type="button" id="mvpShare" class="btn">Compartir imagen</button></div>
 <p id="mvpStatus" class="fhub-small" role="status"></p>`;
 document.body.append(dialog);
 const style=document.createElement("style");
 style.textContent=".mvp-editor{width:min(650px,calc(100vw - 20px))}.mvp-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin:12px 0}.mvp-fields .fhub-field{min-width:0}.mvp-editor canvas{display:block;width:min(100%,390px);height:auto;margin:15px auto;border:1px solid #77849d;border-radius:9px;background:#131a2a;box-shadow:0 16px 28px #0008}.mvp-editor select,.mvp-editor input{font-size:15px}@media(max-width:500px){.mvp-fields{grid-template-columns:1fr}}";
 document.head.append(style);
 const cv=$("mvpPreview"),ctx=cv.getContext("2d");
 let image=null,objectUrl=null,roster=[],selected=null;
 const clean=x=>String(x??"").trim();
 const norm=x=>clean(x).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es").replace(/\s+/g," ");
 function players(){
  const r=typeof state!=="undefined"?state.teams?.[$("homeTeam")?.value]:null;
  return Array.isArray(r)?r.filter(a=>Array.isArray(a)&&a.length===2).map(a=>({number:clean(a[0]),name:clean(a[1]),label:"#"+clean(a[0])+" "+clean(a[1])})):[];
 }
 function exact(ref,p){
  if(!ref||!p)return false;
  const raw=norm(ref),match=raw.match(/^#?0*(\d{1,3})(?:\s+(.+))?$/);
  if(match&&String(Number(match[1]))===String(Number(p.number)))
   return !match[2]||norm(match[2])===norm(p.name);
  return raw===norm(p.name)||raw===norm(p.label);
 }
 function metrics(){
  const s=typeof state!=="undefined"?state:null;
  const goals=s?.goals||[],cards=s?.cards||[],reds=s?.redCards||[];
  return {
   goals:goals.filter(g=>g.team==="home"&&!g.ownGoal&&exact(g.scorer,selected)).length,
   assists:goals.filter(g=>g.team==="home"&&!g.ownGoal&&exact(g.assist,selected)).length,
   yellows:cards.filter(c=>c.team==="home"&&exact(c.player,selected)).length,
   reds:reds.filter(c=>c.team==="home"&&exact(c.player,selected)).length,
   played:!!s&&(s.period===3||s.elapsed>0||goals.length>0||cards.length>0||reds.length>0)
  };
 }
 function word(text,x,y,width,size,weight=800,align="left",color="#fff"){
  const t=clean(text);ctx.fillStyle=color;ctx.textAlign=align;
  while(size>20){ctx.font=weight+" "+size+"px system-ui,Arial,sans-serif";if(ctx.measureText(t).width<=width)break;size-=2}
  ctx.fillText(t,x,y,width);
 }
 function rounded(x,y,w,h,r){
  ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);
 }
 function drawPhoto(x,y,w,h){
  if(!image||!image.naturalWidth)return false;
  const sc=Math.max(w/image.naturalWidth,h/image.naturalHeight),iw=image.naturalWidth*sc,ih=image.naturalHeight*sc;
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  ctx.drawImage(image,x+(w-iw)/2,y+(h-ih)/2,iw,ih);ctx.restore();return true;
 }
 function draw(){
  if(!ctx)return;
  const W=1080,H=$("mvpFormat").value==="story"?1920:1350;
  if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}
  const mode=$("mvpStyle").value,primary=mode==="editorial"?"#3ce8b3":mode==="minimal"?"#d1dbec":"#b993fa";
  const bg=ctx.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,mode==="editorial"?"#174760":"#28223d");
  bg.addColorStop(.6,mode==="minimal"?"#18222b":"#11182a");
  bg.addColorStop(1,"#07111d");
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  ctx.fillStyle=primary;ctx.fillRect(mode==="editorial"?0:62,0,mode==="editorial"?15:6,H);
  if(mode==="editorial"){
   ctx.save();ctx.globalAlpha=.12;ctx.strokeStyle="#ffffff";
   for(let v=-400;v<2400;v+=92){ctx.beginPath();ctx.moveTo(v,0);ctx.lineTo(v+800,H);ctx.stroke()}
   ctx.restore();
  }
  word($("mvpTitle").value||"JUGADOR DEL PARTIDO",82,112,916,53,960);
  word(($("mvpSubtitle").value||"FUTBOLITO · DESTACADO").toUpperCase(),82,158,916,27,700,"left","#b8cadb");
  const frame={x:61,y:194,w:958,h:H===1920?945:652};
  ctx.fillStyle="#273d50";rounded(frame.x,frame.y,frame.w,frame.h,22);ctx.fill();
  ctx.save();rounded(frame.x,frame.y,frame.w,frame.h,22);ctx.clip();
  if(!drawPhoto(frame.x,frame.y,frame.w,frame.h)){
   const fg=ctx.createLinearGradient(0,frame.y,960,frame.y+frame.h);fg.addColorStop(0,"#41536d");fg.addColorStop(1,"#142437");
   ctx.fillStyle=fg;ctx.fillRect(frame.x,frame.y,frame.w,frame.h);
   word("FOTO DEL MVP",540,frame.y+frame.h*.49,850,57,900,"center","#b8cbce");
  }
  const fade=ctx.createLinearGradient(0,frame.y+frame.h*.4,0,frame.y+frame.h);
  fade.addColorStop(0,"#070b1100");fade.addColorStop(1,"#01050aef");
  ctx.fillStyle=fade;ctx.fillRect(frame.x,frame.y,frame.w,frame.h);ctx.restore();
  if(selected){
   word(selected.name.toUpperCase(),91,frame.y+frame.h-85,735,70,960);
   word("DORSAL "+selected.number,94,frame.y+frame.h-36,720,31,800,"left","#cbd8e4");
   ctx.fillStyle=primary;rounded(850,frame.y+frame.h-161,126,109,18);ctx.fill();
   word(selected.number,913,frame.y+frame.h-83,116,73,950,"center","#101522");
  }else word("SELECCIONA UN JUGADOR",540,frame.y+frame.h-65,870,42,900,"center");
  const stats=metrics(),statsY=frame.y+frame.h+35;
  word("ESTADÍSTICAS DEL MVP",83,statsY+17,890,28,870,"left","#c5d4e7");
  const values=[["GOLES",stats.goals],["ASISTENCIAS",stats.assists],["AMARILLAS",stats.yellows],["ROJAS",stats.reds]].filter(t=>t[1]>0);
  if(values.length){
   const cw=928/values.length;
   values.forEach(([name,value],i)=>{
    const x=74+(i+.5)*cw;
    word(value,x,statsY+112,cw-12,76,950,"center",primary);
    word(name,x,statsY+148,cw-14,26,850,"center","#e5edfa");
   });
  }else word("Sin estadísticas individuales registradas",84,statsY+95,900,30,700,"left","#d0dce8");
  if($("mvpShowMatch").checked&&stats.played&&typeof state!=="undefined"){
   const y=H===1920?1665:1145,h=H===1920?194:160;
   ctx.fillStyle="#061523ec";rounded(64,y,952,h,15);ctx.fill();
   ctx.strokeStyle="#49617c";ctx.lineWidth=2;ctx.stroke();
   word("DATOS DEL PARTIDO · AMBOS EQUIPOS",89,y+39,902,23,860,"left","#9fced5");
   const home=$("homeTeam")?.value||"Local",away=$("awayName")?.value||"Rival";
   word(home+"  "+(state.scores||[0,0]).join(" – ")+"  "+away,89,y+90,904,33,950);
   const details=[];
   if(Array.isArray(state.totalFouls))details.push("Faltas: "+state.totalFouls.join(" – "));
   if(state.cards?.length)details.push("Amarillas: "+["home","away"].map(team=>state.cards.filter(c=>c.team===team).length).join(" – "));
   if(state.redCards?.length)details.push("Rojas: "+["home","away"].map(team=>state.redCards.filter(c=>c.team===team).length).join(" – "));
   word(details.join("   ·   "),89,y+(H===1920?144:135),890,23,700,"left","#c6d7e3");
  }
  ctx.fillStyle=primary;ctx.fillRect(0,H-12,W,12);
  $("mvpStatsHint").textContent=values.length
   ?"Estadísticas individuales del jugador: "+values.map(v=>v[1]+" "+v[0].toLowerCase()).join(", ")+"."
   :"No hay estadísticas individuales registradas para este jugador; no se muestran ceros ni valores inventados.";
 }
 function open(){
  share.close();roster=players();
  $("mvpPlayer").replaceChildren();
  if(roster.length)roster.forEach((p,i)=>$("mvpPlayer").add(new Option(p.label,String(i))));
  else $("mvpPlayer").add(new Option("Sin jugadores registrados",""));
  selected=roster[0]||null;
  $("mvpTitle").value="JUGADOR DEL PARTIDO";
  $("mvpSubtitle").value="";$("mvpShowMatch").checked=true;
  $("mvpStatus").textContent="";draw();dialog.showModal();
 }
 function status(msg,error=false){$("mvpStatus").textContent=msg;$("mvpStatus").style.color=error?"#ffb0ae":"#d2f0e2"}
 async function blob(){draw();return new Promise((ok,no)=>cv.toBlob(b=>b?ok(b):no(Error("No se pudo generar la imagen")),"image/png"))}
 trigger.addEventListener("click",open);
 $("mvpClose").addEventListener("click",()=>dialog.close());
 dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
 $("mvpPlayer").addEventListener("change",()=>{selected=roster[Number($("mvpPlayer").value)]||null;draw()});
 for(const id of ["mvpTitle","mvpSubtitle","mvpStyle","mvpFormat","mvpShowMatch"])$(id).addEventListener("input",draw);
 $("mvpPhoto").addEventListener("change",e=>{
  const f=e.target.files?.[0];if(!f)return;
  if(!["image/png","image/jpeg","image/webp"].includes(f.type)||f.size>12*1024*1024){status("Usa JPG, PNG o WebP de hasta 12 MB",true);return}
  if(objectUrl)URL.revokeObjectURL(objectUrl);
  objectUrl=URL.createObjectURL(f);
  const loaded=new Image();
  loaded.onload=()=>{image=loaded;URL.revokeObjectURL(objectUrl);objectUrl=null;draw()};
  loaded.onerror=()=>{status("No se pudo abrir la foto",true);URL.revokeObjectURL(objectUrl);objectUrl=null};
  loaded.src=objectUrl;
 });
 $("mvpDownload").addEventListener("click",async()=>{
  try{
   const b=await blob(),url=URL.createObjectURL(b),a=document.createElement("a");
   a.href=url;a.download="futbolito-mvp.png";document.body.append(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),15000);status("Imagen lista para guardar o publicar.")
  }catch(e){status(e.message,true)}
 });
 $("mvpShare").addEventListener("click",async()=>{
  try{
   const b=await blob(),file=new File([b],"futbolito-mvp.png",{type:"image/png"});
   if(navigator.canShare?.({files:[file]})&&navigator.share)await navigator.share({files:[file],title:"MVP Futbolito"});
   else status("Para este navegador usa Guardar PNG.",true)
  }catch(e){if(e.name!=="AbortError")status(e.message,true)}
 });
})();