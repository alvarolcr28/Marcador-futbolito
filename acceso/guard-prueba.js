/* Prueba de acceso privado — interfaz protegida por sesión; datos remotos con RLS.
 * GitHub Pages sirve código estático públicamente: esto bloquea el uso normal,
 * pero la seguridad de los datos reside en Supabase (Auth + RLS).
 */
(() => {
  "use strict";
  const URL_SUPABASE="https://cpqvrmorbwrrorrsobgj.supabase.co";
  const CLAVE_PUBLICA="sb_publishable_KDivcfl1sf6CumXuMhi77w_k-01gmD4";
  const slug=document.documentElement.dataset.club||"mala-clase";
  const $=id=>document.getElementById(id);
  const gate=$("sessionGate");
  const form=$("sessionForm");
  const message=$("sessionMessage");
  const loginArea=$("sessionLoginArea");
  const actionArea=$("sessionActions");
  const who=$("sessionUser");
  let client=null, authorized=false;

  function showMessage(text, isError=false){
    message.textContent=text;
    message.style.color=isError?"#ffb7be":"#cdd1df";
  }
  function lock(text="Inicia sesión para utilizar este marcador."){
    authorized=false;
    document.documentElement.classList.remove("futbolito-unlocked");
    gate.hidden=false;
    loginArea.hidden=false;
    actionArea.hidden=true;
    who.textContent="";
    showMessage(text);
  }
  function unlock(user,club){
    authorized=true;
    document.documentElement.classList.add("futbolito-unlocked");
    gate.hidden=true;
    loginArea.hidden=true;
    actionArea.hidden=false;
    who.textContent=user?.email||"Usuario autorizado";
    $("authorizedClub").textContent=club.name;
  }
  function readAppAvailable(){
    return typeof state!=="undefined" && typeof populateTeamSelectors==="function"
      && typeof populatePlayerSelect==="function" && typeof render==="function";
  }
  async function loadOfficialRosters(club){
    // El registro del partido sigue local para no alterar encuentros ya iniciados.
    // Las plantillas, en cambio, se consultan del servidor tras verificar permisos.
    const {data:squads,error:squadsError}=await client.from("squads")
      .select("id,name").eq("club_id",club.id).order("name");
    if(squadsError)throw squadsError;
    if(!Array.isArray(squads)||!squads.length)throw Error("Este equipo todavía no tiene plantillas.");
    const ids=squads.map(s=>s.id);
    const {data:players,error:playersError}=await client.from("players")
      .select("squad_id,shirt_number,display_name,sort_order")
      .in("squad_id",ids).order("sort_order");
    if(playersError)throw playersError;
    if(!readAppAvailable())throw Error("El marcador no terminó de cargar. Recarga la página.");
    const teams={};
    for(const sq of squads){
      teams[sq.name]=(players||[]).filter(p=>p.squad_id===sq.id)
        .map(p=>[String(p.shirt_number),String(p.display_name)]);
    }
    for(const name of Object.keys(state.teams||{}))delete state.teams[name];
    Object.assign(state.teams,teams);
    state.officialTeamNames=Object.keys(teams);
    // Evita sobrescribir los datos autenticados con el archivo público v1.
    state.officialRosterVersion=Math.max(999999,Number(state.officialRosterVersion)||0);
    const chosen=teams[state.homeTeam]?state.homeTeam:Object.keys(teams)[0];
    state.homeTeam=chosen;
    populateTeamSelectors(chosen,chosen);
    $("homeTeam").value=chosen;
    populatePlayerSelect();
    render();
  }
  async function verify(){
    showMessage("Comprobando sesión y permisos…");
    const {data:{user},error:userError}=await client.auth.getUser();
    if(userError||!user){lock();return;}
    // El bootstrap está limitado por la lista de correo verificado del servidor.
    const {error:claimErr}=await client.rpc("claim_admin_role");
    if(claimErr)throw claimErr;
    const {data:clubs,error:clubsErr}=await client.from("clubs")
      .select("id,name,slug").eq("slug",slug);
    if(clubsErr)throw clubsErr;
    const club=clubs?.[0];
    if(!club){
      lock("Tu cuenta no tiene acceso a este club. Solicita autorización al administrador.");
      return;
    }
    await loadOfficialRosters(club);
    unlock(user,club);
  }
  function signedOut(){
    if(readAppAvailable()&&state.running) document.getElementById("toggleBtn")?.click();
    lock("Sesión cerrada. Inicia sesión para continuar.");
  }
  async function init(){
    try{
      const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm");
      client=createClient(URL_SUPABASE,CLAVE_PUBLICA,{
        auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}
      });
      client.auth.onAuthStateChange((event)=>{
        if(event==="SIGNED_OUT") signedOut();
      });
      await verify();
    }catch(error){
      lock("No fue posible validar el acceso. Comprueba tu conexión y vuelve a intentar.");
      showMessage(error?.message||"No se pudo conectar con Supabase.",true);
    }
  }
  form.addEventListener("submit",async (event)=>{
    event.preventDefault();
    if(!client)return;
    const submit=$("sessionSubmit");
    submit.disabled=true;
    showMessage("Iniciando sesión…");
    try{
      const email=$("sessionEmail").value.trim();
      const password=$("sessionPassword").value;
      const {error}=await client.auth.signInWithPassword({email,password});
      $("sessionPassword").value="";
      if(error)throw error;
      await verify();
    }catch(error){
      lock("No fue posible iniciar sesión.");
      showMessage(error?.message||"Revisa tus credenciales.",true);
    }finally{submit.disabled=false;}
  });
  $("sessionRetry").addEventListener("click",()=>client&&verify().catch(e=>showMessage(e.message,true)));
  $("sessionLogout").addEventListener("click",async()=>{
    if(client)await client.auth.signOut();
    signedOut();
  });
  document.addEventListener("visibilitychange",()=>{
    if(!document.hidden&&authorized&&client){
      // Revalida el servidor al volver a usar la aplicación.
      client.auth.getUser().then(({data,error})=>{
        if(error||!data?.user)signedOut();
      }).catch(()=>signedOut());
    }
  });
  init();
})();
