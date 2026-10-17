/* QR desde Compartir, sin abandonar el marcador. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
let club=null,record=null,permitted=false,logoHome=null,logoAway=null,busy=false,qrLibrary=null;
const hub=()=>window.FutbolitoHub;
const key=()=>("futbolito_live_"+hub().slug);
const localRecord=()=>{try{return JSON.parse(localStorage.getItem(key())||"null")}catch{return null}};
const store=()=>{if(record)localStorage.setItem(key(),JSON.stringify(record))};
const url=()=>record?.token?location.origin+"/Marcador-futbolito/espectador/#partido="+record.token:"";
function status(text,err=false){
 const e=$("hubQrStatus");if(!e)return;
 e.textContent=text;e.style.borderLeftColor=err?"#f87171":"#b58cea";
}
function buttons(){
 const good=record&&record.status!=="revoked"&&(!record.expires_at||new Date(record.expires_at)>new Date());
 $("hubPrepareQr").disabled=!permitted||busy;
 $("hubSaveQr").disabled=!permitted||busy||!good;
 $("hubPublishQr").disabled=!permitted||busy||!good||record.status!=="draft";
 $("hubRenewQr").disabled=!permitted||busy||!good;
 $("hubStopQr").disabled=!permitted||busy||!good;
 $("hubQrPreview").hidden=!good||!record.token;
 if(good&&record.token)draw();
}
function loadQrLib(){
 if(window.qrcode)return Promise.resolve();
 if(qrLibrary)return qrLibrary;
 qrLibrary=new Promise((resolve,reject)=>{
  const script=document.createElement("script");
  script.src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";
  script.onload=()=>typeof window.qrcode==="function"?resolve():reject(Error("No se pudo inicializar el QR."));
  script.onerror=()=>reject(Error("La biblioteca QR no está disponible."));
  document.head.appendChild(script);
 });
 return qrLibrary;
}
async function draw(){
 const link=url();if(!link)return;
 $("hubQrUrl").textContent=link;$("hubQrUrl").href=link;
 const root=$("hubQrCode");root.replaceChildren();
 try{
  await loadQrLib();
  const q=window.qrcode(0,"M");q.addData(link);q.make();
  const fragment=document.createElement("div");
  fragment.innerHTML=q.createSvgTag({cellSize:4,margin:2,scalable:true});
  root.append(...fragment.childNodes);
 }catch(e){root.textContent="Puedes copiar el enlace, pero el código QR no pudo cargarse.";status(e.message,true)}
}
function hours(){
 const num=Number($("hubQrHours").value);
 if(!Number.isInteger(num)||num<3||num>24)throw Error("La duración debe estar entre 3 y 24 horas completas.");
 return num;
}
async function authenticate(){
 if(!hub())throw Error("Aún no se cargó el menú.");
 const client=await hub().db(),u=await client.auth.getUser();
 if(u.error||!u.data?.user)throw Error("Debes iniciar sesión para generar el QR.");
 club=await hub().getClub();
 const checks=await Promise.all([
  client.rpc("is_platform_admin"),
  client.rpc("is_club_manager",{p_club:club.id})
 ]);
 permitted=checks[0].data===true||checks[1].data===true;
 return client;
}
async function mount(){
 try{
  const client=await authenticate();
  const list=await client.rpc("list_match_broadcasts",{p_club_id:club.id});
  if(!permitted){status("Solo el administrador general o el encargado pueden generar enlaces. Los operadores no tienen ese permiso.");buttons();return}
  if(list.error)throw list.error;
  const entries=Array.isArray(list.data)?list.data:[];
  const local=localRecord();
  const fromServer=entries.find(x=>x.id===local?.id)
   ||entries.find(x=>x.status==="live"&&x.expires_at&&new Date(x.expires_at)>new Date())
   ||entries.find(x=>x.status==="draft")
   ||null;
  record=fromServer?{...fromServer,token:fromServer.id===local?.id?local?.token:null}:null;
  logoHome=record?.home_logo_url||null;logoAway=record?.away_logo_url||null;
  if(record){
   $("hubQrTitle").value=record.title||"Partido de Futbolito";
   const hoursSelect=$("hubQrHours");
   const wanted=String(record.access_hours||6);
   if(![...hoursSelect.options].some(o=>o.value===wanted))
    hoursSelect.add(new Option(wanted+" horas",wanted));
   hoursSelect.value=wanted;
   store();
  }
  buttons();
  if(!record)status("No existe un enlace activo o preparado. Puedes crear uno nuevo.");
  else if(!record.token)status("Se recuperó un enlace existente, pero este teléfono no conserva el QR. Pulsa «Renovar QR» para reemplazarlo.");
  else if(record.status==="draft")status("QR preparado. El contador de horas comenzará al publicarlo.");
  else status("Transmisión publicada. Enlace válido hasta "+new Date(record.expires_at).toLocaleString("es-CL")+".");
 }catch(e){status(e.message,true);buttons()}
}
async function action(id,callback){
 if(busy)return;busy=true;buttons();
 try{
  const client=await authenticate();
  if(!permitted)throw Error("Solo un encargado o administrador puede gestionar el QR.");
  await callback(client);
 }catch(e){status(e.message||"No se pudo completar el proceso.",true)}
 finally{busy=false;buttons()}
}
async function uploadImage(client,id,overrideFile=null){
 const file=$(id).files?.[0]||overrideFile;if(!file)return null;
 if(!["image/png","image/webp","image/jpeg"].includes(file.type)||file.size>1048576)
  throw Error("El escudo debe ser JPG, PNG o WebP y pesar hasta 1 MB.");
 const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
 const path=club.id+"/"+record.id+"/"+crypto.randomUUID()+"."+ext;
 const response=await client.storage.from("futbolito-escudos").upload(path,file,{upsert:false,contentType:file.type});
 if(response.error)throw response.error;
 return client.storage.from("futbolito-escudos").getPublicUrl(path).data.publicUrl;
}
async function defaultHomeFile(){
  try{
   const encoded=localStorage.getItem("futbolito-default-home-logo:"+hub().slug);
   if(!encoded||!/^data:image\/(png|jpeg|webp);base64,/.test(encoded))return null;
   const response=await fetch(encoded),blob=await response.blob();
   if(blob.size>1048576)return null;
   return new File([blob],"escudo-local", {type:blob.type});
  }catch(e){return null;}
 }
 async function saveAppearance(client){
 if(!record)throw Error("Prepara primero el QR.");
 const title=$("hubQrTitle").value.trim();
 if(!title||title.length>100)throw Error("El título debe contener entre 1 y 100 caracteres.");
 const defaultFile=!logoHome&&!$("hubLogoHome").files?.length?await defaultHomeFile():null;
 const newHome=await uploadImage(client,"hubLogoHome",defaultFile),newAway=await uploadImage(client,"hubLogoAway");
 const nextHome=newHome||logoHome,nextAway=newAway||logoAway;
 const response=await client.rpc("update_match_appearance",{
  p_id:record.id,p_title:title,
  p_home_logo_url:nextHome,p_away_logo_url:nextAway
 });
 if(response.error)throw response.error;
 record.title=title;
 logoHome=nextHome;logoAway=nextAway;
 record.home_logo_url=nextHome;record.away_logo_url=nextAway;
 $("hubLogoHome").value="";$("hubLogoAway").value="";
 store();
}
$("hubPrepareQr")?.addEventListener("click",()=>action("hubPrepareQr",async client=>{
 const n=hours(),title=$("hubQrTitle").value.trim();
 const r=await client.rpc("create_match_broadcast",{p_club_id:club.id,p_title:title,p_hours:n});
 if(r.error)throw r.error;
 record={...r.data,title,access_hours:n};
 logoHome=null;logoAway=null;store();
 await saveAppearance(client);
 status("QR preparado. El plazo de "+n+" horas NO ha comenzado.");
}));
$("hubSaveQr")?.addEventListener("click",()=>action("hubSaveQr",async client=>{
 await saveAppearance(client);status("Título y escudos actualizados.");
}));
$("hubPublishQr")?.addEventListener("click",()=>action("hubPublishQr",async client=>{
 if(!record||record.status!=="draft")throw Error("Primero prepara el QR.");
 const n=hours();await saveAppearance(client);
 const r=await client.rpc("publish_match_broadcast",{p_id:record.id,p_hours:n});
 if(r.error)throw r.error;
 Object.assign(record,r.data);record.access_hours=n;store();
 status("Enlace publicado. Vence "+new Date(record.expires_at).toLocaleString("es-CL")+". Ya puedes compartirlo.");
}));
$("hubRenewQr")?.addEventListener("click",()=>action("hubRenewQr",async client=>{
 if(!record)throw Error("No hay un enlace seleccionado.");
 if(!confirm("Este cambio desactiva el QR anterior. ¿Generar uno nuevo?"))return;
 const r=await client.rpc("rotate_match_broadcast_link",{p_id:record.id});
 if(r.error)throw r.error;
 record.token=r.data.token;store();status("QR renovado. El enlace anterior quedó invalidado.");
}));
$("hubStopQr")?.addEventListener("click",()=>action("hubStopQr",async client=>{
 if(!record||!confirm("¿Desactivar el enlace? Los espectadores perderán el acceso."))return;
 const r=await client.rpc("revoke_match_broadcast",{p_id:record.id});
 if(r.error)throw r.error;
 record.status="revoked";store();status("Enlace desactivado. Este QR ya no permitirá ver el partido.");
}));
$("hubCopyQr")?.addEventListener("click",async()=>{
 if(!url())return;
 try{await navigator.clipboard.writeText(url());status("Enlace copiado para compartir.")}
 catch{status("Copia el enlace que aparece debajo del QR.",true)}
});
$("hubWhatsappQr")?.addEventListener("click",()=>{
 if(url())window.open("https://wa.me/?text="+encodeURIComponent("Sigue el partido en vivo: "+url()),"_blank","noopener");
});
window.FutbolitoQr={mount};
})();
