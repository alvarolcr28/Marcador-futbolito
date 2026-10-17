/* Compartir unificado, ajustes y punto de integración con campeonatos. */
(async()=>{
"use strict";
const $=id=>document.getElementById(id);
const originalButton=$("shareBtn"),top=document.querySelector(".top-actions");
if(!originalButton||!top)return;
try{
 const res=await fetch("/Marcador-futbolito/menu-superior.html?v=20261017-1",{cache:"no-cache"});
 if(!res.ok)throw Error("No fue posible cargar los nuevos menús.");
 const tpl=document.createElement("template");tpl.innerHTML=await res.text();
 document.body.appendChild(tpl.content);
 const originalSummary=originalButton.onclick;
 let dbPromise=null;
 const slug=document.documentElement.dataset.club||"mala-clase";
 const storageKey="futbolito-prefs-v2:"+slug;
 let prefs={showYellowPopup:true,resetFouls:true};
 try{Object.assign(prefs,JSON.parse(localStorage.getItem(storageKey)||"null")||{})}catch{}
 const persist=()=>localStorage.setItem(storageKey,JSON.stringify(prefs));
 const db=()=>dbPromise||(dbPromise=import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm").then(m=>m.createClient(
 "https://cpqvrmorbwrrorrsobgj.supabase.co","sb_publishable_KDivcfl1sf6CumXuMhi77w_k-01gmD4",
 {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
 )));
 async function getClub(){
  const client=await db();
  const u=await client.auth.getUser();
  if(u.error||!u.data?.user)throw Error("Primero inicia sesión.");
  const r=await client.from("clubs").select("id,slug,name").eq("slug",slug).maybeSingle();
  if(r.error||!r.data)throw Error("No tienes permisos para este club.");
  return r.data;
 }
 window.FutbolitoHub={db,slug,getClub,prefs:()=>({...prefs}),
  notify:message=>{const e=$("hubQrStatus");if(e)e.textContent=message;}};

 async function loadExtension(path){
  await new Promise((resolve,reject)=>{
   const script=document.createElement("script");
   script.src="/Marcador-futbolito/"+path+"?v=20261017-5";
   script.onload=resolve;
   script.onerror=()=>reject(Error("No se pudo cargar "+path));
   document.body.appendChild(script);
  });
 }
 // Los controles del menú son dinámicos. Cargar sus módulos solo DESPUÉS
 // de insertar los diálogos; antes no existen los botones QR ni torneos.
 await loadExtension("menu-qr.js");
 await loadExtension("menu-torneos.js");
  await loadExtension("registro-jugadores.js");
 await loadExtension("publicacion-mvp.js");
 function closeOn(dialog,button){
  $(button).addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
 }
 const share=$("fHubShare"),settings=$("fHubSettings"),qr=$("fHubQr"),summary=$("fHubSummaryPreview");
 closeOn(share,"hubShareClose");closeOn(settings,"hubSettingsClose");closeOn(qr,"hubQrClose");
 closeOn(summary,"hubSummaryClose");
 const gear=document.createElement("button");
 gear.id="fHubSettingsButton";gear.type="button";gear.className="iconbtn";
 gear.textContent="⚙";gear.title="Ajustes";gear.setAttribute("aria-label","Abrir ajustes");
 top.insertBefore(gear,originalButton);
 originalButton.id="fHubShareButton";originalButton.textContent="↗";
 originalButton.title="Compartir";originalButton.setAttribute("aria-label","Compartir partido");
 originalButton.onclick=null;
 originalButton.addEventListener("click",()=>share.showModal());
 gear.addEventListener("click",()=>{
  reflect();
  moveOriginalSettings();
  settings.showModal();
 });
 // El resumen solo ocupa pantalla después de pulsar Compartir.
 let summaryIsExample=false;
 function matchHasData(){
  return typeof state!=="undefined"&&(state.running||state.elapsed>0||state.period>1||
   state.goals?.length||state.cards?.length||state.redCards?.length||
   state.scores?.some(x=>x>0)||state.totalFouls?.some(x=>x>0));
 }
 function updateSummaryPreview(){
  const hasData=matchHasData();
  $("hubSummaryLabel").textContent=summaryIsExample?
   "Ejemplo ficticio: estos números NO pertenecen a un partido real.":
   (hasData?"Mensaje con los registros reales del partido.":"Aún no hay partido registrado. Puedes revisar un ejemplo ficticio.");
  $("hubSummaryText").textContent=summaryIsExample?
   (typeof formatMatchSummary==="function"&&typeof exampleMatch!=="undefined"?formatMatchSummary(exampleMatch):"Ejemplo no disponible."):
   (typeof currentSummary==="function"?currentSummary():"Resumen no disponible.");
  $("hubSendSummary").disabled=summaryIsExample||!hasData;
  $("hubViewActual").classList.toggle("primary",!summaryIsExample);
  $("hubViewExample").classList.toggle("primary",summaryIsExample);
 }
 $("hubSummary").addEventListener("click",()=>{
  share.close();summaryIsExample=!matchHasData();
  updateSummaryPreview();summary.showModal();
 });
 $("hubViewActual").addEventListener("click",()=>{summaryIsExample=false;updateSummaryPreview()});
 $("hubViewExample").addEventListener("click",()=>{summaryIsExample=true;updateSummaryPreview()});
 $("hubCopySummary").addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText($("hubSummaryText").textContent);$("hubCopySummary").textContent="✓ Copiado";setTimeout(()=>$("hubCopySummary").textContent="Copiar texto",1500)}
  catch(e){alert("Selecciona el texto de la vista previa para copiarlo.");}
 });
 $("hubSendSummary").addEventListener("click",()=>{
  if(summaryIsExample||!matchHasData())return;
  summary.close();
  if(typeof originalSummary==="function")originalSummary.call(originalButton);
  else if(typeof currentSummary==="function")window.open("https://wa.me/?text="+encodeURIComponent(currentSummary()),"_blank","noopener");
 });
 $("hubPhoto").addEventListener("click",()=>{
  share.close();
  const button=$("openInstagramPost");
  if(button)button.click();
  else alert("No se cargó el generador de imagen para redes.");
 });
 $("hubQr").addEventListener("click",()=>{
  share.close();qr.showModal();
  if(window.FutbolitoQr?.mount)window.FutbolitoQr.mount();
  else $("hubQrStatus").textContent="La configuración de QR todavía está cargando. Intenta de nuevo.";
 });
 // Escudo local predeterminado, guardado en el mismo dispositivo.
 const defaultHomeLogoKey="futbolito-default-home-logo:"+slug;
 function refreshDefaultLogo(){
  $("hubDefaultLogoStatus").textContent=localStorage.getItem(defaultHomeLogoKey)?
   "✓ Escudo local guardado en este dispositivo. Se utilizará automáticamente en nuevos QR.":
   "No hay escudo local guardado. Sin imagen se mostrarán las iniciales.";
 }
 const defaultLogoField=$("hubDefaultLogo");
 defaultLogoField.addEventListener("change",async()=>{
  const file=defaultLogoField.files?.[0];if(!file)return;
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>1048576){
   alert("Selecciona PNG, JPG o WebP de 1 MB o menos.");defaultLogoField.value="";return;
  }
  try{
   const data=await new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(Error("No se pudo leer la imagen."));reader.readAsDataURL(file);
   });
   localStorage.setItem(defaultHomeLogoKey,String(data));refreshDefaultLogo();
  }catch(e){alert("No se pudo guardar el escudo en este dispositivo.");}
  defaultLogoField.value="";
 });
 $("hubRemoveDefaultLogo").addEventListener("click",()=>{
  localStorage.removeItem(defaultHomeLogoKey);defaultLogoField.value="";refreshDefaultLogo();
 });
 refreshDefaultLogo();
 function reflect(){
  $("hubYellowPopup").checked=prefs.showYellowPopup!==false;
  $("hubResetFouls").checked=prefs.resetFouls!==false;
 }
 function moveOriginalSettings(){
  const duration=document.querySelector(".duration-setup");
  if(duration&&duration.parentNode!==$("hubDuration"))$("hubDuration").appendChild(duration);
  const config=document.querySelector("details.config-fold > section.panel");
  if(config){
   const setup=config.querySelector(".setup");
   if(setup&&setup.parentNode!==$("hubTeams"))$("hubTeams").appendChild(setup);
   const manage=config.querySelector(".roster-tools");
   if(manage&&manage.parentNode!==$("hubTeams"))$("hubTeams").appendChild(manage);
  }
  const theme=$("themeEditor");
  if(theme&&theme.parentNode!==$("hubTheme"))$("hubTheme").appendChild(theme);
  const old=document.querySelector("details.config-fold");
  if(old)old.hidden=true;
 }
 const tabs=[["hubTabGame","hubGame"],["hubTabLook","hubLook"],["hubTabComp","hubCompetition"]];
 for(const [button,panel] of tabs){
  $(button).addEventListener("click",()=>{
   tabs.forEach(([b,p])=>{$(b).setAttribute("aria-selected",String(b===button));$(p).hidden=p!==panel});
   moveOriginalSettings();
   if(panel==="hubCompetition"){
    if(window.FutbolitoTorneos?.mount)window.FutbolitoTorneos.mount($("hubCompetitionContents"));
    else $("hubCompetitionContents").textContent="Cargando módulo de campeonatos…";
   }
  });
 }
 reflect();moveOriginalSettings();
 $("hubSaveGame").addEventListener("click",()=>{
  prefs.showYellowPopup=$("hubYellowPopup").checked;
  prefs.resetFouls=$("hubResetFouls").checked;
  persist();
  if(typeof renderSanctionBubbles==="function")renderSanctionBubbles();
  settings.close();
 });
 if(typeof renderSanctionBubbles==="function"){
  const previousRender=renderSanctionBubbles;
  renderSanctionBubbles=function(...args){
   if(prefs.showYellowPopup===false){const root=$("yellowFloats");if(root)root.hidden=true;return;}
   return previousRender.apply(this,args);
  };
  renderSanctionBubbles();
 }
 const periodBtn=$("periodBtn");
 if(periodBtn&&typeof periodBtn.onclick==="function"){
  const previousPeriod=periodBtn.onclick;
  periodBtn.onclick=function(...args){
   const firstHalf=typeof state!=="undefined"&&state.period===1
    ?[...state.periodFouls]:null;
   const result=previousPeriod.apply(this,args);
   if(firstHalf&&state.period===2){
    state.firstHalfFouls=firstHalf;
    if(prefs.resetFouls===false)state.periodFouls=[...firstHalf];
    render();
   }
   return result;
  };
 }
}catch(e){console.error("No se pudo iniciar la nueva interfaz Futbolito",e);}
})();
