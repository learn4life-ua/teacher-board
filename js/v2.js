(() => {
  'use strict';

  const STORAGE_KEY='teacherboard.v1';
  const HEIGHTS_KEY='teacherboard.pageHeights.v1';
  const canvas=document.getElementById('boardCanvas');
  const ctx=canvas.getContext('2d');
  const board=document.getElementById('board');
  const boardWrap=document.getElementById('boardWrap');
  const viewport=document.getElementById('boardViewport');
  const workspace=document.querySelector('.workspace');
  const pagebar=document.querySelector('.pagebar');
  const pagesEl=document.getElementById('pages');
  const textLayer=document.getElementById('textLayer');

  let customShape=null;
  let shapeStart=null;
  let shapeSnapshot=null;
  let customDrawing=false;

  function getData(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return {}}
  }
  function setData(data){localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}
  function getHeights(){
    try{return JSON.parse(localStorage.getItem(HEIGHTS_KEY)||'[]')}catch{return []}
  }
  function setHeights(h){localStorage.setItem(HEIGHTS_KEY,JSON.stringify(h))}
  function activeIndex(){const d=getData();return Math.max(0,Number(d.activePage)||0)}

  function addTopControls(){
    const top=document.querySelector('.top-actions');
    const colors=['#245d55','#1f2c29','#2f5f96','#a44f4a','#76528c','#c79a3b'];
    const controls=document.createElement('div');
    controls.className='pen-controls';
    controls.innerHTML='<span class="control-label">Перо</span><div class="color-swatches"></div><input id="customColor" type="color" value="#245d55" title="Інший колір"><select id="quickWidth" title="Товщина"><option value="2">2</option><option value="4" selected>4</option><option value="6">6</option><option value="10">10</option></select>';
    const sw=controls.querySelector('.color-swatches');
    colors.forEach((c,i)=>{const b=document.createElement('button');b.className='color-swatch'+(i===0?' active':'');b.style.background=c;b.title=c;b.addEventListener('click',()=>applyColor(c,b));sw.appendChild(b)});
    top.appendChild(controls);
    const custom=controls.querySelector('#customColor');
    custom.addEventListener('input',()=>applyColor(custom.value,null));
    const qw=controls.querySelector('#quickWidth');
    qw.addEventListener('change',()=>{const old=document.getElementById('lineWidth');if(old){old.value=qw.value;old.dispatchEvent(new Event('change',{bubbles:true}))}});

    const fit=document.createElement('button');
    fit.className='icon-btn fit-btn';fit.id='fitBoardBtn';fit.title='Підігнати дошку до екрана';fit.textContent='↔';
    document.querySelector('.view-actions').prepend(fit);
    fit.addEventListener('click',fitBoard);

    const present=document.createElement('button');
    present.className='action-btn presentation-btn';present.id='presentationBtn';present.innerHTML='▣ <span class="long-label">Демонстрація</span>';
    top.appendChild(present);
    present.addEventListener('click',togglePresentation);

    const pdf=document.createElement('button');
    pdf.className='action-btn';pdf.id='saveLessonPdfBtn';pdf.textContent='⇩ Заняття PDF';
    top.appendChild(pdf);
    pdf.addEventListener('click',exportLessonPdf);
  }

  function applyColor(color,button){
    const old=document.getElementById('colorPicker');
    if(old){old.value=color;old.dispatchEvent(new Event('input',{bubbles:true}))}
    document.querySelectorAll('.color-swatch').forEach(b=>b.classList.toggle('active',b===button));
    const custom=document.getElementById('customColor');if(custom) custom.value=color;
  }

  function addShapeMenu(){
    const toolbar=document.querySelector('.toolbar');
    const launcher=document.createElement('button');
    launcher.className='tool shape-launcher';launcher.title='Фігури';launcher.innerHTML='<span>◇</span><em>Фігури</em>';
    const lineBtn=toolbar.querySelector('[data-tool="line"]');
    toolbar.insertBefore(launcher,lineBtn);

    const pop=document.createElement('div');pop.className='shape-popover';pop.hidden=true;pop.innerHTML=`
      <button data-shape="triangle">△ Трикутник</button>
      <button data-shape="rightTriangle">◿ Прямокутний</button>
      <button data-shape="parallelogram">▱ Паралелограм</button>
      <button data-shape="trapezoid">⏢ Трапеція</button>
      <button data-shape="rhombus">◇ Ромб</button>
      <button data-shape="angle">∠ Кут</button>
      <button data-shape="arc">⌒ Дуга</button>
      <button data-shape="numberLine">↔ Числова вісь</button>`;
    document.body.appendChild(pop);
    launcher.addEventListener('click',e=>{e.stopPropagation();pop.hidden=!pop.hidden});
    pop.addEventListener('click',e=>{
      const b=e.target.closest('[data-shape]');if(!b)return;
      if(b.dataset.shape==='numberLine'){document.getElementById('insertNumberLineBtn')?.click();pop.hidden=true;return}
      customShape=b.dataset.shape;pop.hidden=true;
      document.querySelectorAll('.tool').forEach(x=>x.classList.remove('active'));launcher.classList.add('active');
      canvas.style.cursor='crosshair';
    });
    document.addEventListener('click',()=>pop.hidden=true);
    document.querySelectorAll('.tool[data-tool]').forEach(btn=>btn.addEventListener('click',()=>{customShape=null;launcher.classList.remove('active')}));
  }

  function addPageControls(){
    const toggle=document.createElement('button');toggle.className='pagebar-toggle';toggle.title='Згорнути сторінки';toggle.textContent='⌄';
    pagebar.insertBefore(toggle,pagebar.firstChild);
    toggle.addEventListener('click',()=>{pagebar.classList.toggle('collapsed');toggle.textContent=pagebar.classList.contains('collapsed')?'⌃':'⌄'});

    const menu=document.createElement('div');menu.className='page-context';menu.hidden=true;document.body.appendChild(menu);
    let menuIndex=0;
    menu.innerHTML='<button data-act="rename">Перейменувати</button><button data-act="duplicate">Дублювати</button><button class="danger" data-act="delete">Видалити</button>';
    menu.addEventListener('click',e=>{const act=e.target.dataset.act;if(!act)return;menu.hidden=true;pageAction(act,menuIndex)});
    document.addEventListener('click',()=>menu.hidden=true);

    const enhance=()=>{
      [...pagesEl.querySelectorAll('.page-tab')].forEach((tab,index)=>{
        if(tab.querySelector('.page-menu-btn'))return;
        const b=document.createElement('button');b.className='page-menu-btn';b.textContent='⋮';b.title='Дії зі сторінкою';
        b.addEventListener('click',e=>{e.stopPropagation();menuIndex=index;const r=b.getBoundingClientRect();menu.style.left=`${Math.min(r.left,innerWidth-170)}px`;menu.style.top=`${Math.max(10,r.top-110)}px`;menu.hidden=false});
        tab.appendChild(b);
      });
    };
    new MutationObserver(enhance).observe(pagesEl,{childList:true,subtree:true});enhance();
  }

  function pageAction(action,index){
    const data=getData();if(!Array.isArray(data.pages))return;
    if(action==='rename'){
      const name=prompt('Назва сторінки:',data.pages[index]?.name||`Сторінка ${index+1}`);if(name?.trim()){data.pages[index].name=name.trim();setData(data);location.reload()}
    } else if(action==='duplicate'){
      const clone=JSON.parse(JSON.stringify(data.pages[index]));clone.name=`${clone.name||`Сторінка ${index+1}`} — копія`;data.pages.splice(index+1,0,clone);data.activePage=index+1;setData(data);const h=getHeights();h.splice(index+1,0,h[index]||900);setHeights(h);location.reload();
    } else if(action==='delete'){
      if(data.pages.length<=1){alert('Останню сторінку видалити не можна.');return}
      if(!confirm(`Видалити сторінку ${index+1}?`))return;
      data.pages.splice(index,1);data.activePage=Math.min(index,data.pages.length-1);setData(data);const h=getHeights();h.splice(index,1);setHeights(h);location.reload();
    }
  }

  function addExtendButton(){
    const b=document.createElement('button');b.className='extend-page';b.textContent='＋ Продовжити сторінку вниз';board.appendChild(b);
    b.addEventListener('click',extendPage);
    syncPageHeight();
    new MutationObserver(()=>setTimeout(syncPageHeight,30)).observe(pagesEl,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  }

  function resizeCanvasHeight(newH){
    const old=document.createElement('canvas');old.width=canvas.width;old.height=canvas.height;old.getContext('2d').drawImage(canvas,0,0);
    canvas.height=newH;canvas.style.height='100%';board.style.height=`${newH/1600*100}%`;board.style.aspectRatio='auto';
    ctx.drawImage(old,0,0);
  }
  function syncPageHeight(){
    const idx=activeIndex();const h=getHeights();const target=h[idx]||900;if(canvas.height!==target)resizeCanvasHeight(target);
    board.style.height=`${target/1600*100}vw`;board.style.maxHeight='none';board.style.minHeight=`${Math.min(target,900)}px`;
  }
  function extendPage(){
    const idx=activeIndex();const h=getHeights();const oldH=canvas.height;const newH=oldH+500;h[idx]=newH;setHeights(h);resizeCanvasHeight(newH);setTimeout(()=>viewport.scrollTo({top:viewport.scrollHeight,behavior:'smooth'}),50);
  }

  function pos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(canvas.width/r.width),y:(e.clientY-r.top)*(canvas.height/r.height)}}
  function shapePointerDown(e){if(!customShape)return; e.preventDefault();e.stopImmediatePropagation();shapeStart=pos(e);shapeSnapshot=ctx.getImageData(0,0,canvas.width,canvas.height);customDrawing=true;board.classList.add('is-drawing')}
  function shapePointerMove(e){if(!customShape||!customDrawing)return;e.preventDefault();e.stopImmediatePropagation();ctx.putImageData(shapeSnapshot,0,0);drawCustomShape(shapeStart,pos(e),customShape)}
  function shapePointerUp(e){if(!customShape||!customDrawing)return;e.preventDefault();e.stopImmediatePropagation();ctx.putImageData(shapeSnapshot,0,0);drawCustomShape(shapeStart,pos(e),customShape);customDrawing=false;board.classList.remove('is-drawing');window.dispatchEvent(new Event('blur'));setTimeout(()=>document.getElementById('colorPicker')?.dispatchEvent(new Event('input',{bubbles:true})),0)}

  function drawCustomShape(a,b,type){
    const color=document.getElementById('colorPicker')?.value||'#245d55';const width=Number(document.getElementById('lineWidth')?.value)||4;
    ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();
    const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(b.x-a.x),h=Math.abs(b.y-a.y);
    if(type==='triangle'){ctx.moveTo(x+w/2,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.closePath()}
    if(type==='rightTriangle'){ctx.moveTo(x,y);ctx.lineTo(x,y+h);ctx.lineTo(x+w,y+h);ctx.closePath()}
    if(type==='parallelogram'){const s=w*.22;ctx.moveTo(x+s,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w-s,y+h);ctx.lineTo(x,y+h);ctx.closePath()}
    if(type==='trapezoid'){const s=w*.2;ctx.moveTo(x+s,y);ctx.lineTo(x+w-s,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.closePath()}
    if(type==='rhombus'){ctx.moveTo(x+w/2,y);ctx.lineTo(x+w,y+h/2);ctx.lineTo(x+w/2,y+h);ctx.lineTo(x,y+h/2);ctx.closePath()}
    if(type==='angle'){ctx.moveTo(x,y+h);ctx.lineTo(x+w*.42,y+h);ctx.lineTo(x+w,y);}
    if(type==='arc'){ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,Math.PI,Math.PI*2)}
    ctx.stroke();ctx.restore();
    // Force current app state to persist canvas on its next autosave by nudging a harmless standard control.
    const cp=document.getElementById('colorPicker');cp?.dispatchEvent(new Event('input',{bubbles:true}));
    setTimeout(saveCanvasIntoStorage,40);
  }

  function saveCanvasIntoStorage(){
    const data=getData();if(!Array.isArray(data.pages)||!data.pages.length)return;const idx=Math.min(activeIndex(),data.pages.length-1);data.pages[idx].image=canvas.toDataURL('image/png');data.pages[idx].texts=[...textLayer.querySelectorAll('.board-text')].map(el=>({text:el.textContent,x:Number(el.dataset.x),y:Number(el.dataset.y),color:el.style.color||document.getElementById('colorPicker')?.value||'#245d55'}));data.pages[idx].background=board.dataset.background||'clean';setData(data);document.getElementById('autosaveState').textContent='Збережено';
  }

  function togglePresentation(){
    document.body.classList.toggle('presentation-mode');workspace.classList.add('math-closed');setTimeout(fitBoard,80)
  }
  function fitBoard(){
    const rect=boardWrap.getBoundingClientRect();const bw=board.offsetWidth;const bh=board.offsetHeight;const scale=Math.max(.35,Math.min(1.2,(rect.width-24)/bw,(rect.height-24)/bh));board.style.transform=`scale(${scale})`;document.getElementById('zoomLabel').textContent=`${Math.round(scale*100)}%`;viewport.scrollTo({top:0,left:0});
  }
  function addPresentationExit(){const b=document.createElement('button');b.className='presentation-exit';b.textContent='Вийти з демонстрації';b.addEventListener('click',togglePresentation);document.body.appendChild(b)}

  async function exportLessonPdf(){
    saveCanvasIntoStorage();const data=getData();if(!Array.isArray(data.pages)||!data.pages.length)return;
    if(!window.jspdf?.jsPDF){alert('Модуль PDF ще завантажується. Спробуйте через кілька секунд.');return}
    const {jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:'landscape',unit:'px',format:[1600,900],hotfixes:['px_scaling']});
    for(let i=0;i<data.pages.length;i++){
      const page=data.pages[i];const height=(getHeights()[i]||900);if(i>0)pdf.addPage([1600,height],height>1600?'portrait':'landscape');
      if(i===0 && height!==900){pdf.deletePage(1);pdf.addPage([1600,height],height>1600?'portrait':'landscape')}
      const temp=document.createElement('canvas');temp.width=1600;temp.height=height;const c=temp.getContext('2d');c.fillStyle='#fffefa';c.fillRect(0,0,temp.width,temp.height);drawBackground(c,page.background||'clean',temp.width,temp.height);
      if(page.image){await new Promise(res=>{const im=new Image();im.onload=()=>{c.drawImage(im,0,0,1600,Math.min(height,im.height||height));res()};im.onerror=res;im.src=page.image})}
      c.font='28px system-ui';c.textBaseline='top';(page.texts||[]).forEach(t=>{c.fillStyle=t.color||'#245d55';String(t.text||'').split('\n').forEach((line,j)=>c.fillText(line,t.x||0,(t.y||0)+j*34))});
      pdf.addImage(temp.toDataURL('image/jpeg',.92),'JPEG',0,0,1600,height);
    }
    pdf.save(`TeacherBoard-заняття-${new Date().toISOString().slice(0,10)}.pdf`);
  }
  function drawBackground(c,type,w,h){c.save();c.strokeStyle='#e1e8e4';c.lineWidth=1;if(type==='grid'||type==='coords'){for(let x=0;x<w;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke()}for(let y=0;y<h;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}}if(type==='lines'){for(let y=34;y<h;y+=34){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}}if(type==='coords'){c.strokeStyle='#9bb6ab';c.lineWidth=2;c.beginPath();c.moveTo(w/2,0);c.lineTo(w/2,h);c.moveTo(0,h/2);c.lineTo(w,h/2);c.stroke()}c.restore()}

  function bindCustomCanvas(){canvas.addEventListener('pointerdown',shapePointerDown,true);canvas.addEventListener('pointermove',shapePointerMove,true);canvas.addEventListener('pointerup',shapePointerUp,true);canvas.addEventListener('pointercancel',shapePointerUp,true)}
  function keyboard(e){if(e.key==='Escape'&&document.body.classList.contains('presentation-mode'))togglePresentation();if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='f'){e.preventDefault();fitBoard()}}

  function init(){addTopControls();addShapeMenu();addPageControls();addExtendButton();addPresentationExit();bindCustomCanvas();window.addEventListener('keydown',keyboard);window.addEventListener('beforeunload',saveCanvasIntoStorage);setTimeout(fitBoard,150)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
