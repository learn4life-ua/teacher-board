import { activePage, uid } from '../core/state.js';
import { pushHistory } from '../core/history.js';
import { shapeSvg } from './shapes.js';
import { graphSvg, createGraphObject } from '../math/graph.js';
import { textMarkup } from './text.js';
import { createImageObject, imageMarkup } from './images.js';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export class ObjectManager {
  constructor({ state, layer, onChange }) { this.state=state; this.layer=layer; this.onChange=onChange; this.drag=null; this.bindGlobalPointerEvents(); }
  get objects() { return activePage(this.state).objects; }

  createShape(shape, box, options={}) { return { id:uid('shape'), kind:'shape', shape, x:box.x, y:box.y, w:Math.max(options.minW??40,box.w), h:Math.max(options.minH??40,box.h), rotation:options.rotation??0, color:options.color||this.state.color, lineWidth:options.lineWidth||this.state.lineWidth }; }
  addShape(shape, box, options={}) { pushHistory(this.state); const obj=this.createShape(shape,box,options); this.objects.push(obj); this.state.selection=obj.id; this.changed(); return obj; }
  addGraph(expression='x') { pushHistory(this.state); const obj=createGraphObject(this.state,expression); this.objects.push(obj); this.state.selection=obj.id; this.changed(); return obj; }
  addText(text, options={}) { pushHistory(this.state); const obj={ id:uid('text'), kind:'text', text:String(text||'Текст'), x:options.x??360,y:options.y??180,w:options.w??420,h:options.h??100,rotation:0,color:options.color||this.state.color,fontSize:options.fontSize||32 }; this.objects.push(obj); this.state.selection=obj.id; this.changed(); return obj; }
  addImage(src, naturalWidth=800, naturalHeight=600) { pushHistory(this.state); const obj=createImageObject(src,naturalWidth,naturalHeight); this.objects.push(obj); this.state.selection=obj.id; this.changed(); return obj; }
  addSegment(a,b,options={}) { return this.addSegments([{a,b}],options)[0]; }
  addSegments(segments,options={}) { if(!segments.length)return[]; pushHistory(this.state); const created=segments.map(({a,b})=>{ const dx=b.x-a.x,dy=b.y-a.y,length=Math.max(8,Math.hypot(dx,dy)),angle=Math.atan2(dy,dx)*180/Math.PI; const obj=this.createShape('segment',{x:(a.x+b.x)/2-length/2,y:(a.y+b.y)/2-10,w:length,h:20},{minW:8,minH:20,rotation:angle,color:options.color,lineWidth:options.lineWidth}); this.objects.push(obj); return obj; }); this.state.selection=created.at(-1)?.id||null; this.changed(); return created; }
  addCircle(center,radius,options={}) { const r=Math.max(12,radius); return this.addShape('ellipse',{x:center.x-r,y:center.y-r,w:r*2,h:r*2},{minW:24,minH:24,color:options.color,lineWidth:options.lineWidth}); }
  addArc(center,radius,startDeg,endDeg,options={}) { pushHistory(this.state); const r=Math.max(12,radius); const obj={ id:uid('arc'),kind:'shape',shape:'circleArc',x:center.x-r,y:center.y-r,w:r*2,h:r*2,rotation:0,color:options.color||this.state.color,lineWidth:options.lineWidth||this.state.lineWidth,startDeg,endDeg }; this.objects.push(obj); this.state.selection=obj.id; this.changed(); return obj; }

  selected(){return this.objects.find(o=>o.id===this.state.selection)||null;}
  select(id){const obj=this.objects.find(o=>o.id===id);this.state.selection=obj?.locked?null:(id||null);this.render();}
  deleteSelected(){const id=this.state.selection;if(!id)return;const i=this.objects.findIndex(o=>o.id===id);if(i<0||this.objects[i].locked)return;pushHistory(this.state);this.objects.splice(i,1);this.state.selection=null;this.changed();}
  updateSelected(patch){const obj=this.selected();if(!obj||obj.locked)return;pushHistory(this.state);Object.assign(obj,patch);this.changed();}

  render(){this.layer.innerHTML='';for(const obj of this.objects)this.layer.appendChild(this.createElement(obj));}
  createElement(obj){
    const el=document.createElement('div');
    el.className=`scene-object${obj.kind==='graph'?' graph-object':''}${obj.kind==='text'?' text-object':''}${obj.kind==='image'?' image-object':''}${obj.locked?' locked-object':''}${obj.id===this.state.selection?' selected':''}`;
    el.dataset.id=obj.id; Object.assign(el.style,{left:`${obj.x}px`,top:`${obj.y}px`,width:`${obj.w}px`,height:`${obj.h}px`,color:obj.color||'#245d55',transform:`rotate(${obj.rotation||0}deg)`});
    if(obj.locked) el.style.pointerEvents='none';
    el.innerHTML=obj.kind==='shape'?shapeSvg(obj):obj.kind==='graph'?graphSvg(obj):obj.kind==='text'?textMarkup(obj):obj.kind==='image'?imageMarkup(obj):'';
    if(obj.id===this.state.selection&&!obj.locked) el.insertAdjacentHTML('beforeend','<span class="object-handle resize-handle" data-handle="resize" title="Змінити розмір"></span><span class="object-handle rotate-handle" data-handle="rotate" title="Повернути">↻</span><button class="object-delete" type="button" title="Видалити">×</button>');
    if(!obj.locked){
      el.addEventListener('pointerdown',e=>this.pointerDownObject(e,obj));
      el.addEventListener('dblclick',e=>{if(obj.kind!=='text')return;e.stopPropagation();const next=prompt('Редагувати текст:',obj.text);if(next!==null)this.updateSelected({text:next});});
    }
    el.querySelector('.object-delete')?.addEventListener('pointerdown',e=>e.stopPropagation());
    el.querySelector('.object-delete')?.addEventListener('click',e=>{e.stopPropagation();this.deleteSelected();});
    return el;
  }
  pointerDownObject(e,obj){if(this.state.tool!=='select'||obj.locked)return;e.preventDefault();e.stopPropagation();this.select(obj.id);const handle=e.target.closest('[data-handle]')?.dataset.handle;pushHistory(this.state);this.drag={mode:handle||'move',id:obj.id,startX:e.clientX,startY:e.clientY,x:obj.x,y:obj.y,w:obj.w,h:obj.h,rotation:obj.rotation||0,center:{x:obj.x+obj.w/2,y:obj.y+obj.h/2}};}
  bindGlobalPointerEvents(){window.addEventListener('pointermove',e=>this.pointerMove(e));window.addEventListener('pointerup',()=>this.pointerUp());}
  pointerMove(e){if(!this.drag)return;const obj=this.objects.find(o=>o.id===this.drag.id);if(!obj||obj.locked)return;const scale=this.state.zoom||1,dx=(e.clientX-this.drag.startX)/scale,dy=(e.clientY-this.drag.startY)/scale;if(this.drag.mode==='move'){obj.x=clamp(this.drag.x+dx,-obj.w+20,1580);obj.y=clamp(this.drag.y+dy,-obj.h+20,880);}else if(this.drag.mode==='resize'){const minW=obj.kind==='graph'?320:obj.kind==='text'?120:obj.kind==='image'?80:40;const minH=obj.kind==='graph'?240:obj.kind==='text'?50:obj.kind==='image'?60:20;obj.w=Math.max(minW,this.drag.w+dx);obj.h=Math.max(minH,this.drag.h+dy);if(obj.kind==='text')obj.fontSize=clamp(Math.round(32*obj.h/100),14,96);}else if(this.drag.mode==='rotate'){const rect=this.layer.getBoundingClientRect(),cx=rect.left+this.drag.center.x*scale,cy=rect.top+this.drag.center.y*scale;obj.rotation=Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI+90;}this.render();}
  pointerUp(){if(!this.drag)return;this.drag=null;this.changed();}
  changed(){this.render();this.onChange?.();}
}
