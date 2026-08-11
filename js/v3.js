(() => {
  'use strict';

  const STORAGE_KEY='teacherboard.v1';
  const HEIGHTS_KEY='teacherboard.pageHeights.v1';
  const canvas=document.getElementById('boardCanvas');
  const board=document.getElementById('board');
  const pagesEl=document.getElementById('pages');
  const imageInput=document.getElementById('imageInput');
  const colorPicker=document.getElementById('colorPicker');
  const lineWidth=document.getElementById('lineWidth');
  const toolbar=document.querySelector('.toolbar');
  const textLayer=document.getElementById('textLayer');

  if(!canvas||!board||!toolbar) return;

  let objectLayer=null;
  let selectedId=null;
  let pendingShape=null;
  let drag=null;
  let preview=null;

  const SHAPES={
    line:'Лінія', rect:'Прямокутник', ellipse:'Коло', triangle:'Трикутник', rightTriangle:'Прямокутний трикутник',
    parallelogram:'Паралелограм', trapezoid:'Трапеція', rhombus:'Ромб', angle:'Кут', arc:'Дуга',
    number5:'Вісь −5…5', number10:'Вісь −10…10', numberBlank:'Порожня вісь', axes:'Координатні осі', xyTable:'Таблиця x/y'
  };

  function getData(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return {}}}
  function setData(data){localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}
  function activeIndex(){const d=getData();return Math.max(0,Math.min(Number(d.activePage)||0,(d.pages?.length||1)-1))}
  function pageHeight(index=activeIndex()){try{return JSON.parse(localStorage.getItem(HEIGHTS_KEY)||'[]')[index]||canvas.height||900}catch{return canvas.height||900}}
  function currentObjects(){const d=getData();return d.pages?.[activeIndex()]?.objects||[]}
  function saveObjects(items){const d=getData();if(!d.pages?.length)return;const i=activeIndex();d.pages[i].objects=items;setData(d);const s=document.getElementById('autosaveState');if(s)s.textContent='Збережено'}
  function uid(){return 'o_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7)}

  function addObjectLayer(){
    objectLayer=document.createElement('div');objectLayer.className='tb-object-layer';objectLayer.id='objectLayer';
    board.appendChild(objectLayer);renderObjects();
  }

  function makeSelectTool(){
    const b=document.createElement('button');b.className='tool tb-select-tool';b.dataset.tbTool='select';b.title='Вибір і переміщення';b.innerHTML='<span>↖</span><em>Вибір</em>';
    toolbar.insertBefore(b,toolbar.firstChild);
    b.addEventListener('click',()=>activateSelect());

    const shape=document.createElement('button');shape.className='tool tb-shape-launcher';shape.title='Фігури';shape.innerHTML='<span>◇</span><em>Фігури</em>';
    const arrow=toolbar.querySelector('[data-tool="arrow"]');toolbar.insertBefore(shape,arrow||toolbar.children[3]);
    const menu=buildShapeMenu();
    shape.addEventListener('click',e=>{e.stopPropagation();const r=shape.getBoundingClientRect();menu.style.left=`${Math.min(r.right+8,innerWidth-285)}px`;menu.style.top=`${Math.min(Math.max(8,r.top),innerHeight-menu.offsetHeight-8)}px`;menu.hidden=!menu.hidden});
    document.addEventListener('click',()=>menu.hidden=true);

    document.querySelectorAll('.tool[data-tool]').forEach(x=>x.addEventListener('click',()=>{document.body.classList.remove('tb-select-mode');deselect();pendingShape=null;clearPreview();}));

    const props=document.createElement('div');props.className='tb-selected-properties';props.innerHTML='<span>Об’єкт</span><button id="tbDeleteSelected" title="Видалити">✕ Видалити</button>';
    document.querySelector('.top-actions')?.appendChild(props);
    props.querySelector('button').addEventListener('click',deleteSelected);
  }

  function buildShapeMenu(){
    document.querySelectorAll('.shape-popover').forEach(x=>x.remove());
    const menu=document.createElement('div');menu.className='tb-shape-menu';menu.hidden=true;
    menu.innerHTML=`
      <h4>Геометрія</h4><div class="tb-shape-grid">
        <button data-shape="line">╱ Лінія</button><button data-shape="rect">□ Прямокутник</button>
        <button data-shape="ellipse">○ Коло</button><button data-shape="triangle">△ Трикутник</button>
        <button data-shape="rightTriangle">◿ Прямокутний</button><button data-shape="parallelogram">▱ Паралелограм</button>
        <button data-shape="trapezoid">⏢ Трапеція</button><button data-shape="rhombus">◇ Ромб</button>
        <button data-shape="angle">∠ Кут</button><button data-shape="arc">⌒ Дуга</button>
      </div>
      <h4>Математика</h4><div class="tb-shape-grid">
        <button data-shape="number5">↔ −5…5</button><button data-shape="number10">↔ −10…10</button>
        <button data-shape="numberBlank">↔ Порожня вісь</button><button data-shape="axes">＋ Координатні осі</button>
        <button data-shape="xyTable">▦ Таблиця x/y</button>
      </div>`;
    document.body.appendChild(menu);
    menu.addEventListener('click',e=>{const b=e.target.closest('[data-shape]');if(!b)return;e.stopPropagation();menu.hidden=true;chooseShape(b.dataset.shape)});
    return menu;
  }

  function chooseShape(type){
    if(['number5','number10','numberBlank','axes','xyTable'].includes(type)){
      insertPreset(type);return;
    }
    pendingShape=type;deselect();document.body.classList.remove('tb-select-mode');canvas.style.cursor='crosshair';
  }

  function activateSelect(id=null){
    pendingShape=null;clearPreview();document.body.classList.add('tb-select-mode');
    document.querySelectorAll('.tool').forEach(x=>x.classList.remove('active'));document.querySelector('.tb-select-tool')?.classList.add('active');
    canvas.style.cursor='default';if(id)selectObject(id);else renderObjects();
  }

  function boardPoint(e){const r=board.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*1600,y:(e.clientY-r.top)/r.height*pageHeight()}}

  function bindShapeDrawing(){
    canvas.addEventListener('pointerdown',e=>{
      if(!pendingShape)return;e.preventDefault();e.stopImmediatePropagation();const p=boardPoint(e);drag={mode:'create',start:p};showPreview(p,p);
    },true);
    canvas.addEventListener('pointermove',e=>{if(!drag||drag.mode!=='create'||!pendingShape)return;e.preventDefault();e.stopImmediatePropagation();showPreview(drag.start,boardPoint(e));},true);
    canvas.addEventListener('pointerup',e=>{
      if(!drag||drag.mode!=='create'||!pendingShape)return;e.preventDefault();e.stopImmediatePropagation();const a=drag.start,b=boardPoint(e);const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.max(60,Math.abs(b.x-a.x)),h=Math.max(50,Math.abs(b.y-a.y));
      const obj={id:uid(),kind:'shape',shape:pendingShape,x,y,w,h,color:colorPicker?.value||'#245d55',lineWidth:Number(lineWidth?.value)||4};
      const items=currentObjects();items.push(obj);saveObjects(items);pendingShape=null;drag=null;clearPreview();activateSelect(obj.id);
    },true);
  }

  function showPreview(a,b){
    if(!preview){preview=document.createElement('div');preview.className='tb-shape-preview';board.appendChild(preview)}
    const h=pageHeight(),x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(b.x-a.x),hh=Math.abs(b.y-a.y);
    Object.assign(preview.style,{left:`${x/1600*100}%`,top:`${y/h*100}%`,width:`${w/1600*100}%`,height:`${hh/h*100}%`});
  }
  function clearPreview(){preview?.remove();preview=null;drag=null}

  function insertPreset(shape){
    const h=pageHeight();let w=760,hh=150;if(shape==='axes'){w=520;hh=420}else if(shape==='xyTable'){w=420;hh=300}
    const obj={id:uid(),kind:'shape',shape,x:(1600-w)/2,y:Math.max(70,(h-hh)/2),w,h:hh,color:colorPicker?.value||'#245d55',lineWidth:Number(lineWidth?.value)||4};
    const items=currentObjects();items.push(obj);saveObjects(items);activateSelect(obj.id);
  }

  function renderObjects(){
    if(!objectLayer)return;objectLayer.innerHTML='';const h=pageHeight();
    currentObjects().forEach(obj=>{
      const el=document.createElement('div');el.className='tb-object'+(obj.id===selectedId?' selected':'');el.dataset.id=obj.id;
      Object.assign(el.style,{left:`${obj.x/1600*100}%`,top:`${obj.y/h*100}%`,width:`${obj.w/1600*100}%`,height:`${obj.h/h*100}%`,color:obj.color||'#245d55'});
      if(obj.kind==='image'){const im=document.createElement('img');im.src=obj.src;im.alt='Вставлене зображення';el.appendChild(im)}else{el.innerHTML=shapeSvg(obj)}
      const resize=document.createElement('span');resize.className='tb-object-handle tb-resize-handle';resize.title='Змінити розмір';el.appendChild(resize);
      const del=document.createElement('button');del.className='tb-object-handle tb-delete-handle';del.type='button';del.textContent='×';del.title='Видалити';el.appendChild(del);
      el.addEventListener('pointerdown',objectPointerDown);resize.addEventListener('pointerdown',resizePointerDown);del.addEventListener('pointerdown',e=>e.stopPropagation());del.addEventListener('click',e=>{e.stopPropagation();selectedId=obj.id;deleteSelected()});
      objectLayer.appendChild(el);
    });
    document.body.classList.toggle('tb-has-selection',!!selectedId);
  }

  function shapeSvg(o){
    const sw=Math.max(1,Number(o.lineWidth)||4),s=`stroke="currentColor" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"`;
    if(o.shape==='line')return `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="2" y1="98" x2="98" y2="2" ${s}/></svg>`;
    if(o.shape==='rect')return `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="3" y="3" width="94" height="94" ${s}/></svg>`;
    if(o.shape==='ellipse')return `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><ellipse cx="50" cy="50" rx="47" ry="47" ${s}/></svg>`;
    if(o.shape==='triangle')return `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M50 3 L97 97 L3 97 Z" ${s}/></svg>`;
    if(o.shape==='rightTriangle')return `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M4 4 L4 96 L96 96 Z" ${s}/></svg>`;
    if(o.shape==='parallelogram')return `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M25 4 H97 L75 96 H3 Z" ${s}/></svg>`;
    if(o.shape==='trapezoid')return `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M22 4 H78 L97 96 H3 Z" ${s}/></svg>`;
    if(o.shape==='rhombus')return `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M50 3 L97 50 L50 97 L3 50 Z" ${s}/></svg>`;
    if(o.shape==='angle')return `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M5 92 H43 L96 8" ${s}/><path d="M27 92 A18 18 0 0 1 53 76" ${s}/></svg>`;
    if(o.shape==='arc')return `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M4 78 Q50 4 96 78" ${s}/></svg>`;
    if(o.shape?.startsWith('number'))return numberLineSvg(o,s);
    if(o.shape==='axes')return axesSvg(o,s);
    if(o.shape==='xyTable')return tableSvg(o,s);
    return '';
  }

  function numberLineSvg(o,s){
    let min=-5,max=5,labels=true;if(o.shape==='number10'){min=-10;max=10}else if(o.shape==='numberBlank'){min=-5;max=5;labels=false}
    const count=max-min, parts=[];parts.push(`<line x1="4" y1="50" x2="96" y2="50" ${s}/><path d="M4 50 L8 47 M4 50 L8 53 M96 50 L92 47 M96 50 L92 53" ${s}/>`);
    for(let i=0;i<=count;i++){const x=6+i*(88/count);parts.push(`<line x1="${x}" y1="43" x2="${x}" y2="57" ${s}/>`);if(labels){const n=min+i;parts.push(`<text x="${x}" y="76" text-anchor="middle" font-size="9" fill="currentColor" stroke="none">${n}</text>`)}}
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${parts.join('')}</svg>`;
  }
  function axesSvg(o,s){return `<svg viewBox="0 0 100 100"><line x1="5" y1="50" x2="95" y2="50" ${s}/><line x1="50" y1="95" x2="50" y2="5" ${s}/><path d="M95 50 L90 47 M95 50 L90 53 M50 5 L47 10 M50 5 L53 10" ${s}/><text x="92" y="45" font-size="7" fill="currentColor">x</text><text x="54" y="10" font-size="7" fill="currentColor">y</text><text x="53" y="59" font-size="6" fill="currentColor">0</text></svg>`}
  function tableSvg(o,s){return `<svg viewBox="0 0 100 70" preserveAspectRatio="none"><rect x="3" y="3" width="94" height="64" ${s}/><line x1="50" y1="3" x2="50" y2="67" ${s}/><line x1="3" y1="20" x2="97" y2="20" ${s}/><line x1="3" y1="36" x2="97" y2="36" ${s}/><line x1="3" y1="52" x2="97" y2="52" ${s}/><text x="25" y="15" text-anchor="middle" font-size="10" fill="currentColor">x</text><text x="75" y="15" text-anchor="middle" font-size="10" fill="currentColor">y</text></svg>`}

  function selectObject(id){selectedId=id;document.body.classList.add('tb-select-mode','tb-has-selection');renderObjects()}
  function deselect(){selectedId=null;document.body.classList.remove('tb-has-selection');renderObjects()}

  function objectPointerDown(e){
    if(!document.body.classList.contains('tb-select-mode'))return;e.preventDefault();e.stopPropagation();const id=e.currentTarget.dataset.id;selectObject(id);const obj=currentObjects().find(x=>x.id===id);if(!obj)return;drag={mode:'move',id,startClient:{x:e.clientX,y:e.clientY},orig:{x:obj.x,y:obj.y}};e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function resizePointerDown(e){
    if(!document.body.classList.contains('tb-select-mode'))return;e.preventDefault();e.stopPropagation();const id=e.currentTarget.parentElement.dataset.id;selectObject(id);const obj=currentObjects().find(x=>x.id===id);if(!obj)return;drag={mode:'resize',id,startClient:{x:e.clientX,y:e.clientY},orig:{w:obj.w,h:obj.h}};e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  window.addEventListener('pointermove',e=>{
    if(!drag||!['move','resize'].includes(drag.mode))return;const r=board.getBoundingClientRect(),dx=(e.clientX-drag.startClient.x)/r.width*1600,dy=(e.clientY-drag.startClient.y)/r.height*pageHeight();const items=currentObjects();const obj=items.find(x=>x.id===drag.id);if(!obj)return;
    if(drag.mode==='move'){obj.x=Math.max(0,Math.min(1600-obj.w,drag.orig.x+dx));obj.y=Math.max(0,Math.min(pageHeight()-obj.h,drag.orig.y+dy))}
    else{obj.w=Math.max(40,Math.min(1600-obj.x,drag.orig.w+dx));obj.h=Math.max(35,Math.min(pageHeight()-obj.y,drag.orig.h+dy))}
    saveObjects(items);renderObjects();
  });
  window.addEventListener('pointerup',()=>{if(drag&&['move','resize'].includes(drag.mode)){drag=null;saveObjects(currentObjects())}});

  function deleteSelected(){if(!selectedId)return;saveObjects(currentObjects().filter(x=>x.id!==selectedId));selectedId=null;document.body.classList.remove('tb-has-selection');renderObjects()}

  function bindObjectProperties(){
    colorPicker?.addEventListener('input',()=>{if(!selectedId||!document.body.classList.contains('tb-select-mode'))return;const items=currentObjects(),o=items.find(x=>x.id===selectedId);if(o){o.color=colorPicker.value;saveObjects(items);renderObjects()}},true);
    lineWidth?.addEventListener('change',()=>{if(!selectedId||!document.body.classList.contains('tb-select-mode'))return;const items=currentObjects(),o=items.find(x=>x.id===selectedId);if(o&&o.kind==='shape'){o.lineWidth=Number(lineWidth.value)||4;saveObjects(items);renderObjects()}},true);
  }

  function insertImageFile(file){
    if(!file||!file.type?.startsWith('image/'))return;const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const maxW=900,maxH=620,scale=Math.min(1,maxW/img.width,maxH/img.height),w=Math.max(120,img.width*scale),h=Math.max(80,img.height*scale);const obj={id:uid(),kind:'image',src:reader.result,x:(1600-w)/2,y:Math.max(40,(pageHeight()-h)/2),w,h};const items=currentObjects();items.push(obj);saveObjects(items);activateSelect(obj.id)};img.src=reader.result};reader.readAsDataURL(file)
  }

  function interceptPaste(){
    window.addEventListener('paste',e=>{const item=[...(e.clipboardData?.items||[])].find(i=>i.type.startsWith('image/'));if(!item)return;e.preventDefault();e.stopImmediatePropagation();insertImageFile(item.getAsFile())},true);
    imageInput?.addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;e.stopImmediatePropagation();insertImageFile(f);e.target.value=''},true);
  }

  function watchPageSwitch(){
    pagesEl?.addEventListener('click',()=>setTimeout(()=>{selectedId=null;document.body.classList.remove('tb-has-selection');renderObjects()},80),true);
    new MutationObserver(()=>setTimeout(renderObjects,40)).observe(pagesEl,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    window.addEventListener('resize',()=>setTimeout(renderObjects,30));
  }

  function bindKeyboard(){
    window.addEventListener('keydown',e=>{const tag=document.activeElement?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;if((e.key==='Delete'||e.key==='Backspace')&&selectedId){e.preventDefault();deleteSelected()}if(e.key==='Escape'&&selectedId)deselect()});
  }

  function drawBackground(c,type,w,h){c.save();c.strokeStyle='#e1e8e4';c.lineWidth=1;if(type==='grid'||type==='coords'){for(let x=0;x<w;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke()}for(let y=0;y<h;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}}else if(type==='lines'){for(let y=34;y<h;y+=34){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}}if(type==='coords'){c.strokeStyle='#9bb6ab';c.lineWidth=2;c.beginPath();c.moveTo(w/2,0);c.lineTo(w/2,h);c.moveTo(0,h/2);c.lineTo(w,h/2);c.stroke()}c.restore()}

  async function composePage(index){
    const data=getData(),page=data.pages?.[index]||{},h=pageHeight(index);const out=document.createElement('canvas');out.width=1600;out.height=h;const c=out.getContext('2d');c.fillStyle='#fffefa';c.fillRect(0,0,out.width,out.height);drawBackground(c,page.background||'clean',1600,h);
    if(page.image)await new Promise(res=>{const im=new Image();im.onload=()=>{c.drawImage(im,0,0,1600,Math.min(h,im.height||h));res()};im.onerror=res;im.src=page.image});
    c.textBaseline='top';(page.texts||[]).forEach(t=>{c.font='28px system-ui';c.fillStyle=t.color||'#245d55';String(t.text||'').split('\n').forEach((line,j)=>c.fillText(line,t.x||0,(t.y||0)+j*34))});
    for(const o of page.objects||[])await drawObjectCanvas(c,o);
    return out;
  }

  async function drawObjectCanvas(c,o){
    if(o.kind==='image'){await new Promise(res=>{const im=new Image();im.onload=()=>{c.drawImage(im,o.x,o.y,o.w,o.h);res()};im.onerror=res;im.src=o.src});return}
    c.save();c.strokeStyle=o.color||'#245d55';c.fillStyle=o.color||'#245d55';c.lineWidth=o.lineWidth||4;c.lineJoin='round';c.lineCap='round';const x=o.x,y=o.y,w=o.w,h=o.h;
    const line=(a,b,d,e)=>{c.beginPath();c.moveTo(a,b);c.lineTo(d,e);c.stroke()};
    if(o.shape==='line')line(x,y+h,x+w,y);else if(o.shape==='rect')c.strokeRect(x,y,w,h);else if(o.shape==='ellipse'){c.beginPath();c.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);c.stroke()}
    else if(['triangle','rightTriangle','parallelogram','trapezoid','rhombus'].includes(o.shape)){c.beginPath();const pts=o.shape==='triangle'?[[.5,0],[1,1],[0,1]]:o.shape==='rightTriangle'?[[0,0],[0,1],[1,1]]:o.shape==='parallelogram'?[[.25,0],[1,0],[.75,1],[0,1]]:o.shape==='trapezoid'?[[.22,0],[.78,0],[1,1],[0,1]]:[[.5,0],[1,.5],[.5,1],[0,.5]];pts.forEach((p,i)=>(i?c.lineTo(x+p[0]*w,y+p[1]*h):c.moveTo(x+p[0]*w,y+p[1]*h)));c.closePath();c.stroke()}
    else if(o.shape==='angle'){c.beginPath();c.moveTo(x,y+h);c.lineTo(x+.43*w,y+h);c.lineTo(x+w,y);c.stroke()}else if(o.shape==='arc'){c.beginPath();c.ellipse(x+w/2,y+h*.7,w/2,h*.65,0,Math.PI,Math.PI*2);c.stroke()}
    else if(o.shape?.startsWith('number'))drawNumberLineCanvas(c,o);else if(o.shape==='axes'){line(x,y+h/2,x+w,y+h/2);line(x+w/2,y+h,x+w/2,y);c.font=`${Math.max(18,w*.04)}px system-ui`;c.fillText('x',x+w-22,y+h/2-30);c.fillText('y',x+w/2+12,y+8)}else if(o.shape==='xyTable'){c.strokeRect(x,y,w,h);line(x+w/2,y,x+w/2,y+h);for(let i=1;i<4;i++)line(x,y+i*h/4,x+w,y+i*h/4);c.font=`${Math.max(18,h*.1)}px system-ui`;c.textAlign='center';c.fillText('x',x+w/4,y+10);c.fillText('y',x+3*w/4,y+10)}c.restore()
  }
  function drawNumberLineCanvas(c,o){let min=-5,max=5,labels=true;if(o.shape==='number10'){min=-10;max=10}else if(o.shape==='numberBlank')labels=false;const y=o.y+o.h/2;c.beginPath();c.moveTo(o.x+8,y);c.lineTo(o.x+o.w-8,y);c.stroke();const count=max-min;c.font=`${Math.max(14,o.h*.13)}px system-ui`;c.textAlign='center';for(let i=0;i<=count;i++){const x=o.x+18+i*(o.w-36)/count;c.beginPath();c.moveTo(x,y-9);c.lineTo(x,y+9);c.stroke();if(labels)c.fillText(String(min+i),x,y+16)}}

  function interceptExports(){
    document.getElementById('savePngBtn')?.addEventListener('click',async e=>{e.preventDefault();e.stopImmediatePropagation();const out=await composePage(activeIndex());const a=document.createElement('a');a.download=`TeacherBoard-${activeIndex()+1}.png`;a.href=out.toDataURL('image/png');a.click()},true);
    document.getElementById('saveLessonPdfBtn')?.addEventListener('click',async e=>{e.preventDefault();e.stopImmediatePropagation();if(!window.jspdf?.jsPDF){alert('PDF-модуль ще завантажується.');return}const {jsPDF}=window.jspdf;const data=getData();if(!data.pages?.length)return;let pdf=null;for(let i=0;i<data.pages.length;i++){const out=await composePage(i),h=out.height;if(!pdf)pdf=new jsPDF({orientation:h>1600?'portrait':'landscape',unit:'px',format:[1600,h],hotfixes:['px_scaling']});else pdf.addPage([1600,h],h>1600?'portrait':'landscape');pdf.addImage(out.toDataURL('image/jpeg',.92),'JPEG',0,0,1600,h)}pdf.save(`TeacherBoard-заняття-${new Date().toISOString().slice(0,10)}.pdf`)},true);
  }

  function init(){
    addObjectLayer();makeSelectTool();bindShapeDrawing();bindObjectProperties();interceptPaste();watchPageSwitch();bindKeyboard();interceptExports();
    document.querySelectorAll('.toolbar [data-tool="line"],.toolbar [data-tool="rect"],.toolbar [data-tool="ellipse"]').forEach(x=>x.setAttribute('aria-hidden','true'));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));else setTimeout(init,0);
})();
