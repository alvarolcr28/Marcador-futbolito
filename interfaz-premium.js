(function enhanceBoard(){
 "use strict";
 const $=id=>document.getElementById(id);
 const head=document.querySelector(".quick-head"),wrap=document.querySelector(".quick-time-wrap");
 if(!head||!wrap||$("quickMatchStatus"))return;
 const badge=document.createElement("div");
 badge.id="quickMatchStatus";
 badge.className="quick-match-status";
 badge.setAttribute("role","status");
 badge.setAttribute("aria-live","off");
 badge.textContent="LISTO PARA INICIAR";
 const progress=document.createElement("div");
 progress.className="quick-time-progress";
 progress.setAttribute("role","progressbar");
 progress.setAttribute("aria-label","Avance del tiempo actual");
 progress.setAttribute("aria-valuemin","0");
 progress.setAttribute("aria-valuemax","100");
 const bar=document.createElement("span");
 progress.append(bar);wrap.append(badge,progress);
 function sync(){
  if(typeof state==="undefined")return;
  const completed=state.period===3;
  const playing=Boolean(state.running);
  head.dataset.playing=String(playing);
  head.dataset.finished=String(completed);
  badge.textContent=completed?"FINALIZADO":playing?"● EN JUEGO":Number(state.elapsed)>0?"Ⅱ PAUSADO":"LISTO PARA INICIAR";
  const seconds=Math.max(60,Math.min(90,Number(state.halfMinutes)||25)*60);
  const pct=completed?100:Math.max(0,Math.min(100,Math.round(Number(state.elapsed||0)/seconds*100)));
  bar.style.width=pct+"%";
  progress.setAttribute("aria-valuenow",String(pct));
 }
 const before=render;
 render=function(...args){const result=before.apply(this,args);sync();return result;};
 sync();
})();