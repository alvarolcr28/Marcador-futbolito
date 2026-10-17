/* Futbolito: trabajador para Web Push (sin caché de páginas privadas). */
self.addEventListener("push",event=>{
 let payload={title:"⚽ Futbolito",body:"Tienes una nueva solicitud pendiente.",url:"/Marcador-futbolito/usuarios/"};
 try{const data=event.data?.json();if(data&&typeof data==="object")payload={...payload,...data};}catch{}
 const url=new URL(payload.url||"/Marcador-futbolito/usuarios/",self.location.origin);
 if(url.origin!==self.location.origin||!url.pathname.startsWith("/Marcador-futbolito/"))url.pathname="/Marcador-futbolito/usuarios/";
 event.waitUntil(self.registration.showNotification(String(payload.title||"Futbolito").slice(0,100),{
  body:String(payload.body||"Nueva solicitud pendiente").slice(0,220),
  icon:"/Marcador-futbolito/inicio/icon.svg",
  badge:"/Marcador-futbolito/inicio/icon.svg",
  tag:"futbolito-solicitud-acceso",renotify:true,
  data:{url:url.href}
 }));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const destination=event.notification.data?.url||"/Marcador-futbolito/usuarios/";
 event.waitUntil((async()=>{
  const tabs=await clients.matchAll({type:"window",includeUncontrolled:true});
  for(const tab of tabs){if(tab.url.startsWith(self.location.origin+"/Marcador-futbolito/usuarios/")){await tab.focus();return}}
  await clients.openWindow(destination);
 })());
});