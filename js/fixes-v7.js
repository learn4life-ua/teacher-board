(() => {
  'use strict';
  const STORAGE_KEY='teacherboard.v1';

  function readData(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return {}}
  }
  function activeIndex(data){
    const len=data.pages?.length||1;
    return Math.max(0,Math.min(Number(data.activePage)||0,len-1));
  }
  function objectById(id){
    const data=readData();
    return data.pages?.[activeIndex(data)]?.objects?.find(o=>o.id===id)||null;
  }

  function patchNumberLine(el){
    const svg=el.querySelector('svg');
    if(!svg)return;
    const paths=[...svg.querySelectorAll('path')];
    // Replace the old two-ended arrow path with one arrowhead at +x only.
    const arrowPath=paths.find(p=>/M4 50/.test(p.getAttribute('d')||'') && /M96 50/.test(p.getAttribute('d')||''));
    if(arrowPath) arrowPath.setAttribute('d','M96 50 L91 46 M96 50 L91 54');
  }

  function patchAxes(el){
    const svg=el.querySelector('svg');
    if(!svg)return;
    const paths=[...svg.querySelectorAll('path')];
    const arrowPath=paths.find(p=>/M95 50/.test(p.getAttribute('d')||'') || /M50 5/.test(p.getAttribute('d')||''));
    if(arrowPath) arrowPath.setAttribute('d','M95 50 L90 46 M95 50 L90 54 M50 5 L46 10 M50 5 L54 10');
  }

  function patchObjects(){
    document.querySelectorAll('.tb-object[data-id]').forEach(el=>{
      const obj=objectById(el.dataset.id);
      if(!obj||obj.kind!=='shape')return;
      if(String(obj.shape).startsWith('number')) patchNumberLine(el);
      if(obj.shape==='axes') patchAxes(el);
    });
  }

  function patchMenus(){
    document.querySelectorAll('.tb-shape-menu [data-shape="number5"], .tb-shape-menu [data-shape="number10"], .tb-shape-menu [data-shape="numberBlank"]').forEach(btn=>{
      btn.textContent=btn.textContent.replace(/^\s*↔\s*/,'→ ');
    });
  }

  function init(){
    patchMenus();patchObjects();
    const layer=document.getElementById('objectLayer');
    if(layer)new MutationObserver(()=>patchObjects()).observe(layer,{childList:true,subtree:true});
    new MutationObserver(()=>{patchMenus();patchObjects()}).observe(document.body,{childList:true,subtree:true});
    window.addEventListener('storage',patchObjects);
    window.addEventListener('resize',()=>setTimeout(patchObjects,40));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,50));else setTimeout(init,50);
})();
