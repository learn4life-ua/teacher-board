const WIDTH=1600, HEIGHT=900;

function backgroundCss(bg='clean'){
  if(bg==='grid') return 'background-color:#fff;background-image:linear-gradient(#d9e5e1 1px,transparent 1px),linear-gradient(90deg,#d9e5e1 1px,transparent 1px);background-size:40px 40px;';
  if(bg==='lines') return 'background-color:#fff;background-image:linear-gradient(#d9e5e1 1px,transparent 1px);background-size:100% 40px;';
  if(bg==='coords') return 'background-color:#fff;background-image:linear-gradient(#e7efec 1px,transparent 1px),linear-gradient(90deg,#e7efec 1px,transparent 1px),linear-gradient(#aac5bc 1px,transparent 1px),linear-gradient(90deg,#aac5bc 1px,transparent 1px);background-size:20px 20px,20px 20px,100px 100px,100px 100px;';
  return 'background:#fff;';
}

function cleanClone(layer){
  const clone=layer.cloneNode(true);
  clone.querySelectorAll('.object-handle,.object-delete,.geometry-close,.geometry-rotate,.geometry-resize,.geometry-angle,.geometry-radius,.geometry-action,.compass-modes').forEach(el=>el.remove());
  clone.querySelectorAll('.selected').forEach(el=>el.classList.remove('selected'));
  return clone;
}

function loadImage(src){
  return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});
}

export async function exportScenePng({state,scene,canvas,objectLayer,instrumentLayer,fileName}){
  const objects=cleanClone(objectLayer);
  const instruments=cleanClone(instrumentLayer);
  const drawing=canvas.toDataURL('image/png');
  const css=[...document.styleSheets].map(sheet=>{try{return [...sheet.cssRules].map(r=>r.cssText).join('\n');}catch{return '';}}).join('\n');
  const bg=state.pages[state.activePage]?.background||'clean';
  const html=`<div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;${backgroundCss(bg)}">
    <style>${css}</style>
    <img src="${drawing}" style="position:absolute;inset:0;width:${WIDTH}px;height:${HEIGHT}px" />
    ${objects.outerHTML}
    ${instruments.outerHTML}
  </div>`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
  const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  try{
    const img=await loadImage(url);
    const out=document.createElement('canvas');out.width=WIDTH;out.height=HEIGHT;
    const ctx=out.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.drawImage(img,0,0);
    const a=document.createElement('a');a.download=fileName||`teacherboard-${new Date().toISOString().slice(0,10)}.png`;a.href=out.toDataURL('image/png');a.click();
  } finally { URL.revokeObjectURL(url); }
}
