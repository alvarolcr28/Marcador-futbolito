/* Acceso privado oficial: se verifica sesión y autorización por equipo usando Supabase.
 * GitHub Pages sirve código estático públicamente: esto bloquea el uso normal,
 * pero la seguridad de los datos reside en Supabase (Auth + RLS).
 */
(() => {
  "use strict";
  document.documentElement.classList.add("auth-trial");

const gateNode=document.createElement('section');
gateNode.id='sessionGate';
gateNode.setAttribute('role','region');
gateNode.setAttribute('aria-label','Acceso privado');
gateNode.innerHTML='<div class="gate-card"><h1>🔐 Marcador privado</h1><p>Ingresa con tu correo y contraseña para utilizar el marcador de tu equipo.</p><div id="sessionLoginArea"><form id="sessionForm"><label for="sessionEmail">Correo electrónico</label><input id="sessionEmail" type="email" autocomplete="username" required><label for="sessionPassword">Contraseña</label><input id="sessionPassword" type="password" autocomplete="current-password" required><button id="sessionSubmit" type="submit">Ingresar</button></form></div><p id="sessionMessage" role="status" aria-live="polite">Comprobando sesión y permisos…</p><div id="sessionActions" hidden><strong id="authorizedClub"></strong><small id="sessionUser"></small></div><div class="gate-links"><button id="sessionRetry" type="button">Reintentar</button><button id="sessionLogout" type="button">Cerrar sesión</button><a href="/Marcador-futbolito/inicio/">Inicio</a></div><small class="gate-note">La sesión y los permisos del club se verifican mediante Supabase.</small></div>';
document.body.prepend(gateNode);
const gateStyle=document.createElement('style');
gateStyle.textContent='#sessionGate{position:fixed;inset:0;z-index:999999;display:grid;place-items:center;padding:16px;overflow-y:auto;background:#0b0e18;color:#fff;font:15px system-ui,-apple-system,sans-serif}#sessionGate[hidden],#sessionLoginArea[hidden],#sessionActions[hidden]{display:none!important}.gate-card{width:min(440px,100%);background:linear-gradient(140deg,#282039,#111822);border:1px solid #806592;border-radius:20px;padding:22px;box-shadow:0 18px 50px #0008}.gate-card h1{font-size:25px;margin:0}.gate-card p{line-height:1.5;color:#ddd4e4;font-size:14px}.gate-card form{display:grid;gap:9px;margin-top:18px}.gate-card label{font-size:13px;font-weight:800}.gate-card input{width:100%;box-sizing:border-box;min-height:46px;border:1px solid #887995;background:#0a0e18;color:white;border-radius:10px;padding:9px 11px;font:inherit}.gate-card form button{min-height:49px;font-size:16px;font-weight:850;border:none;border-radius:10px;background:#bc90ee;color:#251331;margin-top:9px}.gate-card form button:disabled{opacity:.5}.gate-links{display:flex;justify-content:center;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px}.gate-links a,.gate-links button{border:none;background:transparent;color:#e3c5ff;font:700 12px system-ui;text-decoration:underline;cursor:pointer}.gate-card small{display:block;color:#bcb1cc;font-size:11px;line-height:1.4;margin-top:10px}';
document.head.append(gateStyle);

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
  const exitButton=document.createElement("button");
  exitButton.id="privateExit";
  exitButton.className="iconbtn";
  exitButton.type="button";
  exitButton.textContent="Salir";
  exitButton.title="Cerrar sesión privada";
  exitButton.setAttribute("aria-label","Cerrar sesión privada");
  exitButton.hidden=true;
  exitButton.style.cssText="font:800 12px system-ui;min-width:48px;border:1px solid #bca0d8;background:#3e2e50;color:#fff";
  (document.querySelector(".top-actions")||document.body).appendChild(exitButton);
  function makeDirectClient(){
  const base=URL_SUPABASE;
  const key=CLAVE_PUBLICA;
  const storageKey="sb-cpqvrmorbwrrorrsobgj-auth-token";
  let refreshInFlight=null;
  function saved(){
    try{const s=JSON.parse(localStorage.getItem(storageKey)||"null");return s&&typeof s.access_token==="string"&&typeof s.refresh_token==="string"?s:null;}catch{return null;}
  }
  function forget(){try{localStorage.removeItem(storageKey);}catch{}}
  function store(s){
    if(!s?.access_token||!s?.refresh_token)throw Error("No se recibió una sesión válida.");
    try{localStorage.setItem(storageKey,JSON.stringify({...s,expires_at:Number(s.expires_at)||Math.floor(Date.now()/1000)+Number(s.expires_in||3600)}));}
    catch{throw Error("No es posible guardar la sesión en este navegador.");}
    return saved();
  }
  async function send(path,{token,method="GET",body,timeout=12000}={}){
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
    try{
      const headers={apikey:key,Accept:"application/json"};
      if(token)headers.Authorization="Bearer "+token;
      if(body!==undefined)headers["Content-Type"]="application/json";
      const r=await fetch(base+"/"+path,{method,headers,cache:"no-store",signal:ctrl.signal,body:body===undefined?undefined:JSON.stringify(body)});
      const raw=await r.text();
      let data=null;try{data=raw?JSON.parse(raw):null;}catch{}
      if(!r.ok){
        const message=data?.msg||data?.message||data?.error_description||data?.error||("Respuesta HTTP "+r.status);
        const e=new Error(typeof message==="string"?message:"No fue posible verificar el acceso.");
        e.status=r.status;throw e;
      }
      return data;
    }catch(e){
      if(e.name==="AbortError")throw Error("Supabase tardó demasiado en responder. Prueba nuevamente o abre el enlace en Safari.");
      throw e;
    }finally{clearTimeout(timer);}
  }
  async function getSession(){
    const current=saved();if(!current)return null;
    if(!Number(current.expires_at)||current.expires_at*1000>Date.now()+30000)return current;
    if(!refreshInFlight)refreshInFlight=send("auth/v1/token?grant_type=refresh_token",{method:"POST",body:{refresh_token:current.refresh_token}})
      .then(store).finally(()=>{refreshInFlight=null;});
    try{return await refreshInFlight;}
    catch(e){if([400,401,403].includes(e.status)){forget();return null;}throw e;}
  }
  async function authenticated(path,opts={}){
    const session=await getSession();
    if(!session)throw Error("Tu sesión no está disponible. Vuelve a iniciar sesión.");
    return send(path,{...opts,token:session.access_token});
  }
  function from(table){
    if(!["clubs","squads","players"].includes(table))throw Error("Consulta no permitida.");
    let columns="*",sort="",single=false;
    const filters=[];
    const builder={
      select(names){columns=names;return this;},
      eq(field,value){filters.push([field,"eq."+String(value)]);return this;},
      in(field,values){filters.push([field,"in.("+values.join(",")+")"]);return this;},
      order(field){sort=field+".asc";return this;},
      maybeSingle(){single=true;return this;},
      then(resolve,reject){
        const params=new URLSearchParams({select:columns});
        for(const [field,value] of filters)params.append(field,value);
        if(sort)params.set("order",sort);
        return authenticated("rest/v1/"+table+"?"+params.toString())
          .then(rows=>({data:single?(rows?.[0]||null):rows,error:null}))
          .then(resolve,reject);
      }
    };
    return builder;
  }
  return {
    auth:{
      async getUser(){
        const session=await getSession();
        if(!session)return {data:{user:null},error:null};
        try{return {data:{user:await send("auth/v1/user",{token:session.access_token})},error:null};}
        catch(e){if([401,403].includes(e.status)){forget();return {data:{user:null},error:null};}throw e;}
      },
      async signInWithPassword({email,password}){
        const session=await send("auth/v1/token?grant_type=password",{method:"POST",body:{email,password},timeout:15000});
        store(session);return {error:null,data:{session,user:session.user}};
      },
      async signOut(){
        const session=saved();
        if(session){
          try{await send("auth/v1/logout?scope=local",{method:"POST",token:session.access_token,timeout:5000});}catch{}
        }
        forget();return {error:null};
      },
      onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}};}
    },
    async rpc(name){return {data:await authenticated("rest/v1/rpc/"+name,{method:"POST",body:{}}),error:null};},
    from
  };
}
  let client=null, authorized=false;
  const clubSwitcher=document.createElement("a");
  clubSwitcher.href="/Marcador-futbolito/inicio/";
  clubSwitcher.textContent="⇄";
  clubSwitcher.title="Cambiar de club";
  clubSwitcher.setAttribute("aria-label","Cambiar de club");
  clubSwitcher.className="iconbtn";
  clubSwitcher.hidden=true;
  clubSwitcher.style.cssText="text-align:center;line-height:46px;text-decoration:none;font-size:22px;min-width:40px;max-width:48px";
  (document.querySelector(".top-actions")||document.body).appendChild(clubSwitcher);

  function showMessage(text, isError=false){
    message.textContent=text;
    message.style.color=isError?"#ffb7be":"#cdd1df";
  }
  function lock(text="Inicia sesión para utilizar este marcador."){
    authorized=false;
    document.documentElement.classList.remove("futbolito-unlocked");
    gate.hidden=false;
    exitButton.hidden=true;
    clubSwitcher.hidden=true;
    loginArea.hidden=false;
    actionArea.hidden=true;
    who.textContent="";
    showMessage(text);
  }
  function unlock(user,club){
    authorized=true;
    document.documentElement.classList.add("futbolito-unlocked");
    gate.hidden=true;
    exitButton.hidden=false;
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
    // Conserva los datos locales del partido; las plantillas se cargan desde Supabase.
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
    // En modo autenticado, la edición oficial de plantillas debe hacerse
    // en Supabase (no en el formulario local del marcador).
    const manage=$("manageTeamsBtn");
    if(manage){
      manage.textContent="⚙ Editar plantillas oficiales";
      manage.onclick=()=>window.open("/Marcador-futbolito/acceso/","_blank","noopener");
    }
  }
  async function verify(){
    showMessage("Comprobando sesión y permisos…");
    const {data:{user},error:userError}=await client.auth.getUser();
    if(userError||!user){lock();return;}
    // El administrador general se activa únicamente con email verificado autorizado.
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
    const generalResult=await client.rpc("is_platform_admin");
    unlock(user,club);
    clubSwitcher.hidden=generalResult.error||generalResult.data!==true;
  }
  function signedOut(){
    if(readAppAvailable()&&state.running) document.getElementById("toggleBtn")?.click();
    lock("Sesión cerrada. Inicia sesión para continuar.");
  }
  async function init(){
    try{
      client=makeDirectClient();
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
  exitButton.addEventListener("click",async()=>{if(client)await client.auth.signOut();signedOut();});
  $("sessionLogout").addEventListener("click",async()=>{
    if(client)await client.auth.signOut();
    signedOut();
  });
  async function revalidateAccess(){
    if(!authorized||!client)return;
    try{
      const [authResult,clubResult]=await Promise.all([
        client.auth.getUser(),
        client.from("clubs").select("id").eq("slug",slug).maybeSingle()
      ]);
      if(authResult.error||!authResult.data?.user){signedOut();return;}
      // Un error de red no es equivalente a una revocación.
      if(!clubResult.error&&!clubResult.data)signedOut();
    }catch(e){/* Sin red, volver a comprobar en el próximo ciclo. */}
  }
  window.addEventListener("storage",e=>{
    if(e.key==="sb-cpqvrmorbwrrorrsobgj-auth-token"&&!e.newValue)signedOut();
  });
  // Comprobar periódicamente cancelaciones y vencimientos mientras la app está abierta.
  setInterval(revalidateAccess,45000);
  document.addEventListener("visibilitychange",()=>{
    if(!document.hidden)revalidateAccess();
  });
  init();
})();
