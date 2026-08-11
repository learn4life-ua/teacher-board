(() => {
  'use strict';

  const STORAGE_KEY = 'teacherboard.v1';
  const canvas = document.getElementById('boardCanvas');
  const ctx = canvas.getContext('2d');
  const board = document.getElementById('board');
  const boardWrap = document.getElementById('boardWrap');
  const textLayer = document.getElementById('textLayer');
  const pagesEl = document.getElementById('pages');
  const autosaveState = document.getElementById('autosaveState');
  const mathPanel = document.getElementById('mathPanel');
  const workspace = document.querySelector('.workspace');
  const imageInput = document.getElementById('imageInput');
  const colorPicker = document.getElementById('colorPicker');
  const lineWidthSelect = document.getElementById('lineWidth');
  const textDialog = document.getElementById('textDialog');
  const textInput = document.getElementById('textInput');
  const laserDot = document.getElementById('laserDot');

  const state = {
    tool: 'pen',
    color: '#245d55',
    lineWidth: 4,
    zoom: 1,
    drawing: false,
    start: null,
    last: null,
    preview: null,
    pendingTextPosition: { x: 220, y: 150 },
    pages: [],
    activePage: 0,
    undo: [],
    redo: [],
    autosaveTimer: null
  };

  function blankPage(name = 'Нова сторінка') {
    return { name, background: 'clean', image: null, texts: [] };
  }

  function boot() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        state.pages = Array.isArray(data.pages) && data.pages.length ? data.pages : [blankPage('Сторінка 1')];
        state.activePage = Math.min(Number(data.activePage) || 0, state.pages.length - 1);
      } catch {
        state.pages = [blankPage('Сторінка 1')];
      }
    } else {
      state.pages = [blankPage('Сторінка 1')];
    }
    renderPages();
    loadPage(state.activePage);
    bindEvents();
    setTool('pen');
  }

  function bindEvents() {
    document.querySelectorAll('.tool').forEach(btn => btn.addEventListener('click', () => setTool(btn.dataset.tool)));
    colorPicker.addEventListener('input', e => state.color = e.target.value);
    lineWidthSelect.addEventListener('change', e => state.lineWidth = Number(e.target.value));

    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', pointerUp);
    canvas.addEventListener('pointerleave', pointerLeave);

    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);
    document.getElementById('clearBtn').addEventListener('click', clearPage);
    document.getElementById('addPageBtn').addEventListener('click', addPage);
    document.getElementById('duplicatePageBtn').addEventListener('click', duplicatePage);
    document.getElementById('insertBtn').addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', e => e.target.files[0] && insertImageFile(e.target.files[0]));
    document.getElementById('savePngBtn').addEventListener('click', exportPng);
    document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
    document.getElementById('zoomInBtn').addEventListener('click', () => setZoom(state.zoom + .1));
    document.getElementById('zoomOutBtn').addEventListener('click', () => setZoom(state.zoom - .1));
    document.getElementById('mathToggleBtn').addEventListener('click', toggleMathPanel);
    document.getElementById('closeMathBtn').addEventListener('click', toggleMathPanel);

    document.querySelectorAll('#backgroundButtons button').forEach(btn => btn.addEventListener('click', () => setBackground(btn.dataset.bg)));
    document.querySelectorAll('#symbolButtons button').forEach(btn => btn.addEventListener('click', () => openTextDialog(btn.textContent)));
    document.getElementById('insertAxesBtn').addEventListener('click', insertAxes);
    document.getElementById('insertNumberLineBtn').addEventListener('click', insertNumberLine);
    document.getElementById('insertXYTableBtn').addEventListener('click', insertXYTable);

    document.getElementById('textConfirmBtn').addEventListener('click', e => {
      e.preventDefault();
      const value = textInput.value.trim();
      if (value) addText(value, state.pendingTextPosition.x, state.pendingTextPosition.y);
      textDialog.close();
    });

    window.addEventListener('paste', handlePaste);
    window.addEventListener('keydown', handleShortcuts);
    window.addEventListener('beforeunload', saveCurrentPage);
  }

  function setTool(tool) {
    state.tool = tool;
    document.querySelectorAll('.tool').forEach(btn => btn.classList.toggle('active', btn.dataset.tool === tool));
    canvas.style.cursor = tool === 'text' ? 'text' : tool === 'eraser' ? 'cell' : tool === 'laser' ? 'none' : 'crosshair';
  }

  function pointFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function pointerDown(e) {
    const p = pointFromEvent(e);
    if (state.tool === 'text') {
      state.pendingTextPosition = p;
      openTextDialog('');
      return;
    }
    if (state.tool === 'laser') {
      showLaser(e);
      return;
    }
    pushUndo();
    state.drawing = true;
    state.start = p;
    state.last = p;
    state.preview = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.setPointerCapture?.(e.pointerId);
    if (['pen','marker','eraser'].includes(state.tool)) drawFreePoint(p);
  }

  function pointerMove(e) {
    if (state.tool === 'laser') {
      if (e.buttons) showLaser(e);
      return;
    }
    if (!state.drawing) return;
    const p = pointFromEvent(e);
    if (['pen','marker','eraser'].includes(state.tool)) {
      drawFreeSegment(state.last, p);
      state.last = p;
    } else {
      ctx.putImageData(state.preview, 0, 0);
      drawShape(state.start, p, state.tool);
    }
  }

  function pointerUp(e) {
    if (!state.drawing) return;
    const p = pointFromEvent(e);
    if (!['pen','marker','eraser'].includes(state.tool)) {
      ctx.putImageData(state.preview, 0, 0);
      drawShape(state.start, p, state.tool);
    }
    state.drawing = false;
    state.start = null;
    state.last = null;
    state.preview = null;
    commitChange();
  }

  function pointerLeave() {
    if (state.tool === 'laser') hideLaserSoon();
  }

  function configureStroke(tool = state.tool) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = tool === 'marker' ? Math.max(14, state.lineWidth * 3) : tool === 'eraser' ? Math.max(18, state.lineWidth * 4) : state.lineWidth;
    ctx.strokeStyle = state.color;
    ctx.fillStyle = state.color;
    ctx.globalAlpha = tool === 'marker' ? .24 : 1;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
  }

  function resetContext() {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawFreePoint(p) {
    configureStroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1, ctx.lineWidth / 2), 0, Math.PI * 2);
    ctx.fill();
    resetContext();
  }

  function drawFreeSegment(a, b) {
    configureStroke();
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    resetContext();
  }

  function drawShape(a, b, tool) {
    configureStroke('pen');
    ctx.beginPath();
    if (tool === 'line' || tool === 'arrow') {
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      if (tool === 'arrow') drawArrowHead(a, b);
    } else if (tool === 'rect' || tool === 'curtain') {
      const x = Math.min(a.x,b.x), y = Math.min(a.y,b.y), w = Math.abs(b.x-a.x), h = Math.abs(b.y-a.y);
      if (tool === 'curtain') {
        ctx.save(); ctx.fillStyle = '#dfe8e3'; ctx.globalAlpha = .98; ctx.fillRect(x,y,w,h); ctx.restore();
      } else ctx.strokeRect(x,y,w,h);
    } else if (tool === 'ellipse') {
      const cx=(a.x+b.x)/2, cy=(a.y+b.y)/2, rx=Math.abs(b.x-a.x)/2, ry=Math.abs(b.y-a.y)/2;
      ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2); ctx.stroke();
    }
    resetContext();
  }

  function drawArrowHead(a,b) {
    const angle = Math.atan2(b.y-a.y,b.x-a.x), size = 18 + state.lineWidth;
    ctx.beginPath();
    ctx.moveTo(b.x,b.y);
    ctx.lineTo(b.x-size*Math.cos(angle-Math.PI/6), b.y-size*Math.sin(angle-Math.PI/6));
    ctx.moveTo(b.x,b.y);
    ctx.lineTo(b.x-size*Math.cos(angle+Math.PI/6), b.y-size*Math.sin(angle+Math.PI/6));
    ctx.stroke();
  }

  function pushUndo() {
    const snap = snapshotPage();
    state.undo.push(snap);
    if (state.undo.length > 30) state.undo.shift();
    state.redo = [];
  }

  function snapshotPage() {
    return {
      image: canvas.toDataURL('image/png'),
      texts: getTexts(),
      background: board.dataset.background || 'clean'
    };
  }

  function restoreSnapshot(snap) {
    if (!snap) return;
    clearCanvasOnly();
    board.dataset.background = snap.background || 'clean';
    syncBackgroundButtons();
    renderTexts(snap.texts || []);
    if (!snap.image) { commitChange(); return; }
    const img = new Image();
    img.onload = () => { ctx.drawImage(img,0,0,canvas.width,canvas.height); commitChange(); };
    img.src = snap.image;
  }

  function undo() {
    if (!state.undo.length) return;
    state.redo.push(snapshotPage());
    restoreSnapshot(state.undo.pop());
  }

  function redo() {
    if (!state.redo.length) return;
    state.undo.push(snapshotPage());
    restoreSnapshot(state.redo.pop());
  }

  function clearCanvasOnly() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
  }

  function clearPage() {
    if (!confirm('Очистити поточну сторінку?')) return;
    pushUndo();
    clearCanvasOnly();
    textLayer.innerHTML = '';
    commitChange();
  }

  function addPage() {
    saveCurrentPage();
    state.pages.push(blankPage(`Сторінка ${state.pages.length + 1}`));
    state.activePage = state.pages.length - 1;
    state.undo=[]; state.redo=[];
    renderPages(); loadPage(state.activePage); scheduleSave();
  }

  function duplicatePage() {
    saveCurrentPage();
    const src = state.pages[state.activePage];
    const clone = JSON.parse(JSON.stringify(src));
    clone.name = `${src.name} — копія`;
    state.pages.splice(state.activePage + 1, 0, clone);
    state.activePage += 1;
    state.undo=[]; state.redo=[];
    renderPages(); loadPage(state.activePage); scheduleSave();
  }

  function switchPage(index) {
    if (index === state.activePage) return;
    saveCurrentPage();
    state.activePage = index;
    state.undo=[]; state.redo=[];
    renderPages(); loadPage(index); scheduleSave();
  }

  function renderPages() {
    pagesEl.innerHTML = '';
    state.pages.forEach((page, index) => {
      const btn = document.createElement('button');
      btn.className = `page-tab${index===state.activePage?' active':''}`;
      btn.innerHTML = `<span class="page-thumb"></span><span class="page-meta"><strong>${index+1}</strong><span>${escapeHtml(page.name || `Сторінка ${index+1}`)}</span></span>`;
      btn.addEventListener('click', () => switchPage(index));
      btn.addEventListener('dblclick', () => renamePage(index));
      pagesEl.appendChild(btn);
    });
  }

  function renamePage(index) {
    const current = state.pages[index].name || `Сторінка ${index+1}`;
    const next = prompt('Назва сторінки:', current);
    if (next && next.trim()) {
      state.pages[index].name = next.trim();
      renderPages(); scheduleSave();
    }
  }

  function saveCurrentPage() {
    const page = state.pages[state.activePage];
    if (!page) return;
    page.image = canvas.toDataURL('image/png');
    page.texts = getTexts();
    page.background = board.dataset.background || 'clean';
  }

  function loadPage(index) {
    const page = state.pages[index];
    clearCanvasOnly();
    textLayer.innerHTML = '';
    board.dataset.background = page.background || 'clean';
    syncBackgroundButtons();
    renderTexts(page.texts || []);
    if (page.image) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img,0,0,canvas.width,canvas.height);
      img.src = page.image;
    }
  }

  function commitChange() {
    saveCurrentPage();
    scheduleSave();
  }

  function scheduleSave() {
    autosaveState.textContent = 'Збереження…';
    clearTimeout(state.autosaveTimer);
    state.autosaveTimer = setTimeout(() => {
      saveCurrentPage();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ pages: state.pages, activePage: state.activePage }));
      autosaveState.textContent = 'Збережено';
    }, 350);
  }

  function setBackground(bg) {
    pushUndo();
    board.dataset.background = bg;
    syncBackgroundButtons();
    commitChange();
  }

  function syncBackgroundButtons() {
    document.querySelectorAll('#backgroundButtons button').forEach(btn => btn.classList.toggle('selected', btn.dataset.bg === board.dataset.background));
  }

  function openTextDialog(seed='') {
    state.pendingTextPosition = state.pendingTextPosition || {x:220,y:150};
    textInput.value = seed;
    textDialog.showModal();
    setTimeout(() => { textInput.focus(); textInput.setSelectionRange(textInput.value.length,textInput.value.length); }, 30);
  }

  function addText(text,x,y) {
    pushUndo();
    const el = document.createElement('div');
    el.className = 'board-text';
    el.textContent = text;
    el.dataset.x = x;
    el.dataset.y = y;
    placeTextElement(el,x,y);
    el.addEventListener('dblclick', () => editText(el));
    textLayer.appendChild(el);
    commitChange();
  }

  function placeTextElement(el,x,y) {
    el.style.left = `${x/canvas.width*100}%`;
    el.style.top = `${y/canvas.height*100}%`;
  }

  function editText(el) {
    const next = prompt('Редагувати текст:', el.textContent);
    if (next === null) return;
    pushUndo();
    el.textContent = next;
    commitChange();
  }

  function getTexts() {
    return [...textLayer.querySelectorAll('.board-text')].map(el => ({ text:el.textContent,x:Number(el.dataset.x),y:Number(el.dataset.y),color:el.style.color||state.color }));
  }

  function renderTexts(items) {
    textLayer.innerHTML='';
    items.forEach(item => {
      const el=document.createElement('div');
      el.className='board-text'; el.textContent=item.text; el.dataset.x=item.x; el.dataset.y=item.y;
      if(item.color) el.style.color=item.color;
      placeTextElement(el,item.x,item.y);
      el.addEventListener('dblclick',()=>editText(el));
      textLayer.appendChild(el);
    });
  }

  function insertImageFile(file) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => insertImageData(reader.result);
    reader.readAsDataURL(file);
    imageInput.value='';
  }

  function insertImageData(src) {
    const img = new Image();
    img.onload = () => {
      pushUndo();
      const maxW=canvas.width*.58, maxH=canvas.height*.62;
      const scale=Math.min(maxW/img.width,maxH/img.height,1);
      const w=img.width*scale,h=img.height*scale;
      const x=(canvas.width-w)/2,y=(canvas.height-h)/2;
      ctx.save();
      ctx.fillStyle='#ffffff'; ctx.fillRect(x-8,y-8,w+16,h+16);
      ctx.strokeStyle='#d7e1dc'; ctx.lineWidth=2; ctx.strokeRect(x-8,y-8,w+16,h+16);
      ctx.drawImage(img,x,y,w,h); ctx.restore();
      commitChange();
    };
    img.src=src;
  }

  function handlePaste(e) {
    const items=[...(e.clipboardData?.items||[])];
    const imageItem=items.find(i=>i.type.startsWith('image/'));
    if(imageItem){ e.preventDefault(); insertImageFile(imageItem.getAsFile()); }
  }

  function insertAxes() {
    pushUndo();
    ctx.save(); ctx.strokeStyle=state.color; ctx.fillStyle=state.color; ctx.lineWidth=3;
    const cx=800,cy=450,len=300;
    ctx.beginPath(); ctx.moveTo(cx-len,cy); ctx.lineTo(cx+len,cy); ctx.moveTo(cx,cy+len); ctx.lineTo(cx,cy-len); ctx.stroke();
    drawArrowHead({x:cx+len-40,y:cy},{x:cx+len,y:cy}); drawArrowHead({x:cx,y:cy-len+40},{x:cx,y:cy-len});
    for(let i=-5;i<=5;i++){if(i===0)continue;const d=i*50;ctx.beginPath();ctx.moveTo(cx+d,cy-7);ctx.lineTo(cx+d,cy+7);ctx.moveTo(cx-7,cy-d);ctx.lineTo(cx+7,cy-d);ctx.stroke();}
    ctx.font='24px system-ui';ctx.fillText('x',cx+len-20,cy-18);ctx.fillText('y',cx+16,cy-len+24);ctx.restore();
    commitChange();
  }

  function insertNumberLine() {
    pushUndo();
    ctx.save();ctx.strokeStyle=state.color;ctx.fillStyle=state.color;ctx.lineWidth=3;
    const y=450,x1=350,x2=1250;ctx.beginPath();ctx.moveTo(x1,y);ctx.lineTo(x2,y);ctx.stroke();
    drawArrowHead({x:x2-40,y},{x:x2,y});
    ctx.font='21px system-ui';ctx.textAlign='center';
    for(let i=-5;i<=5;i++){const x=800+i*75;ctx.beginPath();ctx.moveTo(x,y-10);ctx.lineTo(x,y+10);ctx.stroke();ctx.fillText(String(i),x,y+38);}ctx.restore();
    commitChange();
  }

  function insertXYTable() {
    pushUndo();
    ctx.save();ctx.strokeStyle=state.color;ctx.fillStyle=state.color;ctx.lineWidth=2;
    const x=560,y=280,w=480,h=280,rows=5,cols=4;ctx.strokeRect(x,y,w,h);
    for(let r=1;r<rows;r++){ctx.beginPath();ctx.moveTo(x,y+r*h/rows);ctx.lineTo(x+w,y+r*h/rows);ctx.stroke();}
    for(let c=1;c<cols;c++){ctx.beginPath();ctx.moveTo(x+c*w/cols,y);ctx.lineTo(x+c*w/cols,y+h);ctx.stroke();}
    ctx.font='28px system-ui';ctx.textAlign='center';ctx.fillText('x',x+w/cols/2,y+38);ctx.fillText('y',x+w/cols+w/cols/2,y+38);ctx.restore();
    commitChange();
  }

  function setZoom(next) {
    state.zoom=Math.max(.6,Math.min(1.8,Math.round(next*10)/10));
    board.style.transform=`scale(${state.zoom})`;
    boardWrap.querySelector('.board-viewport').style.paddingBottom=`${Math.max(14,(state.zoom-1)*board.offsetHeight+14)}px`;
    document.getElementById('zoomLabel').textContent=`${Math.round(state.zoom*100)}%`;
  }

  function toggleMathPanel() { workspace.classList.toggle('math-closed'); }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.(); else await document.exitFullscreen?.();
  }

  function showLaser(e) {
    const rect=board.getBoundingClientRect();
    laserDot.hidden=false;
    laserDot.style.left=`${e.clientX-rect.left}px`;
    laserDot.style.top=`${e.clientY-rect.top}px`;
    laserDot.style.opacity='1';
    hideLaserSoon();
  }

  function hideLaserSoon() {
    clearTimeout(showLaser.timer);
    showLaser.timer=setTimeout(()=>{laserDot.style.opacity='0';setTimeout(()=>laserDot.hidden=true,250);},700);
  }

  function drawBackgroundForExport(exportCtx,bg) {
    exportCtx.fillStyle='#fffefa'; exportCtx.fillRect(0,0,canvas.width,canvas.height);
    exportCtx.strokeStyle='#e1e9e4'; exportCtx.lineWidth=1;
    if(bg==='grid'||bg==='coords'){
      const step=bg==='coords'?40:32;
      for(let x=0;x<=canvas.width;x+=step){exportCtx.beginPath();exportCtx.moveTo(x,0);exportCtx.lineTo(x,canvas.height);exportCtx.stroke();}
      for(let y=0;y<=canvas.height;y+=step){exportCtx.beginPath();exportCtx.moveTo(0,y);exportCtx.lineTo(canvas.width,y);exportCtx.stroke();}
      if(bg==='coords'){exportCtx.strokeStyle='#9bb6ab';exportCtx.lineWidth=2;exportCtx.beginPath();exportCtx.moveTo(canvas.width/2,0);exportCtx.lineTo(canvas.width/2,canvas.height);exportCtx.moveTo(0,canvas.height/2);exportCtx.lineTo(canvas.width,canvas.height/2);exportCtx.stroke();}
    }
    if(bg==='lines')for(let y=34;y<canvas.height;y+=34){exportCtx.beginPath();exportCtx.moveTo(0,y);exportCtx.lineTo(canvas.width,y);exportCtx.stroke();}
  }

  function exportPng() {
    saveCurrentPage();
    const out=document.createElement('canvas');out.width=canvas.width;out.height=canvas.height;const o=out.getContext('2d');
    drawBackgroundForExport(o,board.dataset.background);o.drawImage(canvas,0,0);
    o.fillStyle=state.color;o.font='28px system-ui';o.textBaseline='top';
    getTexts().forEach(t=>{o.fillStyle=t.color||state.color;wrapText(o,t.text,t.x,t.y,700,36);});
    const a=document.createElement('a');a.download=`TeacherBoard-${state.activePage+1}.png`;a.href=out.toDataURL('image/png');a.click();
  }

  function wrapText(c,text,x,y,maxWidth,lineHeight){
    String(text).split('\n').forEach((paragraph,pi)=>{const words=paragraph.split(' ');let line='';for(const word of words){const test=line?`${line} ${word}`:word;if(c.measureText(test).width>maxWidth&&line){c.fillText(line,x,y);line=word;y+=lineHeight;}else line=test;}c.fillText(line,x,y);y+=lineHeight;if(pi<String(text).split('\n').length-1)y+=4;});
  }

  function handleShortcuts(e) {
    if (e.target.matches('textarea,input,select')) return;
    if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}
    if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='y'){e.preventDefault();redo();}
    if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='d'){e.preventDefault();duplicatePage();}
    if (e.key==='Escape' && state.drawing){state.drawing=false;if(state.preview)ctx.putImageData(state.preview,0,0);}
  }

  function escapeHtml(value){return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}

  boot();
})();
