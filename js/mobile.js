(() => {
  'use strict';
  const mq=window.matchMedia('(max-width:680px)');
  let menu=null,more=null,fitTimer=null;

  function clickById(id){document.getElementById(id)?.click();}
  function closePenControls(){
    const pop=document.querySelector('.tb-mobile-pen-pop');
    if(pop) pop.hidden=true;
  }
  function setMenuOpen(open,{focusTrigger=false}={}){
    if(!menu||!more)return;
    menu.hidden=!open;
    more.setAttribute('aria-expanded',open?'true':'false');
    if(open){
      closePenControls();
      menu.querySelector('[role="menuitem"]')?.focus();
    }else if(focusTrigger){more.focus();}
  }
  function closeMenus(){
    setMenuOpen(false);
    closePenControls();
  }

  function makeMenu(){
    if(menu) return;
    more=document.createElement('button');
    more.className='tb-mobile-more';
    more.type='button';
    more.title='Ще';
    more.textContent='⋮';
    more.setAttribute('aria-label','Додаткові дії');
    more.setAttribute('aria-haspopup','menu');
    more.setAttribute('aria-expanded','false');
    more.setAttribute('aria-controls','tbMobileMenu');
    document.querySelector('.view-actions')?.appendChild(more);

    menu=document.createElement('div');
    menu.className='tb-mobile-menu';
    menu.id='tbMobileMenu';
    menu.hidden=true;
    menu.setAttribute('role','menu');
    menu.setAttribute('aria-label','Додаткові дії');
    menu.innerHTML=`
      <button type="button" role="menuitem" data-act="duplicate">⧉ Дублювати сторінку</button>
      <button type="button" role="menuitem" data-act="png">⇩ Зберегти PNG</button>
      <button type="button" role="menuitem" data-act="pdf">⇩ Заняття PDF</button>
      <button type="button" role="menuitem" data-act="present">▣ Демонстрація</button>
      <button type="button" role="menuitem" data-act="color">● Колір і товщина</button>
      <button type="button" role="menuitem" data-act="clear" class="danger">Очистити сторінку</button>`;
    document.body.appendChild(menu);

    more.addEventListener('click',e=>{
      e.stopPropagation();
      setMenuOpen(menu.hidden);
    });

    menu.addEventListener('click',e=>{
      const b=e.target.closest('[data-act]');if(!b)return;
      e.stopPropagation();
      const a=b.dataset.act;
      setMenuOpen(false);
      if(a==='duplicate')clickById('duplicatePageBtn');
      if(a==='png')clickById('savePngBtn');
      if(a==='pdf')clickById('saveLessonPdfBtn');
      if(a==='present')clickById('presentationBtn');
      if(a==='clear')clickById('clearBtn');
      if(a==='color')openMobilePenControls();
    });

    menu.addEventListener('keydown',e=>{
      const items=[...menu.querySelectorAll('[role="menuitem"]')];
      const current=Math.max(0,items.indexOf(document.activeElement));
      let next=null;
      if(e.key==='ArrowDown')next=(current+1)%items.length;
      if(e.key==='ArrowUp')next=(current-1+items.length)%items.length;
      if(e.key==='Home')next=0;
      if(e.key==='End')next=items.length-1;
      if(e.key==='Escape'){
        e.preventDefault();
        setMenuOpen(false,{focusTrigger:true});
        return;
      }
      if(next!==null){e.preventDefault();items[next]?.focus();}
    });

    document.addEventListener('pointerdown',e=>{
      if(e.target.closest('.tb-mobile-menu,.tb-mobile-more'))return;
      closeMenus();
    },true);

    document.getElementById('mathToggleBtn')?.addEventListener('click',closePenControls,true);
    document.getElementById('closeMathBtn')?.addEventListener('click',closePenControls,true);
    document.querySelector('.toolbar')?.addEventListener('pointerdown',closePenControls,true);
    document.getElementById('boardWrap')?.addEventListener('pointerdown',closePenControls,true);
  }

  function openMobilePenControls(){
    let pop=document.querySelector('.tb-mobile-pen-pop');
    if(!pop){
      pop=document.createElement('div');
      pop.className='tb-mobile-menu tb-mobile-pen-pop';
      pop.style.top='62px';
      pop.hidden=true;
      pop.setAttribute('role','dialog');
      pop.setAttribute('aria-label','Колір і товщина лінії');
      const colors=['#245d55','#1f2c29','#2f5f96','#a44f4a','#76528c','#c79a3b'];
      pop.innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap;padding:8px">${colors.map(c=>`<button type="button" data-color="${c}" aria-label="Вибрати колір ${c}" style="width:44px;height:44px;min-height:44px;border-radius:50%;background:${c};border:2px solid #fff;box-shadow:0 0 0 1px #ccd7d1;padding:0"></button>`).join('')}<input id="tbMobileColor" type="color" value="#245d55" aria-label="Інший колір" style="width:44px;height:44px;border:0;background:none;padding:0"><select id="tbMobileWidth" aria-label="Товщина лінії" style="height:44px;border:1px solid #d9e3dd;border-radius:9px"><option value="2">2 px</option><option value="4" selected>4 px</option><option value="6">6 px</option><option value="10">10 px</option></select><button type="button" class="tb-mobile-pen-close" style="height:44px;min-height:44px;border:1px solid #d9e3dd;border-radius:9px;background:#fff;padding:0 12px">Готово</button></div>`;
      document.body.appendChild(pop);
      pop.querySelectorAll('[data-color]').forEach(b=>b.addEventListener('click',()=>setColor(b.dataset.color)));
      pop.querySelector('#tbMobileColor').addEventListener('input',e=>setColor(e.target.value));
      pop.querySelector('#tbMobileWidth').addEventListener('change',e=>setWidth(e.target.value));
      pop.querySelector('.tb-mobile-pen-close').addEventListener('click',closePenControls);
      pop.addEventListener('pointerdown',e=>e.stopPropagation());
      pop.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closePenControls();more?.focus();}});
    }
    pop.hidden=!pop.hidden;
    if(!pop.hidden)pop.querySelector('button,input,select')?.focus();
  }

  function setColor(c){
    const el=document.getElementById('colorPicker');
    if(el){el.value=c;el.dispatchEvent(new Event('input',{bubbles:true}))}
    const c2=document.getElementById('customColor');
    if(c2){c2.value=c;c2.dispatchEvent(new Event('input',{bubbles:true}))}
  }
  function setWidth(v){
    const el=document.getElementById('lineWidth');
    if(el){el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}))}
    const q=document.getElementById('quickWidth');
    if(q){q.value=v;q.dispatchEvent(new Event('change',{bubbles:true}))}
  }

  function mobileFit(){
    if(!mq.matches)return;
    clearTimeout(fitTimer);fitTimer=setTimeout(()=>document.getElementById('fitBoardBtn')?.click(),120);
  }
  function apply(){
    makeMenu();
    more.hidden=!mq.matches;
    if(!mq.matches){closeMenus();return}
    document.querySelector('.workspace')?.classList.add('math-closed');
    mobileFit();
  }
  mq.addEventListener?.('change',apply);
  window.addEventListener('resize',mobileFit,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(mobileFit,250));
  window.addEventListener('load',()=>setTimeout(mobileFit,250));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
