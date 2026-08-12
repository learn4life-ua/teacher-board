(() => {
  'use strict';

  function patchObject(el){
    const svg=el?.querySelector('svg');
    if(!svg) return;

    // Angle: mirror the current template so its opening matches the usual classroom orientation.
    const anglePath=svg.querySelector('path[d="M5 92 H43 L96 8"]');
    if(anglePath){
      svg.style.transform='scaleX(-1)';
      svg.style.transformOrigin='center';
      svg.dataset.tbAngleMirrored='1';
    }

    // On the -10…10 number line, 21 labels are too dense on phones.
    // Keep even values only; ticks remain at every integer.
    const labels=[...svg.querySelectorAll('text')];
    if(labels.length>=20){
      labels.forEach(label=>{
        const n=Number(label.textContent);
        if(Number.isFinite(n) && Math.abs(n%2)===1) label.style.display='none';
        label.setAttribute('font-size','7');
      });
    }
  }

  function patchAll(){
    document.querySelectorAll('.tb-object').forEach(patchObject);
  }

  const start=()=>{
    patchAll();
    const layer=document.getElementById('objectLayer');
    if(layer){
      new MutationObserver(()=>requestAnimationFrame(patchAll)).observe(layer,{childList:true,subtree:true});
    }
    window.addEventListener('resize',()=>requestAnimationFrame(patchAll),{passive:true});
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(start,0));
  else setTimeout(start,0);
})();
