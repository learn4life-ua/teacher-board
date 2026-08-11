(() => {
  'use strict';

  const STORAGE_KEY='teacherboard.v1';
  const clearBtn=document.getElementById('clearBtn');
  const canvas=document.getElementById('boardCanvas');
  const textLayer=document.getElementById('textLayer');
  const objectLayer=()=>document.getElementById('objectLayer');
  const autosaveState=document.getElementById('autosaveState');

  if(!clearBtn || !canvas) return;

  function readData(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return {}}
  }

  function activeIndex(data){
    const len=data.pages?.length||1;
    return Math.max(0,Math.min(Number(data.activePage)||0,len-1));
  }

  function clearCurrentPage(e){
    // Replace the legacy handler: v3 objects live outside the raster canvas.
    e.preventDefault();
    e.stopImmediatePropagation();

    if(!confirm('Очистити поточну сторінку повністю?')) return;

    const ctx=canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.restore();

    if(textLayer) textLayer.innerHTML='';
    if(objectLayer()) objectLayer().innerHTML='';

    const data=readData();
    if(Array.isArray(data.pages) && data.pages.length){
      const i=activeIndex(data);
      const page=data.pages[i];
      page.image=canvas.toDataURL('image/png');
      page.texts=[];
      page.objects=[];
      localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
    }

    document.body.classList.remove('tb-has-selection');
    if(autosaveState) autosaveState.textContent='Збережено';

    // Let auxiliary UI refresh without re-triggering the legacy clear action.
    window.dispatchEvent(new CustomEvent('teacherboard:page-cleared'));
  }

  clearBtn.addEventListener('click',clearCurrentPage,true);
})();
