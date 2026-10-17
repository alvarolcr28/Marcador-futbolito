(function socialArt() {
 "use strict";
 const $=id=>document.getElementById(id);
 if(!$("hubSocialScore")||$("socialArtDialog"))return;
 const modal=document.createElement("dialog");
 modal.id="socialArtDialog";modal.className="fhub-dialog social-editor";
 modal.innerHTML=`
 <div class="fhub-head"><h2 id="socialArtHeading">🏆 Portada de resultado</h2><button type="button" id="socialArtClose" class="close" aria-label="Cerrar">✕</button></div>
 <p class="fhub-small" id="socialArtExplanation">Diseño listo para compartir. Los datos se toman del marcador actual.</p>
 <div class="social-art-fields">
  <label class="fhub-field">Formato<select id="socialArtFormat"><option value="post">Publicación 4:5</option><option value="story">Historia / Reel 9:16</option></select></label>
  <label class="fhub-field">Estética<select id="socialArtTheme"><option value="impact">Impacto deportivo</option><option value="classic">Elegante / minimalista</option></select></label>
  <label class="fhub-field">Título<input id="socialArtTitle" maxlength="55" placeholder="Resultado del partido"></label>
  <label class="fhub-field">Subtítulo<input id="socialArtSubtitle" maxlength="70" placeholder="Copa · Fecha 1"></label>
  <label class="fhub-field social-photo-field" id="socialArtPhotoLabel">Foto opcional<input type="file" id="socialArtPhoto" accept="image/png,image/jpeg,image/webp"></label>
 </div>
 <canvas id="socialArtCanvas" width="1080" height="1350" aria-label="Vista previa para redes"></canvas>
 <p class="fhub-small" id="socialArtHint" role="status"></p>
 <div class="fhub-actions"><button type="button" class="btn primary" id="socialArtSave">⬇ Guardar PNG</button><button type="button" class="btn" id="socialArtShare">↗ Compartir foto</button></div>
 <p class="fhub-small" id="socialArtStatus" role="status"></p>`;
 document.body.append(modal);
 const styles=document.createElement("style");
 styles.textContent=`
 .social-editor{width:min(650px,calc(100vw - 16px))}
 .social-art-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin:13px 0}
 .social-editor canvas{display:block;width:min(100%,410px);height:auto;margin:14px auto;background:#111c2c;border:1px solid #59697f;border-radius:11px;box-shadow:0 12px 35px #0009}
 .social-editor .social-art-fields .fhub-field{min-width:0}
 @media(max-width:490px){.social-art-fields{grid-template-columns:1fr}}
 `;
 document.head.append(styles);
 let mode="score",image=null,photoUrl=null;
 const canvas=$("socialArtCanvas"),ctx=canvas.getContext("2d");
 const get=x=>String(x??"").trim();
 const total=s=>Array.isArray(s)?s:[],
       themeColor=()=>{const c=getComputedStyle(document.documentElement).getPropertyValue("--green").trim();return /^#[0-9a-f]{3,8}$/i.test(c)?c:"#a98aeb"};
 function paintText(t,x,y,maxW,sz=44,fill="#fff",align="left",weight=850){
  const v=get(t);ctx.textAlign=align;ctx.fillStyle=fill;
  while(sz>20){ctx.font=weight+" "+sz+"px system-ui,Arial,sans-serif";if(ctx.measureText(v).width<=maxW)break;sz-=2}
  ctx.fillText(v,x,y,maxW)
 }
 function rect(x,y,w,h,r=20){
  ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);
 }
 function background(W,H){
  const focus=$("socialArtTheme").value==="impact";
  const gradient=ctx.createLinearGradient(0,0,W,H);
  gradient.addColorStop(0,focus?"#24394a":"#151f2c");
  gradient.addColorStop(0.6,focus?"#111b2c":"#0c151f");
  gradient.addColorStop(1,"#080c15");
  ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
  ctx.fillStyle=themeColor();ctx.fillRect(0,0,13,H);
  if(focus){
   ctx.save();ctx.globalAlpha=.075;ctx.strokeStyle="#fff";ctx.lineWidth=2;
   for(let n=-700;n<2200;n+=115){ctx.beginPath();ctx.moveTo(n,0);ctx.lineTo(n+850,H);ctx.stroke()}
   ctx.restore();
  }
 }
 function photoCover(box){
  if(!image||!image.naturalWidth||!image.naturalHeight)return false;
  const w=image.naturalWidth,h=image.naturalHeight,scale=Math.max(box.w/w,box.h/h);
  const dw=w*scale,dh=h*scale;
  ctx.save();ctx.beginPath();ctx.rect(box.x,box.y,box.w,box.h);ctx.clip();
  ctx.drawImage(image,box.x+(box.w-dw)/2,box.y+(box.h-dh)/2,dw,dh);ctx.restore();
  return true;
 }
 const home=()=>get($("homeTeam")?.value)||"LOCAL",away=()=>get($("awayName")?.value)||"VISITA";
 const active=()=>typeof state!=="undefined"&&(state.period>1||state.elapsed>0||state.goals?.length>0||state.scores?.some(n=>n>0)||state.cards?.length>0);
 const status=()=>{
  if(!active())return "PARTIDO SIN INICIAR";
  if(state.period===3)return "RESULTADO FINAL";
  return state.period===2?"SEGUNDO TIEMPO · EN CURSO":"PRIMER TIEMPO · EN CURSO";
 };
 function scoreline(y,large=false){
  const left=large?66:75,right=large?1014:1005,size=large?55:43;
  paintText(home().toUpperCase(),left,y,382,size,"#fff","left",880);
  paintText(away().toUpperCase(),right,y,382,size,"#dce7f2","right",880);
  if(typeof state!=="undefined"){
   paintText(String(state.scores?.[0]??0)+"  :  "+String(state.scores?.[1]??0),540,y+105,920,large?155:129,"#fff","center",970);
  }
 }
 function scorerLines(){
  const goals=total(state?.goals).filter(g=>g.period===1||g.period===2);
  const half=Number(state?.halfMinutes)||25;
  return goals.slice().sort((a,b)=>Number(a.period)-Number(b.period)||Number(a.elapsedAt)-Number(b.elapsedAt)).map(g=>{
   const sec=Math.max(0,Number(g.elapsedAt)||0);
   const minute=(g.period===2?half:0)+Math.max(1,Math.ceil(sec/60));
   const club=g.team==="home"?"LOC":"VIS";
   const author=g.ownGoal?"Autogol":g.team==="home"?(get(g.scorer)||"Autor no registrado"):"Gol visitante";
   return {club,minute,author};
  });
 }
 function render(){
  if(!ctx)return;
  const W=1080,H=$("socialArtFormat").value==="story"?1920:1350;
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}
  background(W,H);
  const accent=themeColor();
  const title=$("socialArtTitle").value || (mode==="score"?"PARTIDO DE FUTBOLITO":"GOLEADORES DEL PARTIDO");
  paintText(title.toUpperCase(),65,110,949,51);
  paintText(($("socialArtSubtitle").value||"FUTBOLITO · PUBLICACIÓN").toUpperCase(),68,160,940,26,"#bbd0df","left",740);
  ctx.fillStyle=accent;ctx.fillRect(65,186,950,5);
  if(mode==="score"){
   const top=221,h=H===1920?1130:655,box={x:61,y:top,w:958,h};
   ctx.fillStyle="#202e41";rect(box.x,box.y,box.w,box.h,23);ctx.fill();
   ctx.save();rect(box.x,box.y,box.w,box.h,23);ctx.clip();
   if(!photoCover(box)){
    ctx.fillStyle="#1c3040";ctx.fillRect(box.x,box.y,box.w,box.h);
    ctx.save();ctx.strokeStyle=accent;ctx.globalAlpha=.13;ctx.lineWidth=9;
    for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(540,top+h*.49,110+i*115,0,2*Math.PI);ctx.stroke()}
    ctx.restore();
    paintText("⚽",540,top+h*.53,710,166,"#dfedf2","center",850);
   }
   const overlay=ctx.createLinearGradient(0,top+h*.3,0,top+h);
   overlay.addColorStop(0,"#01061100");overlay.addColorStop(1,"#020814f4");
   ctx.fillStyle=overlay;ctx.fillRect(box.x,box.y,box.w,box.h);
   ctx.restore();
   paintText(status(),540,top+h-244,900,30,accent,"center",850);
   scoreline(top+h-182,true);
   const foot=top+h+66;
   paintText(status()==="PARTIDO SIN INICIAR"?"PREVIA DEL ENCUENTRO":"MARCADOR DEL ENCUENTRO",540,foot,880,30,"#d0dce9","center",800);
   paintText("FUTBOLITO  •  "+(status()==="RESULTADO FINAL"?"PARTIDO FINALIZADO":"CONTROL DE PARTIDO"),540,H-88,900,27,"#9ab0bf","center",760);
  }else{
   scoreline(285,false);
   ctx.fillStyle="#091524c9";rect(56,476,968,H-557,20);ctx.fill();
   paintText("⚽ GOLES REGISTRADOS",88,539,890,36,accent,"left",850);
   const goals=scorerLines();
   const max=H===1920?22:12;
   if(!goals.length){
    paintText("Aún no hay goles registrados.",90,633,877,34,"#c6d5e5","left",700);
   }else{
    const shown=goals.slice(0,max),step=H===1920?51:47;
    shown.forEach((g,i)=>{
     const y=615+i*step;
     ctx.fillStyle=i%2===0?"#ffffff13":"#ffffff07";
     rect(81,y-34,914,44,8);ctx.fill();
     paintText(String(g.minute)+"'",109,y,92,28,accent,"left",880);
     paintText(g.club,208,y,87,24,"#9cb8ce","left",850);
     paintText(g.author,313,y,660,28,"#edf4fa","left",790);
    });
    if(goals.length>max)paintText("+"+(goals.length-max)+" goles registrados más",90,H-125,850,24,"#cadbe8","left",750);
   }
   paintText("LOC = LOCAL  ·  VIS = VISITA",85,H-53,900,23,"#9eb4c5","left",700);
  }
  ctx.fillStyle=accent;ctx.fillRect(0,H-12,W,12);
  $("socialArtHint").textContent=mode==="scorers"?
   "La lista refleja "+scorerLines().length+" goles registrados. Los del visitante no llevan autor; no se inventan datos.":
   "La portada toma los nombres y el marcador actuales. Si el encuentro no empezó, se identifica como previa.";
 }
 function open(next){
  mode=next;
  if($("fHubSocial").open)$("fHubSocial").close();
  $("socialArtHeading").textContent=mode==="score"?"🏆 Portada de resultado":"⚽ Goleadores del partido";
  $("socialArtExplanation").textContent=mode==="score"?
   "Imagen de resultado con foto opcional y marcador protagonista.":
   "Publicación cronológica de goles. Los autores de los goles rivales no se registran.";
  $("socialArtPhotoLabel").hidden=mode!=="score";
  $("socialArtTitle").value=mode==="score"?"RESULTADO DEL PARTIDO":"GOLES DEL PARTIDO";
  $("socialArtSubtitle").value="";
  $("socialArtStatus").textContent="";
  $("socialArtFormat").value="post";
  image=null;$("socialArtPhoto").value="";
  render();modal.showModal();
 }
 function inform(s,err=false){$("socialArtStatus").textContent=s;$("socialArtStatus").style.color=err?"#ffb2be":"#c7efdd"}
 function blob(){render();return new Promise((ok,no)=>canvas.toBlob(b=>b?ok(b):no(new Error("No se pudo crear el PNG.")),"image/png"))}
 $("hubSocialScore").addEventListener("click",()=>open("score"));
 $("hubSocialScorers").addEventListener("click",()=>open("scorers"));
 $("socialArtClose").addEventListener("click",()=>modal.close());
 modal.addEventListener("click",e=>{if(e.target===modal)modal.close()});
 for(const id of ["socialArtFormat","socialArtTheme","socialArtTitle","socialArtSubtitle"])$(id).addEventListener("input",render);
 $("socialArtPhoto").addEventListener("change",e=>{
  const f=e.target.files?.[0];if(!f)return;
  if(!["image/jpeg","image/png","image/webp"].includes(f.type)||f.size>12*1024*1024){
   inform("Usa JPG, PNG o WebP de hasta 12 MB.",true);return;
  }
  if(photoUrl)URL.revokeObjectURL(photoUrl);
  photoUrl=URL.createObjectURL(f);
  const candidate=new Image();
  candidate.onload=()=>{image=candidate;URL.revokeObjectURL(photoUrl);photoUrl=null;render()};
  candidate.onerror=()=>{inform("No se pudo abrir la fotografía.",true);URL.revokeObjectURL(photoUrl);photoUrl=null};
  candidate.src=photoUrl;
 });
 $("socialArtSave").addEventListener("click",async()=>{
  try{
   const b=await blob(),u=URL.createObjectURL(b),a=document.createElement("a");
   a.href=u;a.download="futbolito-"+(mode==="score"?"resultado":"goleadores")+".png";
   document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),15000);
   inform("Imagen PNG lista para guardar o publicar.");
  }catch(e){inform(e.message,true)}
 });
 $("socialArtShare").addEventListener("click",async()=>{
  try{
   const b=await blob(),f=new File([b],"futbolito-"+mode+".png",{type:"image/png"});
   if(navigator.canShare?.({files:[f]})&&navigator.share)await navigator.share({files:[f],title:"Futbolito"});
   else inform("Este navegador no admite compartir archivos. Usa Guardar PNG.",true)
  }catch(e){if(e.name!=="AbortError")inform(e.message,true)}
 });
})();