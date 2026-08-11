(() => {
  'use strict';
  const mq=window.matchMedia('(max-width:680px)');
  let menu=null,more=null,fitTimer=null;

  function clickById(id){document.getElementById(id)?.click();}
  function makeMenu(){
    if(menu) return;
    more=document.createElement('button');
    more.className='tb-mobile-more';more.type='button';more.title='Ще';more.textContent='⋮';
    document.querySelector('.view-actions')?.appendChild(more);
    menu=document.createElement('div');menu.className='tb-mobile-menu';menu.hidden=true;
    menu.innerHTML=`
      <button data-act="duplicate">⧉ Дублювати сторінку</button>
      <button data-act="png">⇩ Зберегти PNG</button>
      <button data-act="pdf">⇩ Заняття PDF</button>
      <button data-act="present">▣ Демонстрація</button>
      <button data-act="color">● Колір і товщина</button>
      <button data-act="clear" class="danger">Очистити сторінку</button>`;
    document.body.appendChild(menu);
    more.addEventListener('click',e=>{e.stopPropagation();menu.hidden=!menu.hidden});
    menu.addEventListener('click',e=>{
      const b=e.target.closest('[data-act]');if(!b)return;menu.hidden=true;
      const a=b.dataset.act;
      if(a==='duplicate')clickById('duplicatePageBtn');
      if(a==='png')clickById('savePngBtn');
      if(a==='pdf')clickById('saveLessonPdfBtn');
      if(a==='present')clickById('presentationBtn');
      if(a==='clear')clickById('clearBtn');
      if(a==='color')openMobilePenControls();
    });
    document.addEventListener('click',()=>{if(menu)menu.hidden=true});
  }

  function openMobilePenControls(){
    let pop=document.querySelector('.tb-mobile-pen-pop');
    if(!pop){
      pop=document.createElement('div');pop.className='tb-mobile-menu tb-mobile-pen-pop';
      pop.style.top='62px';
      const colors=['#245d55','#1f2c29','#2f5f96','#a44f4a','#76528c','#c79a3b'];
      pop.innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap;padding:8px">${colors.map(c=>`<button data-color="${c}" style="width:38px;height:38px;min-height:38px;border-radius:50%;background:${c};border:2px solid #fff;box-shadow:0 0 0 1px #ccd7d1;padding:0"></button>`).join('')}<input id="tbMobileColor" type="color" value="#245d55" style="width:38px;height:38px;border:0;background:none;padding:0"><select id="tbMobileWidth" style="height:38px;border:1px solid #d9e3dd;border-radius:9px"><option value="2">2 px</option><option value="4" selected>4 px</option><option value="6">6 px</option><option value="10">10 px</option></select></div>`;
      document.body.appendChild(pop);
      pop.querySelectorAll('[data-color]').forEach(b=>b.addEventListener('click',()=>setColor(b.dataset.color)));
      pop.querySelector('#tbMobileColor').addEventListener('input',e=>setColor(e.target.value));
      pop.querySelector('#tbMobileWidth').addEventListener('change',e=>setWidth(e.target.value));
      pop.addEventListener('click',e=>e.stopPropagation());
    }
    pop.hidden=false;
  }
  function setColor(c){const el=document.getElementById('colorPicker');if(el){el.value=c;el.dispatchEvent(new Event('input',{bubbles:true}))}const c2=document.getElementById('customColor');if(c2){c2.value=c;c2.dispatchEvent(new Event('input',{bubbles:true}))}}
  function setWidth(v){const el=document.getElementById('lineWidth');if(el){el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}))}const q=document.getElementById('quickWidth');if(q){q.value=v;q.dispatchEvent(new Event('change',{bubbles:true}))}}

  function mobileFit(){
    if(!mq.matches)return;
    clearTimeout(fitTimer);fitTimer=setTimeout(()=>document.getElementById('fitBoardBtn')?.click(),120);
  }
  function apply(){
    makeMenu();
    more.hidden=!mq.matches;
    if(!mq.matches){menu.hidden=true;document.querySelector('.tb-mobile-pen-pop')?.setAttribute('hidden','');return}
    document.querySelector('.workspace')?.classList.add('math-closed');
    mobileFit();
  }
  mq.addEventListener?.('change',apply);
  window.addEventListener('resize',mobileFit,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(mobileFit,250));
  window.addEventListener('load',()=>setTimeout(mobileFit,250));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
