import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm";
const db=createClient("https://cpqvrmorbwrrorrsobgj.supabase.co","sb_publishable_KDivcfl1sf6CumXuMhi77w_k-01gmD4",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
let isPlatformAdmin=false,clubs=[],activeClub=null,viewer=null,inFlight=false,myRoles=[];

function showStatus(message,error=false,target="dashboardStatus"){
 const el=$(target);el.textContent=message;el.classList.toggle("error",Boolean(error));
}
function node(tag,className,text){
 const el=document.createElement(tag);
 if(className)el.className=className;
 if(text!==undefined)el.textContent=String(text);
 return el;
}
function option(value,label){
 const o=document.createElement("option");o.value=String(value);o.textContent=label;return o;
}
function createButton(label,className,callback){
 const b=node("button",className,label);b.type="button";
 b.addEventListener("click",async()=>{
  if(b.disabled)return;
  b.disabled=true;
  try{await callback();}catch(err){showStatus(err.message||"Operación no completada.",true);}
  finally{b.disabled=false;}
 });
 return b;
}
function prettyDate(date){
 if(!date)return "Sin vencimiento";
 const d=new Date(date);
 return Number.isNaN(d.getTime())?"Fecha no válida":new Intl.DateTimeFormat("es-CL",{dateStyle:"medium",timeStyle:"short"}).format(d);
}
function isCurrent(row){return row.active&&(!row.access_until||new Date(row.access_until)>new Date());}
function inviteLink(token){
 return location.origin+"/Marcador-futbolito/invitacion/#codigo="+encodeURIComponent(token);
}
function showInvitation(token,kind="operator"){
 const parent=$("inviteResult");parent.replaceChildren();parent.hidden=false;
 parent.append(
  node("strong",null,"✅ Invitación autorizada · "+(kind==="manager"?"Encargado":"Operador")),
  node("p","note","Comparte este enlace con la persona invitada. Deberá confirmar su correo y aceptar el acceso antes de usar el marcador.")
 );
 const a=node("a",null,inviteLink(token));a.href=inviteLink(token);a.target="_blank";a.rel="noopener noreferrer";
 parent.append(a);
 parent.append(createButton("Copiar enlace","primary",async()=>{
  await navigator.clipboard.writeText(a.href);
  showStatus("Enlace copiado. Compártelo por WhatsApp con la persona invitada.");
 }));
}
async function loadCurrent(){
 const {data:userData,error:userError}=await db.auth.getUser();
 if(userError||!userData?.user){
  $("dashboard").hidden=true;$("loginBox").hidden=false;$("logout").hidden=true;
  showStatus("Ingresa con tu correo y contraseña.","", "loginStatus");return;
 }
 viewer=userData.user;
 const claim=await db.rpc("claim_admin_role");if(claim.error)throw claim.error;
 const platform=await db.rpc("is_platform_admin");if(platform.error)throw platform.error;
 isPlatformAdmin=platform.data===true;
 const own=await db.rpc("get_my_club_roles");if(own.error)throw own.error;
 myRoles=(own.data||[]).filter(r=>r.role==="manager");
 if(!isPlatformAdmin&&!myRoles.length){
  $("dashboard").hidden=true;$("loginBox").hidden=false;$("logout").hidden=false;
  showStatus("Tu cuenta no tiene permisos de administración. Puedes utilizar el marcador del equipo que te haya autorizado.","", "loginStatus");
  return;
 }
 let allowed=[];
 if(isPlatformAdmin){
  const {data,error}=await db.from("clubs").select("id,name,slug").order("name");
  if(error)throw error;allowed=data||[];
 }else{
  const allowedIds=myRoles.map(r=>r.club_id);
  const {data,error}=await db.from("clubs").select("id,name,slug").in("id",allowedIds).order("name");
  if(error)throw error;allowed=data||[];
 }
 clubs=allowed;
 $("loginBox").hidden=true;$("dashboard").hidden=false;$("logout").hidden=false;
 $("identity").textContent=viewer.email;
 $("rolePill").textContent=isPlatformAdmin?"Administrador general":"Encargado de equipo";
 const select=$("clubSelect"),previous=activeClub?.id;
 select.replaceChildren();
 clubs.forEach(c=>select.append(option(c.id,c.name)));
 activeClub=clubs.find(c=>c.id===previous)||clubs[0]||null;
 if(activeClub)select.value=activeClub.id;
 const roleSelector=$("inviteRole"),managerOption=[...roleSelector.options].find(o=>o.value==="manager");
 if(managerOption)managerOption.hidden=!isPlatformAdmin;
 if(!isPlatformAdmin)roleSelector.value="operator";
 if(!activeClub){showStatus("Todavía no hay equipos para administrar.");return;}
 await refreshData();
}
async function refreshData(){
 if(!activeClub)return;
 showStatus("Actualizando permisos de "+activeClub.name+"…");
 const [requestResponse,memberResponse]=await Promise.all([
  db.from("operator_access_requests")
    .select("id,email,requested_role,requested_days,status,created_at,invitation_expires_at,requested_by,reviewed_at")
    .eq("club_id",activeClub.id).order("created_at",{ascending:false}).limit(70),
  db.rpc("get_club_access_list",{p_club_id:activeClub.id})
 ]);
 if(requestResponse.error)throw requestResponse.error;
 if(memberResponse.error)throw memberResponse.error;
 const requests=requestResponse.data||[],members=memberResponse.data||[];
 renderRequests(requests);
 renderMembers(members);
 $("statOperators").textContent=members.filter(m=>m.role==="operator"&&isCurrent(m)).length;
 $("statReserved").textContent=requests.filter(r=>r.status==="approved"&&new Date(r.invitation_expires_at)>new Date()).length;
 $("statPending").textContent=requests.filter(r=>r.status==="pending").length;
 showStatus("Permisos verificados · "+activeClub.name);
}
function renderRequests(requests){
 const root=$("requests");root.replaceChildren();
 if(!requests.length){root.append(node("div","empty","Todavía no hay invitaciones."));return;}
 for(const r of requests){
  const card=node("div","entry");
  const head=node("div","entryHead");
  const who=node("strong",null,r.email);
  const label=r.status==="pending"?"Pendiente":r.status==="approved"?
    (new Date(r.invitation_expires_at)>new Date()?"Invitado":"Enlace vencido"):
    r.status==="claimed"?"Aceptada":r.status==="rejected"?"Rechazada":
    r.status==="revoked"?"Cancelada":"Vencida";
  const tag=node("span","pill "+(r.status==="pending"?"wait":r.status==="approved"?"ok":"off"),label);
  head.append(who,tag);
  const meta=node("div","meta",(r.requested_role==="manager"?"Encargado":"Operador")+
    " · "+(r.requested_days===null?"Permanente":String(r.requested_days)+" días")+
    " · Solicitud: "+prettyDate(r.created_at));
  card.append(head,meta);
  const actions=node("div","actions");
  if(r.status==="pending"&&isPlatformAdmin){
   actions.append(
    createButton("Aprobar","primary",async()=>{
     const {data,error}=await db.rpc("review_operator_request",{p_request_id:r.id,p_approve:true});
     if(error)throw error;
     showInvitation(data.token,"operator");
     await refreshData();
    }),
    createButton("Rechazar","danger",async()=>{
     if(!confirm("¿Rechazar acceso solicitado para "+r.email+"?"))return;
     const {error}=await db.rpc("review_operator_request",{p_request_id:r.id,p_approve:false});
     if(error)throw error;await refreshData();
    })
   );
  }
  if(r.status==="approved"&&new Date(r.invitation_expires_at)>new Date()){
   actions.append(createButton("Generar nuevo enlace","",async()=>{
    if(!confirm("¿Invalidar el enlace anterior y crear uno nuevo para "+r.email+"?"))return;
    const {data,error}=await db.rpc("rotate_invitation",{p_request_id:r.id});
    if(error)throw error;showInvitation(data.token,r.requested_role);await refreshData();
   }));
  }
  if(r.status==="approved"||r.status==="pending"){
   actions.append(createButton("Cancelar","danger",async()=>{
    if(!confirm("¿Cancelar la invitación o solicitud de "+r.email+"?"))return;
    const {error}=await db.rpc("cancel_operator_request",{p_request_id:r.id});
    if(error)throw error;await refreshData();
   }));
  }
  if(r.status==="pending"&&!isPlatformAdmin){
   card.append(node("div","meta","Requiere aprobación del administrador general."));
  }
  if(actions.children.length)card.append(actions);
  root.append(card);
 }
}
function renderMembers(members){
 const root=$("members");root.replaceChildren();
 if(!members.length){root.append(node("div","empty","Aún no hay usuarios delegados para este club."));return;}
 for(const m of members){
  const card=node("div","entry"),head=node("div","entryHead");
  head.append(node("strong",null,m.email),
    node("span","pill "+(isCurrent(m)?"ok":"off"),isCurrent(m)?"Activo":m.active?"Vencido":"Suspendido"));
  card.append(head,node("div","meta",
    (m.role==="manager"?"Encargado":"Operador")+" · "+prettyDate(m.access_until)));
  if(isCurrent(m)&&(m.role==="operator"||isPlatformAdmin)){
   card.append(createButton("Suspender acceso","danger",async()=>{
    if(!confirm("¿Suspender el acceso de "+m.email+" a "+activeClub.name+"?"))return;
    const action=m.role==="manager"?"revoke_club_manager":"revoke_operator_access";
    const payload=m.role==="manager"?
     {p_club_id:activeClub.id,p_user_id:m.user_id}:
     {p_club_id:activeClub.id,p_user_id:m.user_id};
    const {error}=await db.rpc(action,payload);if(error)throw error;
    await refreshData();
   }));
  }
  root.append(card);
 }
}
$("inviteForm").addEventListener("submit",async event=>{
 event.preventDefault();if(inFlight||!activeClub)return;
 inFlight=true;$("inviteButton").disabled=true;
 $("inviteResult").hidden=true;
 try{
  const email=$("inviteEmail").value.trim().toLowerCase();
  const daysRaw=$("inviteDays").value,days=daysRaw?Number(daysRaw):null;
  const managerRole=isPlatformAdmin&&$("inviteRole").value==="manager";
  const rpc=managerRole?"invite_club_manager":"request_operator_access";
  const args=managerRole?
   {p_club_id:activeClub.id,p_email:email,p_days:days}:
   {p_club_id:activeClub.id,p_email:email,p_days:days};
  const {data,error}=await db.rpc(rpc,args);
  if(error)throw error;
  if(data?.status==="approved"&&data.token)showInvitation(data.token,managerRole?"manager":"operator");
  else if(data?.status==="pending")showStatus("La solicitud de "+email+" está pendiente de aprobación del administrador general.");
  $("inviteEmail").value="";
  await refreshData();
 }catch(error){showStatus(error.message||"No se pudo enviar la solicitud.",true);}
 finally{inFlight=false;$("inviteButton").disabled=false;}
});
$("clubSelect").addEventListener("change",async()=>{
 activeClub=clubs.find(c=>c.id===$("clubSelect").value)||null;
 $("inviteResult").hidden=true;
 try{await refreshData();}catch(error){showStatus(error.message,true);}
});
$("loginForm").addEventListener("submit",async event=>{
 event.preventDefault();const b=$("loginButton");b.disabled=true;
 try{
  const {error}=await db.auth.signInWithPassword({
   email:$("email").value.trim().toLowerCase(),password:$("password").value
  });
  $("password").value="";
  if(error)throw error;
  await loadCurrent();
 }catch(error){showStatus(error.message,true,"loginStatus");}
 finally{b.disabled=false;}
});
$("logout").addEventListener("click",async()=>{
 await db.auth.signOut({scope:"local"});
 location.reload();
});
loadCurrent().catch(error=>{
 $("loginBox").hidden=false;$("dashboard").hidden=true;
 showStatus(error.message||"No se pudo cargar la administración.",true,"loginStatus");
});
