(() => {
  'use strict';
  const STORAGE_KEY='teacherboard.v1';
  const panel=document.getElementById('mathPanel');
  const canvas=document.getElementById('boardCanvas');
  if(!panel||!canvas) return;

  function readData(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return {}}}
  function writeData(d){localStorage.setItem(STORAGE_KEY,JSON.stringify(d))}
  function activeIndex(d){return Math.max(0,Math.min(Number(d.activePage)||0,(d.pages?.length||1)-1))}
  function uid(){return 'g_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7)}
  function pageHeight(){return canvas.height||900}

  function addUi(){
    if(document.querySelector('.tb-graph-section')) return;
    const section=document.createElement('section');section.className='panel-section tb-graph-section';
    section.innerHTML=`<h3>Графік функції</h3>
      <div class="tb-graph-row"><input class="tb-graph-input" id="tbGraphExpr" value="x^2 - 4" aria-label="Функція" placeholder="Напр. x^2 - 4"><button class="tb-graph-plot" id="tbGraphPlot">Побудувати</button></div>
      <div class="tb-graph-range">
        <label>x min<input id="tbGraphXMin" type="number" value="-10" step="1"></label><label>x max<input id="tbGraphXMax" type="number" value="10" step="1"></label>
        <label>y min<input id="tbGraphYMin" type="number" value="-10" step="1"></label><label>y max<input id="tbGraphYMax" type="number" value="10" step="1"></label>
      </div><p class="tb-graph-error" id="tbGraphError"></p><p class="tb-graph-help">Підтримує: <code>x^2</code>, <code>sin(x)</code>, <code>1/x</code>, <code>sqrt(x)</code>, <code>tan(x)</code>.</p>`;
    panel.appendChild(section);
    document.getElementById('tbGraphPlot').addEventListener('click',plot);
    document.getElementById('tbGraphExpr').addEventListener('keydown',e=>{if(e.key==='Enter')plot()});
  }

  function num(id){return Number(document.getElementById(id)?.value)}
  function escapeXml(s){return String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]))}

  function plot(){
    const err=document.getElementById('tbGraphError');err.textContent='';
    if(!window.math){err.textContent='Математичний модуль ще завантажується. Спробуйте ще раз.';return}
    const expression=(document.getElementById('tbGraphExpr').value||'').trim().replace(/^y\s*=\s*/i,'');
    const xmin=num('tbGraphXMin'),xmax=num('tbGraphXMax'),ymin=num('tbGraphYMin'),ymax=num('tbGraphYMax');
    if(!expression){err.textContent='Введіть функцію.';return}
    if(![xmin,xmax,ymin,ymax].every(Number.isFinite)||xmin>=xmax||ymin>=ymax){err.textContent='Перевірте межі осей.';return}
    let compiled;try{compiled=math.compile(expression)}catch(e){err.textContent='Не вдалося розібрати функцію.';return}
    try{
      const svg=makeGraphSvg(compiled,expression,xmin,xmax,ymin,ymax);
      const src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
      const d=readData();if(!Array.isArray(d.pages)||!d.pages.length)throw new Error('page');
      const i=activeIndex(d),w=760,h=500,ph=pageHeight();d.pages[i].objects=d.pages[i].objects||[];
      d.pages[i].objects.push({id:uid(),kind:'image',src,x:(1600-w)/2,y:Math.max(50,(ph-h)/2),w,h,graph:{expression,xmin,xmax,ymin,ymax}});
      writeData(d);document.getElementById('autosaveState').textContent='Збережено';
      // Existing v3 renderer watches page-tab mutations. Toggle active class to trigger a refresh without changing page.
      const tab=document.querySelector('.page-tab.active');if(tab){tab.classList.remove('active');requestAnimationFrame(()=>tab.classList.add('active'))}
      setTimeout(()=>document.querySelector('.tb-select-tool')?.click(),80);
    }catch(e){err.textContent='Не вдалося побудувати графік.'}
  }

  function makeGraphSvg(compiled,expression,xmin,xmax,ymin,ymax){
    const W=760,H=500,pad=42,plotW=W-pad*2,plotH=H-pad*2;
    const sx=plotW/(xmax-xmin),sy=plotH/(ymax-ymin);
    const cx=pad-xmin*sx,cy=pad+ymax*sy;
    const canvasX=x=>cx+x*sx,canvasY=y=>cy-y*sy;
    const sampleCount=Math.max(600,Math.min(2400,Math.round(plotW*2.2)));
    const dx=(xmax-xmin)/sampleCount;
    const jumpThreshold=plotH*.75;
    const paths=[];let current=[];let last=null;
    for(let i=0;i<=sampleCount;i++){
      const x=xmin+i*dx;let y;try{y=compiled.evaluate({x})}catch{y=NaN}
      if(typeof y!=='number'||!Number.isFinite(y)){if(current.length>1)paths.push(current);current=[];last=null;continue}
      const px=canvasX(x),py=canvasY(y);
      const outside=py<pad-plotH*2||py>H-pad+plotH*2;
      const discontinuity=last&&Math.abs(py-last.py)>jumpThreshold;
      if(outside||discontinuity){if(current.length>1)paths.push(current);current=[];last=null;if(outside)continue}
      current.push([px,py]);last={px,py};
    }
    if(current.length>1)paths.push(current);
    const curve=paths.map(seg=>`<path d="M ${seg.map(p=>`${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L ')}"/>`).join('');
    const grid=[];const niceX=niceStep((xmax-xmin)/10),niceY=niceStep((ymax-ymin)/8);
    for(let x=Math.ceil(xmin/niceX)*niceX;x<=xmax+1e-9;x+=niceX){const px=canvasX(x);grid.push(`<line x1="${px}" y1="${pad}" x2="${px}" y2="${H-pad}"/><text x="${px}" y="${Math.min(H-pad+20,cy+20)}">${fmt(x)}</text>`)}
    for(let y=Math.ceil(ymin/niceY)*niceY;y<=ymax+1e-9;y+=niceY){const py=canvasY(y);grid.push(`<line x1="${pad}" y1="${py}" x2="${W-pad}" y2="${py}"/><text x="${Math.max(pad+18,cx-10)}" y="${py-5}" text-anchor="end">${fmt(y)}</text>`)}
    const xAxis=(0>=ymin&&0<=ymax)?`<line class="axis" x1="${pad}" y1="${cy}" x2="${W-pad}" y2="${cy}"/><path class="axis" d="M ${W-pad} ${cy} l -10 -6 m 10 6 l -10 6"/>`:'';
    const yAxis=(0>=xmin&&0<=xmax)?`<line class="axis" x1="${cx}" y1="${H-pad}" x2="${cx}" y2="${pad}"/><path class="axis" d="M ${cx} ${pad} l -6 10 m 6 -10 l 6 10"/>`:'';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" rx="12" fill="#fffefa"/><style>.grid line{stroke:#e3e9e5;stroke-width:1}.grid text{font:12px system-ui;fill:#64756e;text-anchor:middle}.axis{stroke:#44534e;stroke-width:2;fill:none;stroke-linecap:round}.curve{stroke:#245d55;stroke-width:3;fill:none;stroke-linejoin:round;stroke-linecap:round}.title{font:600 16px system-ui;fill:#24312d}</style><text class="title" x="${pad}" y="25">y = ${escapeXml(expression)}</text><g class="grid">${grid.join('')}</g>${xAxis}${yAxis}<defs><clipPath id="clip"><rect x="${pad}" y="${pad}" width="${plotW}" height="${plotH}"/></clipPath></defs><g class="curve" clip-path="url(#clip)">${curve}</g></svg>`;
  }
  function niceStep(raw){const p=Math.pow(10,Math.floor(Math.log10(Math.max(raw,1e-9)))),n=raw/p;return (n<=1?1:n<=2?2:n<=5?5:10)*p}
  function fmt(v){const n=Math.abs(v)<1e-9?0:v;return Number.isInteger(n)?String(n):String(Number(n.toPrecision(4)))}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(addUi,0));else setTimeout(addUi,0);
})();