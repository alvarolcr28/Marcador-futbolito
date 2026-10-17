import{createClient}from"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm";
const db=createClient("https://cpqvrmorbwrrorrsobgj.supabase.co","sb_publishable_KDivcfl1sf6CumXuMhi77w_k-01gmD4",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
let user=null,isAdmin=false,clubs=[],selected=null,record=null,logoHome=null,logoAway=null,history=[];
const defaultTitle="Partido de Futbolito";
function message(text,error=false,success=false,target="status"){
 const x=$(target);x.textContent=text;x.classList.toggle("error",Boolean(error));x.classList.toggle("good",Boolean(success));
}
function urlFor(token){return location.origin+"/Marcador-futbolito/espectador/#partido="+token}
function storageKey(){return selected?"futbolito_live_"+selected.slug:"futbolito_live_unknown"}
function localRecord(){try{return JSON.parse(localStorage.getItem(storageKey()))||null}catch{return null}}
function saveLocal(){if(record)localStorage.setItem(storageKey(),JSON.stringify(record));}
function timeLabel(t){if(!t)return "Sin publicar";return new Intl.DateTimeFormat("es-CL",{dateStyle:"medium",timeStyle:"short"}).format(new Date(t))}
function controls(){
 $("appearance").hidden=!record||record.status==="revoked";
 $("shareSection").hidden=!record?.token||record.status==="revoked";
 $("publishButton").disabled=!record||record.status!=="draft";
 $("revokeButton").disabled=!record||record.status==="revoked";
 $("createButton").disabled=!selected;
 if(record&&record.status!=="revoked"){
  $("matchTitle").value=record.title||defaultTitle;
  $("hours").value=record.access_hours||6;
  displayShare();
 }else{$("shareSection").hidden=true;}
}
function displayShare(){
 const token=record?.token;
 if(!token)return;
 const link=urlFor(token),urlEl=$("shareUrl");
 urlEl.href=link;urlEl.textContent=link;
 const qr=$("qrHolder");qr.replaceChildren();
 try{
  if(typeof window.qrcode!=="function")throw Error("Módulo QR no disponible");
  const code=window.qrcode(0,"M");code.addData(link);code.make();
  const svg=code.createSvgTag({cellSize:5,margin:2,scalable:true});
  const div=document.createElement("div");div.innerHTML=svg;qr.append(...div.childNodes);
 }catch(e){
  const p=document.createElement("p");p.className="note";
  p.textContent="Puedes compartir el enlace. El QR no pudo cargarse; revisa la conexión.";qr.append(p);
 }
 let text=record.status==="draft"?
  "QR preparado, todavía no publicado. El plazo no ha comenzado.":
  record.status==="finished"?
  "Partido finalizado. El resultado sigue visible hasta "+timeLabel(record.expires_at):
  "Visible hasta "+timeLabel(record.expires_at)+".";
 $("publishInfo").textContent=text;
}
async function refreshHistory(){
 if(!selected)return;
 const {data,error}=await db.rpc("list_match_broadcasts",{p_club_id:selected.id});
 if(error)throw error;history=Array.isArray(data)?data:[];
 const h=$("history");h.replaceChildren();
 if(!history.length){const p=document.createElement("p");p.className="note";p.textContent="No hay enlaces creados todavía.";h.append(p);return;}
 for(const m of history){
  const row=document.createElement("div");row.className="linkitem";
  const title=document.createElement("strong");title.textContent=m.title||"Partido";
  const details=document.createElement("small");
  details.textContent=m.status==="draft"?"Borrador, aún sin publicar":
   m.status==="revoked"?"Desactivado":
   new Date(m.expires_at)<=new Date()?"Vencido":
   m.status==="finished"?"Finalizado · enlace válido hasta "+timeLabel(m.expires_at):
   "En vivo · válido hasta "+timeLabel(m.expires_at);
  const buttons=document.createElement("div");buttons.className="actions";
  if(record?.id===m.id){
   const tag=document.createElement("small");tag.textContent="Seleccionado";buttons.append(tag);
  }else if(m.status!=="revoked"&&(!m.expires_at||new Date(m.expires_at)>new Date())){
   const pick=document.createElement("button");pick.textContent="Gestionar";
   pick.addEventListener("click",()=>{record=Object.assign({},m);logoHome=m.home_logo_url||null;logoAway=m.away_logo_url||null;saveLocal();controls();message("Enlace seleccionado. Si no conservas el QR, utiliza «Crear otro enlace» para recuperarlo.")});
   buttons.append(pick);
  }
  if(m.status!=="revoked"&&(!m.expires_at||new Date(m.expires_at)>new Date())){
   const rotate=document.createElement("button");rotate.textContent="Crear otro enlace";
   rotate.addEventListener("click",async()=>{
    if(!confirm("El enlace anterior dejará de funcionar inmediatamente. ¿Generar uno nuevo?"))return;
    rotate.disabled=true;
    try{
     const {data,error}=await db.rpc("rotate_match_broadcast_link",{p_id:m.id});
     if(error)throw error;
     record={...m,token:data.token};saveLocal();controls();message("Enlace anterior invalidado. Copia o comparte el nuevo QR.",false,true);
    }catch(e){message(e.message,true)}finally{rotate.disabled=false}
   });
   buttons.append(rotate);
  }
  row.append(title,details,buttons);h.append(row);
 }
}
async function changeClub(){
 selected=clubs.find(c=>c.id===$("clubSelect").value)||null;
 logoHome=null;logoAway=null;
 record=selected?localRecord():null;
 const saved=record&&record.id;
 const r=await db.rpc("list_match_broadcasts",{p_club_id:selected.id});
 if(r.error)throw r.error;
 history=Array.isArray(r.data)?r.data:[];
 const match=history.find(m=>m.id===saved);
 if(!match){record=null;localStorage.removeItem(storageKey())}
 else{record={...match,token:record?.token};logoHome=match.home_logo_url||null;logoAway=match.away_logo_url||null;saveLocal()}
 $("matchTitle").value=record?.title||defaultTitle;$("hours").value=record?.access_hours||6;
 controls();await refreshHistory();
 message(record?"Enlace de "+selected.name+" cargado.":"Prepara un nuevo enlace para "+selected.name+".");
}
async function load(){
 const {data:{user:authUser},error:authError}=await db.auth.getUser();
 if(authError||!authUser){
  $("dashboard").hidden=true;$("loginBox").hidden=false;$("logout").hidden=true;
  message("Inicia sesión con tu correo y contraseña.",false,false,"loginStatus");return;
 }
 user=authUser;
 await db.rpc("claim_admin_role");
 const [adminResp,rolesResp]=await Promise.all([db.rpc("is_platform_admin"),db.rpc("get_my_club_roles")]);
 if(adminResp.error)throw adminResp.error;if(rolesResp.error)throw rolesResp.error;
 isAdmin=adminResp.data===true;
 const manages=(rolesResp.data||[]).filter(x=>x.role==="manager").map(x=>x.club_id);
 if(!isAdmin&&!manages.length){
  $("loginBox").hidden=false;$("dashboard").hidden=true;$("logout").hidden=false;
  message("Puedes operar el marcador, pero solo un administrador o encargado puede generar el QR.",true,false,"loginStatus");
  return;
 }
 const {data:allowed,error}=await db.from("clubs").select("id,name,slug").order("name");
 if(error)throw error;
 clubs=(allowed||[]).filter(x=>isAdmin||manages.includes(x.id));
 $("clubSelect").replaceChildren(...clubs.map(c=>{const o=document.createElement("option");o.value=c.id;o.textContent=c.name;return o;}));
 if(!clubs.length)throw Error("No tienes clubes disponibles.");
 $("dashboard").hidden=false;$("loginBox").hidden=true;$("logout").hidden=false;
 $("clubSelect").value=clubs[0].id;await changeClub();
}
$("clubSelect").addEventListener("change",()=>changeClub().catch(e=>message(e.message,true)));
$("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();const btn=$("loginButton");btn.disabled=true;
 try{
  const {error}=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
  $("password").value="";
  if(error)throw error;await load();
 }catch(x){message(x.message,true,false,"loginStatus")}finally{btn.disabled=false}
});
$("logout").addEventListener("click",async()=>{await db.auth.signOut({scope:"local"});location.reload()});
$("createButton").addEventListener("click",async()=>{
 if(!selected)return;
 if(record?.status==="live"&&new Date(record.expires_at)>new Date()){
  if(!confirm("Ya tienes un enlace activo. Un segundo partido podría competir por la transmisión. ¿Continuar?"))return;
 }
 const hrs=Number($("hours").value),title=$("matchTitle").value.trim();
 if(!Number.isInteger(hrs)||hrs<3||hrs>24)return message("Elige entre 3 y 24 horas.",true);
 const b=$("createButton");b.disabled=true;
 try{
  const {data,error}=await db.rpc("create_match_broadcast",{p_club_id:selected.id,p_title:title,p_hours:hrs});
  if(error)throw error;
  record={...data,title,access_hours:hrs};logoHome=null;logoAway=null;
  saveLocal();controls();await refreshHistory();
  message("QR preparado. Las "+hrs+" horas comenzarán únicamente cuando pulses «Publicar enlace».",false,true);
 }catch(e){message(e.message,true)}finally{b.disabled=false}
});
async function uploadLogo(input){
 if(!input.files?.length)return null;
 const file=input.files[0];
 if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>1048576)
  throw Error("Cada escudo debe ser PNG, JPG o WebP y ocupar como máximo 1 MB.");
 const ext=file.type==="image/png"?"png":file.type==="image/jpeg"?"jpg":"webp";
 const key=selected.id+"/"+record.id+"/"+crypto.randomUUID()+"."+ext;
 const {error}=await db.storage.from("futbolito-escudos").upload(key,file,{upsert:false,contentType:file.type,cacheControl:"3600"});
 if(error)throw error;
 return db.storage.from("futbolito-escudos").getPublicUrl(key).data.publicUrl;
}
async function saveAppearance(){
 if(!record)throw Error("Prepara primero el QR.");
 const title=$("matchTitle").value.trim();
 const newHome=await uploadLogo($("homeImage"));
 const newAway=await uploadLogo($("awayImage"));
 if(newHome)logoHome=newHome;
 if(newAway)logoAway=newAway;
 const {error}=await db.rpc("update_match_appearance",{
  p_id:record.id,p_title:title,
  p_home_logo_url:logoHome,p_away_logo_url:logoAway
 });
 if(error)throw error;
 record.title=title;record.home_logo_url=logoHome;record.away_logo_url=logoAway;saveLocal();
 $("homeImage").value="";$("awayImage").value="";
}
$("saveAppearance").addEventListener("click",async()=>{
 const b=$("saveAppearance");b.disabled=true;
 try{await saveAppearance();message("Título y escudos actualizados para los espectadores.",false,true);await refreshHistory();}
 catch(e){message(e.message,true)}finally{b.disabled=false}
});
$("publishButton").addEventListener("click",async()=>{
 if(!record||record.status!=="draft")return;
 const hrs=Number($("hours").value);
 if(!Number.isInteger(hrs)||hrs<3||hrs>24)return message("Elige entre 3 y 24 horas.",true);
 const btn=$("publishButton");btn.disabled=true;
 try{
  await saveAppearance();
  const {data,error}=await db.rpc("publish_match_broadcast",{p_id:record.id,p_hours:hrs});
  if(error)throw error;
  record={...record,...data,access_hours:hrs};
  saveLocal();controls();await refreshHistory();
  message("¡Publicado! El tiempo empezó ahora. Mantén abierto el marcador del operador para enviar datos en vivo.",false,true);
 }catch(e){message(e.message,true)}finally{controls()}
});
$("revokeButton").addEventListener("click",async()=>{
 if(!record||!confirm("¿Desactivar ahora este QR? Todos los espectadores perderán acceso."))return;
 const {data,error}=await db.rpc("revoke_match_broadcast",{p_id:record.id});
 if(error)return message(error.message,true);
 if(data){record.status="revoked";saveLocal();controls();await refreshHistory();message("Acceso público desactivado.",false,true)}
});
$("copyUrl").addEventListener("click",async()=>{
 try{await navigator.clipboard.writeText(urlFor(record.token));message("Enlace copiado.",false,true)}
 catch(e){message("Selecciona el enlace y cópialo manualmente.",true)}
});
$("shareWhatsapp").addEventListener("click",()=>{
 if(!record?.token)return;
 const link=urlFor(record.token);
 window.open("https://wa.me/?text="+encodeURIComponent("Sigue el partido de Futbolito en vivo: "+link),"_blank","noopener");
});
$("openOperator").addEventListener("click",()=>{
 if(!selected)return;
 const url=selected.slug==="larraguibel"?"../larraguibel/":"../";
 location.href=url;
});
load().catch(e=>message(e.message,true,false,"loginStatus"));
