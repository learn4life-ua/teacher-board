const WIDTH=1600, HEIGHT=900;

function safeName(value){return String(value||'teacherboard').replace(/[\\/:*?"<>|]+/g,'-').trim()||'teacherboard';}
function num(value,fallback=0){const n=parseFloat(value);return Number.isFinite(n)?n:fallback;}
function rotationOf(el){const m=(el.style.transform||'').match(/rotate\(([-\d.]+)deg\)/);return m?Number(m[1])||0:0;}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});}

function drawBackground(ctx,bg){
  ctx.fillStyle='#fff';ctx.fillRect(0,0,WIDTH,HEIGHT);
  const lines=(step,color)=>{ctx.beginPath();for(let x=step;x<WIDTH;x+=step){ctx.moveTo(x,0);ctx.lineTo(x,HEIGHT);}for(let y=step;y<HEIGHT;y+=step){ctx.moveTo(0,y);ctx.lineTo(WIDTH,y);}ctx.strokeStyle=color;ctx.lineWidth=1;ctx.stroke();};
  if(bg==='grid') lines(40,'#d9e5e1');
  if(bg==='lines'){ctx.beginPath();for(let y=40;y<HEIGHT;y+=40){ctx.moveTo(0,y);ctx.lineTo(WIDTH,y);}ctx.strokeStyle='#d9e5e1';ctx.lineWidth=1;ctx.stroke();}
  if(bg==='coords'){
    lines(20,'#e7efec');
    lines(100,'#aac5bc');
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(WIDTH/2,0);ctx.lineTo(WIDTH/2,HEIGHT);
    ctx.moveTo(0,HEIGHT/2);ctx.lineTo(WIDTH,HEIGHT/2);
    ctx.strokeStyle='#76998e';ctx.lineWidth=2;ctx.stroke();
    ctx.restore();
  }
}

function inlineSvgStyles(source,clone){
  const props=['color','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-dasharray','opacity','font-size','font-family','font-weight','text-anchor','dominant-baseline'];
  const sourceNodes=[source,...source.querySelectorAll('*')],cloneNodes=[clone,...clone.querySelectorAll('*')];
  sourceNodes.forEach((node,i)=>{const target=cloneNodes[i];if(!target)return;const cs=getComputedStyle(node);for(const prop of props){const v=cs.getPropertyValue(prop);if(v)target.style.setProperty(prop,v);}});
}

async function svgImage(svg,w,h){
  const clone=svg.cloneNode(true);inlineSvgStyles(svg,clone);clone.setAttribute('width',String(w));clone.setAttribute('height',String(h));
  const xml=new XMLSerializer().serializeToString(clone);const url=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml;charset=utf-8'}));
  try{return await loadImage(url);}finally{setTimeout(()=>URL.revokeObjectURL(url),0);}
}

function withTransform(ctx,x,y,w,h,rotation,draw){
  ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(rotation*Math.PI/180);ctx.translate(-w/2,-h/2);draw();ctx.restore();
}

async function drawSvgBox(ctx,el){
  const svg=el.querySelector(':scope > svg, svg');if(!svg)return;
  const x=num(el.style.left),y=num(el.style.top),w=num(el.style.width,100),h=num(el.style.height,100),rotation=rotationOf(el);
  const img=await svgImage(svg,w,h);withTransform(ctx,x,y,w,h,rotation,()=>ctx.drawImage(img,0,0,w,h));
}

function wrapText(ctx,text,maxWidth){
  const paragraphs=String(text||'').split('\n'),lines=[];
  for(const paragraph of paragraphs){const words=paragraph.split(/\s+/);let line='';for(const word of words){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width<=maxWidth||!line)line=test;else{lines.push(line);line=word;}}lines.push(line);}
  return lines;
}

function drawTextBox(ctx,el){
  const content=el.querySelector('.text-object-content');if(!content)return;
  const x=num(el.style.left),y=num(el.style.top),w=num(el.style.width,420),h=num(el.style.height,100),rotation=rotationOf(el),cs=getComputedStyle(content);
  withTransform(ctx,x,y,w,h,rotation,()=>{ctx.fillStyle=cs.color||'#245d55';ctx.font=`${cs.fontWeight||'400'} ${cs.fontSize||'32px'} ${cs.fontFamily||'Arial, sans-serif'}`;ctx.textBaseline='top';const lineHeight=num(cs.lineHeight,num(cs.fontSize,32)*1.2);const lines=wrapText(ctx,content.textContent,w);lines.forEach((line,i)=>{if((i+1)*lineHeight<=h+lineHeight)ctx.fillText(line,0,i*lineHeight,w);});});
}

async function drawImageBox(ctx,el){
  const source=el.querySelector('img');if(!source?.src)return;
  const img=source.complete&&source.naturalWidth?source:await loadImage(source.src);const x=num(el.style.left),y=num(el.style.top),w=num(el.style.width,200),h=num(el.style.height,150),rotation=rotationOf(el);
  const ratio=Math.min(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*ratio,dh=img.naturalHeight*ratio,dx=(w-dw)/2,dy=(h-dh)/2;
  withTransform(ctx,x,y,w,h,rotation,()=>ctx.drawImage(img,dx,dy,dw,dh));
}

async function drawObjects(ctx,objectLayer){
  for(const el of objectLayer.querySelectorAll('.scene-object')){
    if(el.classList.contains('text-object'))drawTextBox(ctx,el);
    else if(el.classList.contains('image-object'))await drawImageBox(ctx,el);
    else await drawSvgBox(ctx,el);
  }
}
async function drawInstruments(ctx,instrumentLayer){for(const el of instrumentLayer.querySelectorAll('.geometry-tool'))await drawSvgBox(ctx,el);}

export async function exportScenePng({scene,canvas,objectLayer,instrumentLayer,fileName}){
  const out=document.createElement('canvas');out.width=WIDTH;out.height=HEIGHT;const ctx=out.getContext('2d');
  drawBackground(ctx,scene.dataset.background||'clean');ctx.drawImage(canvas,0,0,WIDTH,HEIGHT);await drawObjects(ctx,objectLayer);await drawInstruments(ctx,instrumentLayer);
  const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));
  if(!blob)throw new Error('Не вдалося сформувати PNG');
  const url=URL.createObjectURL(blob);try{const a=document.createElement('a');a.download=`${safeName(fileName)}.png`;a.href=url;document.body.appendChild(a);a.click();a.remove();}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
