import { activePage, uid } from '../core/state.js';
import { pushHistory } from '../core/history.js';
import { sceneDeltaFromClient, sceneDeltaToLocalAxes } from '../core/scene.js';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

export function sceneDeltaToLocal(dx,dy,rotation=0){
  return sceneDeltaToLocalAxes(dx,dy,rotation);
}

export function protractorAngleFromPointer({pointerX,pointerY,pivotX,pivotY,rotation=0}){
  let sceneAngle=Math.atan2(pivotY-pointerY,pointerX-pivotX)*180/Math.PI;
  let localAngle=sceneAngle-(Number(rotation)||0);
  while(localAngle<0)localAngle+=360;
  while(localAngle>=360)localAngle-=360;
  return clamp(localAngle<=180?localAngle:180,0,180);
}

export function compassRadiusFromDrag({startRadius,dx,dy,rotation=0,min=30,max=120}){
  const local=sceneDeltaToLocalAxes(dx,dy,rotation);
  return clamp((Number(startRadius)||0)+local.x,min,max);
}

export function compassRightPercent(item){
  const w=Math.max(1,Number(item?.w)||260),r=Math.max(0,Number(item?.radius)||92);
  return clamp(28+(r/w)*100,28,82);
}

export class GeometryTools{
  constructor({state,layer,objectManager,onChange}){this.state=state;this.layer=layer;this.objectManager=objectManager;this.onChange=onChange;this.drag=null;window.addEventListener('pointermove',e=>this.pointerMove(e));window.addEventListener('pointerup',()=>this.pointerUp());window.addEventListener('pointercancel',()=>this.pointerUp());window.addEventListener('blur',()=>this.pointerUp());}
  get items(){return activePage(this.state).instruments;}
  add(type){pushHistory(this.state);const base={id:uid(type),type,x:520,y:290,rotation:0};const item=type==='ruler'?{...base,w:520,h:96}:type==='protractor'?{...base,w:420,h:220,angle:60}:{...base,w:260,h:300,radius:92,mode:'circle',arcStart:0,arcEnd:180};this.items.push(item);this.render();this.onChange?.();}
  render(){this.layer.innerHTML='';for(const item of this.items)this.layer.appendChild(this.element(item));}
  remove(id){const i=this.items.findIndex(x=>x.id===id);if(i<0)return;pushHistory(this.state);this.items.splice(i,1);this.render();this.onChange?.();}
  element(item){const el=document.createElement('div');el.className=`geometry-tool geometry-${item.type}`;el.dataset.id=item.id;Object.assign(el.style,{left:`${item.x}px`,top:`${item.y}px`,width:`${item.w}px`,height:`${item.h}px`,transform:`rotate(${item.rotation||0}deg)`});el.innerHTML=`${this.svg(item)}${this.actionMarkup(item)}<button class="geometry-close" type="button" title="Закрити">×</button><span class="geometry-rotate" data-handle="rotate" title="Повернути">↻</span><span class="geometry-resize" data-handle="resize" title="Змінити розмір"></span>${item.type==='protractor'?this.angleHandleMarkup(item):''}${item.type==='compass'?this.compassControls(item):''}`;
    el.addEventListener('pointerdown',e=>this.pointerDown(e,item));
    el.querySelector('.geometry-close')?.addEventListener('pointerdown',e=>e.stopPropagation());el.querySelector('.geometry-close')?.addEventListener('click',e=>{e.stopPropagation();this.remove(item.id);});
    el.querySelector('.geometry-action')?.addEventListener('pointerdown',e=>e.stopPropagation());el.querySelector('.geometry-action')?.addEventListener('click',e=>{e.stopPropagation();this.applyConstruction(item);});
    el.querySelectorAll('.compass-mode').forEach(b=>{b.addEventListener('pointerdown',e=>e.stopPropagation());b.addEventListener('click',e=>{e.stopPropagation();pushHistory(this.state);item.mode=b.dataset.mode;this.render();this.onChange?.();});});return el;}
  actionMarkup(item){const label=item.type==='ruler'?'Провести':item.type==='protractor'?`Побудувати ${Math.round(item.angle||0)}°`:item.mode==='arc'?'Побудувати дугу':'Побудувати коло';return `<button class="geometry-action" type="button">${label}</button>`;}
  angleHandleMarkup(item){const angle=clamp(Number(item.angle)||0,0,180),theta=angle*Math.PI/180,left=50+42*Math.cos(theta),top=90.9-76*Math.sin(theta);return `<span class="geometry-angle" data-handle="angle" style="left:${left}%;top:${top}%" title="Кут ${Math.round(angle)}°"></span>`;}
  compassControls(item){const left=compassRightPercent(item);return `<span class="geometry-radius" data-handle="radius" style="left:${left}%;top:90%" title="Радіус ${Math.round(item.radius||92)}"></span><div class="compass-modes"><button type="button" class="compass-mode${item.mode!=='arc'?' active':''}" data-mode="circle">Коло</button><button type="button" class="compass-mode${item.mode==='arc'?' active':''}" data-mode="arc">Дуга</button></div>`;}
  pointerDown(e,item){e.preventDefault();e.stopPropagation();const handle=e.target.closest('[data-handle]')?.dataset.handle||'move';this.drag={id:item.id,mode:handle,startX:e.clientX,startY:e.clientY,x:item.x,y:item.y,w:item.w,h:item.h,rotation:item.rotation||0,radius:item.radius||92,centerX:item.x+item.w/2,centerY:item.y+item.h/2,historyPushed:false};}
  ensureDragHistory(screenDx,screenDy){if(!this.drag||this.drag.historyPushed)return false;if(Math.abs(screenDx)<.5&&Math.abs(screenDy)<.5)return false;pushHistory(this.state);this.drag.historyPushed=true;return true;}
  pointerMove(e){if(!this.drag)return;const item=this.items.find(x=>x.id===this.drag.id);if(!item)return;const screenDx=e.clientX-this.drag.startX,screenDy=e.clientY-this.drag.startY;if(!this.ensureDragHistory(screenDx,screenDy))return;const z=this.state.zoom||1,delta=sceneDeltaFromClient(screenDx,screenDy,z),dx=delta.x,dy=delta.y;if(this.drag.mode==='move'){item.x=this.drag.x+dx;item.y=this.drag.y+dy;}else if(this.drag.mode==='resize'){const local=sceneDeltaToLocalAxes(dx,dy,this.drag.rotation),rdx=local.x,rdy=local.y;item.w=Math.max(item.type==='ruler'?260:180,this.drag.w+rdx);item.h=item.type==='ruler'?Math.max(72,this.drag.h+rdy*.2):Math.max(140,this.drag.h+rdy);if(item.type==='compass')item.radius=clamp(Number(item.radius)||92,30,Math.max(45,Math.min(item.w,item.h)*.45));}else if(this.drag.mode==='rotate'){const r=this.layer.getBoundingClientRect(),cx=r.left+this.drag.centerX*z,cy=r.top+this.drag.centerY*z;item.rotation=Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI+90;}else if(this.drag.mode==='angle'&&item.type==='protractor'){const r=this.layer.getBoundingClientRect(),cx=r.left+(item.x+item.w/2)*z,cy=r.top+(item.y+item.h*.909)*z;item.angle=protractorAngleFromPointer({pointerX:e.clientX,pointerY:e.clientY,pivotX:cx,pivotY:cy,rotation:item.rotation||0});}else if(this.drag.mode==='radius'&&item.type==='compass'){item.radius=compassRadiusFromDrag({startRadius:this.drag.radius,dx,dy,rotation:item.rotation||0,min:30,max:Math.max(45,Math.min(item.w,item.h)*.45)});}this.render();}
  pointerUp(){if(!this.drag)return;const changed=this.drag.historyPushed;this.drag=null;if(changed)this.onChange?.();}
  applyConstruction(item){if(!this.objectManager)return;if(item.type==='ruler')this.drawAlongRuler(item);else if(item.type==='protractor')this.buildAngle(item);else if(item.mode==='arc')this.buildArc(item);else this.buildCircle(item);}
  drawAlongRuler(item){const a=this.localToScene(item,item.w*.04,item.h*.90),b=this.localToScene(item,item.w*.96,item.h*.90);this.objectManager.addSegment(a,b,{color:this.state.color,lineWidth:this.state.lineWidth});}
  buildAngle(item){const pivotLocal={x:item.w*.5,y:item.h*.909},length=item.w*.42,theta=clamp(Number(item.angle)||0,0,180)*Math.PI/180,pivot=this.localToScene(item,pivotLocal.x,pivotLocal.y),baseEnd=this.localToScene(item,pivotLocal.x+length,pivotLocal.y),rayEnd=this.localToScene(item,pivotLocal.x+Math.cos(theta)*length,pivotLocal.y-Math.sin(theta)*length);this.objectManager.addSegments([{a:pivot,b:baseEnd},{a:pivot,b:rayEnd}],{color:this.state.color,lineWidth:this.state.lineWidth});}
  buildCircle(item){const center=this.localToScene(item,item.w*.28,item.h*.90),radius=Math.max(30,Number(item.radius)||92);this.objectManager.addCircle(center,radius,{color:this.state.color,lineWidth:this.state.lineWidth});}
  buildArc(item){const center=this.localToScene(item,item.w*.28,item.h*.90),radius=Math.max(30,Number(item.radius)||92);this.objectManager.addArc(center,radius,item.arcStart||0,item.arcEnd||180,{color:this.state.color,lineWidth:this.state.lineWidth,rotation:item.rotation||0});}
  localToScene(item,lx,ly){const cx=item.w/2,cy=item.h/2,x=lx-cx,y=ly-cy,rad=(item.rotation||0)*Math.PI/180;return{x:item.x+cx+x*Math.cos(rad)-y*Math.sin(rad),y:item.y+cy+x*Math.sin(rad)+y*Math.cos(rad)};}
  svg(item){if(item.type==='ruler')return this.rulerSvg();if(item.type==='protractor')return this.protractorSvg(item);return this.compassSvg(item);}
  rulerSvg(){const ticks=Array.from({length:31},(_,i)=>{const x=4+i*3.06,len=i%10===0?34:i%5===0?26:18;return `<line x1="${x}" y1="8" x2="${x}" y2="${len}"/>${i%5===0?`<text x="${x+.6}" y="47">${i}</text>`:''}`;}).join('');return `<svg viewBox="0 0 100 55" preserveAspectRatio="none"><rect x="1" y="1" width="98" height="53" rx="3"/><g>${ticks}</g><line x1="3" y1="50" x2="97" y2="50" class="guide"/></svg>`;}
  protractorSvg(item){const ticks=Array.from({length:19},(_,i)=>{const a=Math.PI-i*Math.PI/18,x1=50+Math.cos(a)*45,y1=50-Math.sin(a)*45,r2=i%3===0?37:40,x2=50+Math.cos(a)*r2,y2=50-Math.sin(a)*r2,label=i%3===0?`<text x="${50+Math.cos(a)*31}" y="${50-Math.sin(a)*31}">${180-i*10}</text>`:'';return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>${label}`;}).join('');return `<svg viewBox="0 0 100 55"><path d="M4 50 A46 46 0 0 1 96 50 L50 50 Z"/><g>${ticks}</g><line x1="4" y1="50" x2="96" y2="50" class="guide"/><circle cx="50" cy="50" r="2.5"/><text x="50" y="46" text-anchor="middle" class="angle-readout">${Math.round(item.angle||0)}°</text></svg>`;}
  compassSvg(item){const r=Math.round(item.radius||92),rightX=compassRightPercent(item),midX=(28+rightX)/2;return `<svg viewBox="0 0 100 120"><circle cx="50" cy="14" r="8"/><line x1="47" y1="22" x2="28" y2="108"/><line x1="53" y1="22" x2="${rightX.toFixed(2)}" y2="108"/><circle cx="28" cy="108" r="3"/><circle cx="${rightX.toFixed(2)}" cy="108" r="3"/><path d="M28 108 Q${midX.toFixed(2)} 94 ${rightX.toFixed(2)} 108" class="guide"/><line x1="50" y1="38" x2="${midX.toFixed(2)}" y2="67"/><circle cx="${midX.toFixed(2)}" cy="67" r="3"/><text x="50" y="82" text-anchor="middle" class="compass-readout">r = ${r}</text></svg>`;}
}
