(function pregameEditor(){
 "use strict";
 const $=id=>document.getElementById(id);
 const trigger=$("hubSocialPregame");
 if(!trigger||$("pregameDesignDialog"))return;
 const dialog=document.createElement("dialog");
 dialog.id="pregameDesignDialog";
 dialog.className="fhub-dialog pgame-dialog";
 dialog.setAttribute("aria-label","Diseñar publicación pre partido");
 dialog.innerHTML=`
 <div class="fhub-head"><h2>📣 Anuncio pre partido</h2><button type="button" class="close" id="pgClose" aria-label="Cerrar editor">✕</button></div>
 <p class="fhub-small">Diseña un anuncio deportivo tipo previa televisiva. La fotografía y los escudos se mantienen en este dispositivo: no se suben al servidor.</p>
 <div class="pg-fields">
  <label class="fhub-field" style="grid-column:1/-1">📅 Encuentro programado<select id="pgFixture"><option value="">Completar manualmente</option></select></label>
  <p class="fhub-small" role="status" id="pgFixtureHint" style="grid-column:1/-1;margin:0">Selecciona un encuentro o introduce datos manualmente.</p>
  <label class="fhub-field">Título principal<input id="pgTitle" maxlength="60" value="PRÓXIMO PARTIDO"></label>
  <label class="fhub-field">Torneo / competencia<input id="pgCompetition" maxlength="70" placeholder="Copa Mala Clase"></label>
  <label class="fhub-field">Equipo local<input id="pgHome" maxlength="40"></label>
  <label class="fhub-field">Equipo visitante<input id="pgAway" maxlength="40"></label>
  <label class="fhub-field">Fecha<input type="date" id="pgDate"></label>
  <label class="fhub-field">Hora<input type="time" id="pgTime"></label>
  <label class="fhub-field">Sede / cancha<input id="pgVenue" maxlength="70" placeholder="Cancha principal"></label>
  <label class="fhub-field">Texto opcional<input id="pgTagline" maxlength="54" placeholder="¡Nos vemos en la cancha!"></label>
  <label class="fhub-field">Formato<select id="pgFormat"><option value="post">Publicación 4:5</option><option value="story">Historia 9:16</option></select></label>
  <label class="fhub-field">Estilo<select id="pgTheme"><option value="broadcast">Transmisión deportiva</option><option value="stadium">Noche de estadio</option><option value="editorial">Editorial minimalista</option></select></label>
 </div>
 <div class="pg-assets">
  <label class="fhub-field">📷 Fotografía de fondo<input id="pgBackground" type="file" accept="image/jpeg,image/png,image/webp"></label>
  <label class="fhub-field">🛡 Escudo local<input id="pgLogoHome" type="file" accept="image/jpeg,image/png,image/webp"></label>
  <label class="fhub-field">🛡 Escudo visitante<input id="pgLogoAway" type="file" accept="image/jpeg,image/png,image/webp"></label>
 </div>
 <p class="fhub-small" id="pgHomeLogoInfo">El escudo local predeterminado se recupera de Ajustes, si está guardado. Si falta algún escudo, se muestran las iniciales del equipo.</p>
 <div class="pg-panel">
  <label class="fhub-field">Elemento que deseas ajustar
   <select id="pgLayer"><option value="background">Foto de fondo</option><option value="home">Escudo local</option><option value="away">Escudo visitante</option></select>
  </label>
  <div class="pg-sliders">
   <label class="fhub-field">Tamaño / zoom <input type="range" id="pgScale" min="50" max="250" value="100" step="1"><output id="pgScaleOut">100%</output></label>
   <label class="fhub-field">Giro <input type="range" id="pgRotation" min="-180" max="180" value="0" step="1"><output id="pgRotationOut">0°</output></label>
   <label class="fhub-field">Posición horizontal <input type="range" id="pgX" min="0" max="100" value="50" step="1"><output id="pgXOut">50%</output></label>
   <label class="fhub-field">Posición vertical <input type="range" id="pgY" min="0" max="100" value="50" step="1"><output id="pgYOut">50%</output></label>
  </div>
  <div class="pg-help"><strong>🤏 Para editar la imagen:</strong> mueve, amplía y gira con <strong>dos dedos</strong> sobre la vista previa. Con <strong>uno</strong> puedes deslizar la página. En computador, utiliza los controles de arriba.</div>
  <div class="fhub-actions"><button class="btn" id="pgResetLayer" type="button">↻ Centrar elemento seleccionado</button><button class="btn" id="pgRemoveLayer" type="button">Quitar imagen seleccionada</button></div>
 </div>
 <canvas id="pgCanvas" width="1080" height="1350" aria-label="Vista previa ajustable del anuncio pre partido"></canvas>
 <div class="fhub-actions"><button type="button" class="btn primary" id="pgDownload">⬇ Guardar PNG</button><button type="button" class="btn" id="pgShare">Compartir imagen</button></div>
 <p class="fhub-small" id="pgStatus" role="status" aria-live="polite"></p>`;
 document.body.append(dialog);
 const style=document.createElement("style");
 style.textContent=`
 .pgame-dialog{width:min(690px,calc(100vw - 14px));padding:16px;max-height:94dvh;overflow-y:auto;overscroll-behavior:contain}
 .pgame-dialog .pg-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 12px}
 .pgame-dialog .pg-assets{display:grid;grid-template-columns:1fr;gap:9px;margin-top:15px}
 .pgame-dialog .pg-assets input[type=file]{font-size:13px}
 .pgame-dialog .pg-panel{background:#141e2e;border:1px solid #50647b;border-radius:13px;padding:13px;margin-top:13px}
 .pgame-dialog .pg-sliders{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 15px;margin:11px 0}
 .pgame-dialog .pg-sliders label{font-size:12px}
 .pgame-dialog .pg-sliders input[type=range]{width:100%;height:29px;accent-color:#9fd8c2}
 .pgame-dialog .pg-sliders output{font-size:11px;color:#c6d3e1}
 .pgame-dialog .pg-help{font-size:12px;line-height:1.55;color:#d2e9dc;background:#173132;border:1px solid #426b65;border-radius:10px;padding:11px}
 #pgCanvas{display:block;width:min(100%,430px);height:auto;border-radius:12px;border:1px solid #6a7790;
  margin:16px auto;background:#142032;touch-action:pan-y;user-select:none;-webkit-user-select:none}
 .pgame-dialog .fhub-actions button{min-height:45px}
 @media(max-width:520px){.pgame-dialog .pg-fields,.pgame-dialog .pg-sliders{grid-template-columns:1fr}.pgame-dialog{padding:11px}}
 `;
 document.head.append(style);
 const canvas=$("pgCanvas"),cx=canvas.getContext("2d");
 const images={background:null,home:null,away:null};
 const urls={background:null,home:null,away:null};
 const defaults={background:{x:.5,y:.5,scale:1,angle:0},
   home:{x:.235,y:.50,scale:1,angle:0},
   away:{x:.765,y:.50,scale:1,angle:0}};
 const layers=JSON.parse(JSON.stringify(defaults));
 let gesture=null,activeLayer="background";
 const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
 const clean=x=>String(x??"").trim();
 const available=()=>typeof state!=="undefined";
 const localName=()=>($("homeTeam")?.value||"LOCAL");
 const awayName=()=>($("awayName")?.value||"VISITA");
 const accent=()=>{
  const color=getComputedStyle(document.documentElement).getPropertyValue("--green").trim();
  return /^#[0-9a-f]{3,8}$/i.test(color)?color:"#a38ff3";
 };
 function initials(name){
  const words=clean(name).replace(/[.,]/g," ").split(/[\s/&+]+/)
   .filter(w=>w && !["DE","DEL","LA","EL","LOS","LAS","Y","E","AND","FC","F","C"].includes(w.toUpperCase()));
  return (words.length>=2?words[0][0]+words[words.length-1][0]:(words[0]||"FC").slice(0,3)).toUpperCase();
 }
 function label(text,x,y,maxWidth,size=35,color="#fff",align="center",weight=850){
  const t=clean(text);if(!t)return;
  cx.fillStyle=color;cx.textAlign=align;
  while(size>19){cx.font=weight+" "+size+"px system-ui,Arial,sans-serif";
   if(cx.measureText(t).width<=maxWidth)break;size-=2;}
  cx.fillText(t,x,y,maxWidth);
 }
 function round(x,y,w,h,r=18){
  cx.beginPath();if(cx.roundRect)cx.roundRect(x,y,w,h,r);else cx.rect(x,y,w,h);
 }
 function drawBackground(W,H){
  const theme=$("pgTheme").value;
  const gradient=cx.createLinearGradient(0,0,W,H);
  if(theme==="stadium"){gradient.addColorStop(0,"#1c3550");gradient.addColorStop(.5,"#11192d");gradient.addColorStop(1,"#050a18");}
  else if(theme==="editorial"){gradient.addColorStop(0,"#202c3c");gradient.addColorStop(.6,"#101825");gradient.addColorStop(1,"#0b121d");}
  else{gradient.addColorStop(0,"#182940");gradient.addColorStop(.5,"#172b36");gradient.addColorStop(1,"#080e1a");}
  cx.fillStyle=gradient;cx.fillRect(0,0,W,H);
  const img=images.background;
  if(img&&img.naturalWidth&&img.naturalHeight){
   const a=layers.background,rad=a.angle*Math.PI/180,
   cos=Math.abs(Math.cos(rad)),sin=Math.abs(Math.sin(rad));
   const iw=img.naturalWidth,ih=img.naturalHeight;
   const cover=Math.max((W*cos+H*sin)/iw,(H*cos+W*sin)/ih)*a.scale;
   const dw=iw*cover,dh=ih*cover;
   cx.save();cx.beginPath();cx.rect(0,0,W,H);cx.clip();
   cx.translate(W*a.x,H*a.y);cx.rotate(rad);
   cx.drawImage(img,-dw/2,-dh/2,dw,dh);cx.restore();
  }else{
   cx.save();cx.strokeStyle="#ffffff21";cx.lineWidth=4;
   for(let j=0;j<6;j++){cx.beginPath();cx.arc(W/2,H*.48,j*135+65,0,2*Math.PI);cx.stroke();}
   cx.restore();
  }
  const veil=cx.createLinearGradient(0,0,0,H);
  veil.addColorStop(0,"#050c19df");veil.addColorStop(.29,"#04091396");
  veil.addColorStop(.55,"#040916a4");veil.addColorStop(1,"#030713f5");
  cx.fillStyle=veil;cx.fillRect(0,0,W,H);
  if(theme==="stadium"){
   cx.fillStyle="#00000052";cx.fillRect(0,H*.4,W,H*.30);
   cx.fillStyle=accent();cx.fillRect(0,0,15,H);
  }else if(theme==="broadcast"){
   cx.fillStyle=accent();cx.fillRect(0,0,17,H);
   cx.fillStyle="#101b2eea";cx.fillRect(0,H*.365,W,H*.275);
   cx.fillStyle=accent();cx.fillRect(70,H*.36,W-140,7);
  }else{cx.fillStyle=accent();cx.fillRect(72,H*.29,W-144,5);}
 }
 function paintCrest(side,W,H,showHandles){
  const a=layers[side],img=images[side];
  const base=Math.min(W*.26,H*.18);
  const size=base*a.scale,x=W*a.x,y=H*a.y;
  cx.save();cx.translate(x,y);cx.rotate(a.angle*Math.PI/180);
  cx.shadowColor="#00000091";cx.shadowBlur=25;cx.shadowOffsetY=9;
  cx.fillStyle="#071421dc";cx.beginPath();cx.arc(0,0,size*.54,0,Math.PI*2);cx.fill();
  cx.shadowBlur=0;cx.shadowOffsetY=0;
  cx.strokeStyle=side==="home"?accent():"#dbe2f6";cx.lineWidth=Math.max(4,size*.025);
  cx.beginPath();cx.arc(0,0,size*.54,0,Math.PI*2);cx.stroke();
  if(img&&img.naturalWidth){
   const ratio=Math.min(size*.92/img.naturalWidth,size*.92/img.naturalHeight);
   const w=img.naturalWidth*ratio,h=img.naturalHeight*ratio;
   cx.drawImage(img,-w/2,-h/2,w,h);
  }else{
   const team=side==="home"?$("pgHome").value:$("pgAway").value;
   label(initials(team),0,size*.13,size*.90,Math.min(86,size*.41),"#fff","center",950);
  }
  if(showHandles&&activeLayer===side){
   cx.strokeStyle="#ffdc8a";cx.lineWidth=6;
   cx.setLineDash([14,10]);cx.beginPath();cx.arc(0,0,size*.65,0,Math.PI*2);cx.stroke();cx.setLineDash([]);
  }
  cx.restore();
 }
 function draw(preview=true){
  if(!cx)return;
  const W=1080,H=$("pgFormat").value==="story"?1920:1350;
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
  drawBackground(W,H);
  const theme=$("pgTheme").value,c=theme==="editorial"?"#e5edf6":theme==="stadium"?"#aee5cd":accent();
  // Etiqueta superior, lectura clara sobre la fotografía.
  cx.fillStyle=theme==="broadcast"?"#101d30ee":"#0b1525c9";
  round(63,59,W-126,135,18);cx.fill();
  label($("pgTitle").value||"PRÓXIMO PARTIDO",W/2,122,905,58,"#fff","center",950);
  label($("pgCompetition").value||"FUTBOLITO · PREVIA",W/2,163,914,29,c,"center",840);
  // Fila central de clubes. Para mover cada escudo se elige su capa.
  paintCrest("home",W,H,preview);
  paintCrest("away",W,H,preview);
  label("VS",W/2,H*.512,185,74,c,"center",950);
  const headingY=H*.645;
  cx.fillStyle="#040c17ec";round(57,headingY-66,W-114,130,16);cx.fill();
  label($("pgHome").value||"LOCAL",W*.265,headingY+4,W*.42,43,"#fff","center",930);
  label($("pgAway").value||"VISITA",W*.735,headingY+4,W*.42,43,"#fff","center",930);
  // Datos de la jornada, siempre editables.
  const footerY=H===1350?H*.73:H*.78;
  cx.fillStyle="#081320ef";round(66,footerY,948,H-footerY-71,19);cx.fill();
  cx.fillStyle=c;cx.fillRect(97,footerY+23,886,6);
  let dateStr="FECHA POR CONFIRMAR";
  if($("pgDate").value){
   const [year,month,day]=$("pgDate").value.split("-").map(Number);
   const d=new Date(year,month-1,day);
   if(!Number.isNaN(d.getTime()))dateStr=new Intl.DateTimeFormat("es-CL",{weekday:"long",day:"numeric",month:"long"}).format(d).toUpperCase();
  }
  label(dateStr,W/2,footerY+91,886,36,"#fff","center",940);
  label($("pgTime").value?$("pgTime").value+" HRS":"HORA POR CONFIRMAR",W/2,footerY+144,890,33,c,"center",850);
  label($("pgVenue").value||"SEDE POR CONFIRMAR",W/2,footerY+196,900,31,"#dee7ef","center",790);
  const tagline=$("pgTagline").value;
  if(tagline)label(tagline,W/2,Math.min(H-114,footerY+257),920,28,"#c7d7e4","center",720);
  cx.fillStyle=c;cx.fillRect(0,H-14,W,14);
  if(preview&&activeLayer==="background"){
   cx.save();cx.strokeStyle="#ffe090aa";cx.lineWidth=3;cx.setLineDash([16,14]);
   cx.strokeRect(9,9,W-18,H-18);cx.restore();
  }
 }
 function status(text,error=false){
  const node=$("pgStatus");node.textContent=text;node.style.color=error?"#ffbac2":"#caf0de";
 }
 function selected(){return layers[activeLayer];}
 function syncControls(){
  const a=selected(),bg=activeLayer==="background";
  const zoom=$("pgScale"),angle=$("pgRotation");
  zoom.min=bg?"100":"45";zoom.max=bg?"300":"260";
  angle.min=bg?"-25":"-180";angle.max=bg?"25":"180";
  zoom.value=String(Math.round(a.scale*100));
  angle.value=String(Math.round(a.angle));
  $("pgX").value=String(Math.round(a.x*100));
  $("pgY").value=String(Math.round(a.y*100));
  for(const id of ["pgScale","pgRotation","pgX","pgY"]){
   const unit=id==="pgRotation"?"°":"%";
   $(id+"Out").textContent=$(id).value+unit;
  }
 }
 function readControls(){
  const a=selected();
  a.scale=Number($("pgScale").value)/100;a.angle=Number($("pgRotation").value);
  a.x=Number($("pgX").value)/100;a.y=Number($("pgY").value)/100;
  syncControls();draw();
 }
 for(const id of ["pgScale","pgRotation","pgX","pgY"])$(id).addEventListener("input",readControls);
 $("pgLayer").addEventListener("change",()=>{
  activeLayer=$("pgLayer").value;gesture=null;syncControls();draw();
 });
 $("pgResetLayer").addEventListener("click",()=>{
  Object.assign(selected(),defaults[activeLayer]);syncControls();draw();
  status("Elemento centrado y restaurado.");
 });
 $("pgRemoveLayer").addEventListener("click",()=>{
  if(activeLayer==="background"){images.background=null;$("pgBackground").value="";}
  else{images[activeLayer]=null;$(activeLayer==="home"?"pgLogoHome":"pgLogoAway").value="";}
  syncControls();draw();status("Imagen retirada. Si falta un escudo se mostrarán las iniciales.");
 });
 const fileFields=[["pgBackground","background",15*1024*1024],
                   ["pgLogoHome","home",4*1024*1024],
                   ["pgLogoAway","away",4*1024*1024]];
 function acceptImage(file,layer){
  return new Promise((resolve,reject)=>{
   if(!file||!["image/jpeg","image/png","image/webp"].includes(file.type))return reject(Error("Selecciona una imagen JPG, PNG o WebP."));
   const maximum=layer==="background"?15:4;
   if(file.size>maximum*1024*1024)return reject(Error("Imagen demasiado grande: máximo "+maximum+" MB."));
   if(urls[layer])URL.revokeObjectURL(urls[layer]);
   const url=URL.createObjectURL(file);urls[layer]=url;
   const candidate=new Image();
   candidate.onload=()=>{
    URL.revokeObjectURL(url);urls[layer]=null;
    resolve(candidate);
   };
   candidate.onerror=()=>{URL.revokeObjectURL(url);urls[layer]=null;reject(Error("No se pudo abrir la imagen."));};
   candidate.src=url;
  });
 }
 for(const [field,layer] of fileFields){
  $(field).addEventListener("change",async event=>{
   const file=event.target.files?.[0];if(!file)return;
   try{
    images[layer]=await acceptImage(file,layer);
    activeLayer=layer;
    $("pgLayer").value=layer;
    Object.assign(layers[layer],defaults[layer]);
    syncControls();draw();status("Imagen cargada. Selecciona la capa y ajusta con dos dedos.");
   }catch(error){status(error.message,true);$(field).value="";}
  });
 }
 async function trySavedHomeLogo(){
  const slug=document.documentElement.dataset.club||"mala-clase";
  let data=null;
  try{data=localStorage.getItem("futbolito-default-home-logo:"+slug);}catch{return;}
  if(!data?.startsWith("data:image/"))return;
  try{
   const img=new Image();
   await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=data;});
   images.home=img;
   $("pgHomeLogoInfo").textContent="✓ Se cargó el escudo local guardado en Ajustes. Puedes reemplazarlo para este anuncio.";
  }catch{
   images.home=null;
  }
 }
 function distance(t1,t2){return Math.hypot(t2.clientX-t1.clientX,t2.clientY-t1.clientY);}
 function direction(t1,t2){return Math.atan2(t2.clientY-t1.clientY,t2.clientX-t1.clientX)*180/Math.PI;}
 function midpoint(t1,t2){return {x:(t1.clientX+t2.clientX)/2,y:(t1.clientY+t2.clientY)/2};}
 // Un dedo siempre desplaza el documento. Solo dos dedos modifican la capa seleccionada.
 canvas.addEventListener("touchstart",event=>{
  if(event.touches.length!==2)return;
  event.preventDefault();
  const t=event.touches,a=selected(),m=midpoint(t[0],t[1]);
  gesture={mid:m,dist:Math.max(15,distance(t[0],t[1])),angle:direction(t[0],t[1]),
   x:a.x,y:a.y,scale:a.scale,rotation:a.angle};
 },{passive:false});
 canvas.addEventListener("touchmove",event=>{
  if(event.touches.length!==2||!gesture)return;
  event.preventDefault();
  const t=event.touches,m=midpoint(t[0],t[1]),r=canvas.getBoundingClientRect(),a=selected();
  a.x=clamp(gesture.x+(m.x-gesture.mid.x)/Math.max(1,r.width),0,1);
  a.y=clamp(gesture.y+(m.y-gesture.mid.y)/Math.max(1,r.height),0,1);
  a.scale=clamp(gesture.scale*(distance(t[0],t[1])/gesture.dist),
   activeLayer==="background"?1:.45,activeLayer==="background"?3:2.6);
  const limit=activeLayer==="background"?25:180;
  a.angle=clamp(gesture.rotation+direction(t[0],t[1])-gesture.angle,-limit,limit);
  syncControls();draw();
 },{passive:false});
 canvas.addEventListener("touchend",event=>{
  if(event.touches.length<2)gesture=null;
 },{passive:true});
 canvas.addEventListener("touchcancel",()=>{gesture=null;},{passive:true});
 // Desktop: mantener clic y arrastrar. En teléfono, un dedo NO mueve la imagen.
 let mouse=null;
 canvas.addEventListener("pointerdown",event=>{
  if(event.pointerType!=="mouse"||event.button!==0)return;
  mouse={x:event.clientX,y:event.clientY,a:{...selected()}};
  canvas.setPointerCapture(event.pointerId);
 });
 canvas.addEventListener("pointermove",event=>{
  if(!mouse||event.pointerType!=="mouse")return;
  const r=canvas.getBoundingClientRect(),a=selected();
  a.x=clamp(mouse.a.x+(event.clientX-mouse.x)/r.width,0,1);
  a.y=clamp(mouse.a.y+(event.clientY-mouse.y)/r.height,0,1);
  syncControls();draw();
 });
 canvas.addEventListener("pointerup",()=>{mouse=null;});
 canvas.addEventListener("pointercancel",()=>{mouse=null;});

 let agenda=[],requestId=0,edited=false;
 function chile(iso){
  if(!iso)return {date:"",time:""};
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Santiago",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(iso));
  const d=Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
  return {date:d.year+"-"+d.month+"-"+d.day,time:d.hour+":"+d.minute};
 }
 function teamFor(name){
  const n=(name||"").toLowerCase();
  if((document.documentElement.dataset.club||"mala-clase")==="larraguibel")return "Larraguibel";
  if(n.includes("liga hz")&&n.includes("+30"))return "Mala Clase +30";
  if(n.includes("liga hz")&&n.includes("serie e"))return "Mala Clase TC";
  return localName();
 }
 function applyScheduled(f){
  const d=chile(f.scheduled_at);
  Object.entries({pgTitle:"PRÓXIMO PARTIDO",pgHome:f.team,pgAway:f.rival,pgCompetition:f.competition,pgTagline:f.round_name,pgDate:d.date,pgTime:d.time,pgVenue:f.venue||""}).forEach(([key,val])=>$(key).value=val);
  draw();$("pgFixtureHint").textContent="✓ "+f.round_name+" cargada. Puedes ajustar todos los datos, la foto y los escudos.";
 }
 $("pgFixture").addEventListener("change",()=>{
  edited=true;
  const f=agenda.find(x=>x.id===$("pgFixture").value);
  if(f)applyScheduled(f);
 });
 async function loadScheduled(){
  const seq=++requestId,select=$("pgFixture");
  select.replaceChildren(new Option("Consultando programación…",""));select.disabled=true;
  try{
   const job=(async()=>{
    const hub=window.FutbolitoHub;
    if(!hub?.db||!hub?.getClub)throw Error("Acceso del club no disponible.");
    const [db,club]=await Promise.all([hub.db(),hub.getClub()]);
    const [c,o]=await Promise.all([
     db.from("club_competitions").select("id,name").eq("club_id",club.id),
     db.from("club_opponents").select("id,name").eq("club_id",club.id)
    ]);
    if(c.error||o.error)throw c.error||o.error;
    const comps=c.data||[];if(!comps.length)return [];
    const f=await db.from("competition_fixtures")
     .select("id,competition_id,opponent_id,round_name,scheduled_at,venue,status")
     .in("competition_id",comps.map(x=>x.id)).eq("status","scheduled").limit(300);
    if(f.error)throw f.error;
    const names=new Map(comps.map(x=>[x.id,x.name]));
    const rivals=new Map((o.data||[]).map(x=>[x.id,x.name]));
    return (f.data||[]).map(row=>({
     ...row,competition:names.get(row.competition_id)||"Campeonato",
     rival:rivals.get(row.opponent_id)||"Rival",
     team:teamFor(names.get(row.competition_id))
    })).sort((a,b)=>(a.scheduled_at||"9999").localeCompare(b.scheduled_at||"9999"));
   })();
   const list=await Promise.race([job,new Promise((_,rej)=>setTimeout(()=>rej(Error("Tiempo excedido")),12000))]);
   if(seq!==requestId||!dialog.open)return;
   agenda=list;select.replaceChildren(new Option("Completar manualmente",""));
   list.forEach(f=>{
    const t=chile(f.scheduled_at);
    select.add(new Option(f.team+" · "+f.round_name+" · "+f.rival+(t.date?" · "+t.date+" "+t.time:" · Fecha sin confirmar"),f.id));
   });
   select.disabled=false;
   $("pgFixtureHint").textContent=list.length?"Selecciona un encuentro o edita los datos manualmente.":"No hay partidos programados; puedes completar el anuncio manualmente.";
   const soon=list.filter(f=>f.scheduled_at&&new Date(f.scheduled_at).getTime()>=Date.now()-3600000);
   const next=soon.find(f=>f.team===localName())||soon[0];
   if(next&&!edited){select.value=next.id;applyScheduled(next);}
  }catch(e){
   if(seq!==requestId||!dialog.open)return;
   select.replaceChildren(new Option("Completar manualmente",""));select.disabled=false;
   $("pgFixtureHint").textContent="No se pudo cargar el calendario. Puedes completar el anuncio manualmente.";
  }
 }
 function resetEditor(){
  requestId++;agenda=[];edited=false;
  $("pgFixture").replaceChildren(new Option("Completar manualmente",""));
  $("pgFixtureHint").textContent="Selecciona un encuentro o introduce datos manualmente.";
  $("pgTitle").value="PRÓXIMO PARTIDO";
  $("pgHome").value=localName();
  $("pgAway").value=awayName();
  $("pgCompetition").value="";
  $("pgTagline").value="";
  $("pgVenue").value="";
  $("pgDate").value="";
  $("pgTime").value="";
  $("pgFormat").value="post";
  $("pgTheme").value="broadcast";
  $("pgBackground").value="";$("pgLogoHome").value="";$("pgLogoAway").value="";
  $("pgHomeLogoInfo").textContent="Si guardaste un escudo local en Ajustes, se cargará automáticamente. Sin imagen aparecen las iniciales.";
  for(const key of Object.keys(defaults)){Object.assign(layers[key],defaults[key]);images[key]=null;}
  activeLayer="background";$("pgLayer").value=activeLayer;
  syncControls();status("");draw();
  trySavedHomeLogo().then(()=>draw()).catch(()=>draw());
 }
 for(const id of ["pgTitle","pgCompetition","pgHome","pgAway","pgDate","pgTime","pgVenue","pgTagline","pgFormat","pgTheme"]){
  $(id).addEventListener("input",()=>{edited=true;draw();});
 }
 trigger.addEventListener("click",()=>{
  const social=$("fHubSocial");if(social?.open)social.close();
  resetEditor();dialog.showModal();loadScheduled();
 });
 $("pgClose").addEventListener("click",()=>dialog.close());
 dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
 async function png(){
  draw(false);
  try{return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error("No fue posible exportar el PNG.")),"image/png"));}
  finally{draw(true);}
 }
 $("pgDownload").addEventListener("click",async()=>{
  try{
   const b=await png(),url=URL.createObjectURL(b),a=document.createElement("a");
   a.href=url;a.download="futbolito-previa-"+new Date().toISOString().slice(0,10)+".png";
   document.body.append(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),20000);
   status("PNG generado. Puedes guardarlo o publicarlo en tus redes.");
  }catch(error){status(error.message||"No se pudo guardar la imagen.",true);}
 });
 $("pgShare").addEventListener("click",async()=>{
  try{
   const b=await png(),f=new File([b],"futbolito-prepartido.png",{type:"image/png"});
   if(navigator.canShare?.({files:[f]})&&navigator.share)await navigator.share({files:[f],title:"Próximo partido · Futbolito"});
   else status("Este navegador no permite compartir imágenes: usa «Guardar PNG».",true);
  }catch(error){if(error?.name!=="AbortError")status(error.message||"No se pudo compartir.",true);}
 });
})();