import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm";
const db=createClient("https://cpqvrmorbwrrorrsobgj.supabase.co","sb_publishable_KDivcfl1sf6CumXuMhi77w_k-01gmD4",{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
const el=id=>document.getElementById(id);
const secret=new URLSearchParams(location.hash.substring(1)).get("codigo")||"";
function status(message,isError=false){
 const x=el("status");x.textContent=message;x.classList.toggle("error",isError);
}
async function refresh(){
 const valid=/^[0-9a-f]{48}$/.test(secret);
 if(!valid){
  el("noToken").hidden=false;el("guest").hidden=true;el("signed").hidden=true;
  status("Falta el código. Solicita o abre de nuevo el enlace de invitación.");return;
 }
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user||!user.email_confirmed_at){
  el("guest").hidden=false;el("signed").hidden=true;el("noToken").hidden=true;
  status(user&&!user.email_confirmed_at?"Confirma primero tu correo y vuelve a abrir este enlace.":"Puedes iniciar sesión o crear una cuenta para activar el acceso.");
  return;
 }
 el("who").textContent="Conectado como "+user.email;
 el("guest").hidden=true;el("signed").hidden=false;el("noToken").hidden=true;
 status("Sesión confirmada. Presiona el botón para aceptar el permiso de tu equipo.");
}
async function doAccount(kind){
 const email=el("email").value.trim().toLowerCase();
 const password=el("password").value;
 if(!email||!password||password.length<8)return status("Completa el correo y una contraseña de al menos 8 caracteres.",true);
 const login=el("login"),sign=el("signup");login.disabled=true;sign.disabled=true;
 try{
  let error;
  if(kind==="signup"){
   const out=await db.auth.signUp({
    email,password,
    options:{emailRedirectTo:location.origin+"/Marcador-futbolito/acceso/"}
   });
   error=out.error;
   if(error)throw error;
   el("password").value="";
   status("Si tu cuenta necesita verificación, revisa el correo. Confirma y abre de nuevo la invitación original. Si tu correo ya está confirmado, vuelve a iniciar sesión.");
  }else{
   const out=await db.auth.signInWithPassword({email,password});
   if(out.error)throw out.error;
   el("password").value="";
   await refresh();
  }
 }catch(e){status(e.message||"No se pudo completar la operación.",true);}
 finally{login.disabled=false;sign.disabled=false;}
}
el("login").addEventListener("click",()=>doAccount("login"));
el("signup").addEventListener("click",()=>doAccount("signup"));
el("signout").addEventListener("click",async()=>{await db.auth.signOut({scope:"local"});await refresh();});
el("redeem").addEventListener("click",async()=>{
 const btn=el("redeem");btn.disabled=true;
 status("Verificando correo, invitación y permisos…");
 try{
  const {data,error}=await db.rpc("redeem_operator_invite",{p_token:secret});
  if(error)throw error;
  const clubs=await db.from("clubs").select("id,slug,name").eq("id",data.club_id).maybeSingle();
  if(clubs.error)throw clubs.error;
  const club=clubs.data;
  const url=club?.slug==="mala-clase"?"/Marcador-futbolito/":
   club?.slug==="larraguibel"?"/Marcador-futbolito/larraguibel/":"/Marcador-futbolito/usuarios/";
  el("activatedDescription").textContent="Permiso de "+(data.role==="manager"?"encargado":"operador")+
   " para "+(club?.name||"tu equipo")+". Vigencia: "+
   (data.access_until?new Intl.DateTimeFormat("es-CL",{dateStyle:"medium"}).format(new Date(data.access_until)):"permanente")+".";
  el("openMatch").href=url;
  el("signed").hidden=true;el("activated").hidden=false;
  status("Invitación aceptada. Ya puedes utilizar el equipo autorizado.");
  history.replaceState(null,"",location.pathname);
 }catch(e){status(e.message||"No fue posible activar la invitación.",true);}
 finally{btn.disabled=false;}
});
refresh().catch(e=>status(e.message||"No se pudo verificar la cuenta.",true));
