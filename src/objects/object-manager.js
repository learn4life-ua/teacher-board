import { activePage, uid } from '../core/state.js';
import { pushHistory } from '../core/history.js';
import { sceneDeltaFromClient, sceneDeltaToLocalAxes } from '../core/scene.js';
import { MAX_TEXT_LENGTH, MAX_GRAPH_EXPRESSION_LENGTH, MAX_OBJECTS_PER_PAGE, limitText } from '../core/content-limits.js';
import { shapeSvg } from './shapes.js';
import { graphSvg, createGraphObject } from '../math/graph.js';
import { textMarkup } from './text.js';
import { createImageObject, imageMarkup } from './images.js';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const MAX_OBJECT_W = 3200;
const MAX_OBJECT_H = 1800;

function aspectBox({width,height,ratio,minW,minH,maxW=MAX_OBJECT_W,maxH=MAX_OBJECT_H,preferWidth=true}){
  let w=Math.max(minW,Number(width)||minW),h=Math.max(minH,Number(height)||minH);
  const r=Math.max(.05,Number(ratio)||1);
  if(preferWidth){
    w=Math.max(minW,w);h=w/r;
    if(h<minH){h=minH;w=h*r;}
  }else{
    h=Math.max(minH,h);w=h*r;
    if(w<minW){w=minW;h=w/r;}
  }
  if(w>maxW){w=maxW;h=w/r;}
  if(h>maxH){h=maxH;w=h*r;}
  return {w,h};
}

export function resizeObjectDimensions({kind,shape,startW,startH,dx,dy,rotation=0,aspect=startW/Math.max(1,startH)}){
  const local=sceneDeltaToLocalAxes(dx,dy,rotation),rdx=local.x,rdy=local.y;
  const directed=kind==='shape'&&['segment','arrow'].includes(shape);
  const roundShape=kind==='shape'&&['circle','circleArc'].includes(shape);
  const minW=kind==='graph'?320:kind==='text'?120:kind==='image'?80:directed?8:40;
  const minH=kind==='graph'?240:kind==='text'?50:kind==='image'?60:directed?20:roundShape?40:20;
  if(directed)return {w:clamp(startW+rdx,minW,MAX_OBJECT_W),h:clamp(startH,minH,120),local};
  let w=clamp(startW+rdx,minW,MAX_OBJECT_W),h=clamp(startH+rdy,minH,MAX_OBJECT_H);
  if(kind==='image'||roundShape){
    const ratio=roundShape?1:Math.max(.05,Number(aspect)||1);
    const constrained=aspectBox({width:w,height:h,ratio,minW,minH,maxW:roundShape?MAX_OBJECT_H:MAX_OBJECT_W,maxH:MAX_OBJECT_H,preferWidth:Math.abs(rdx)>=Math.abs(rdy)});
    w=constrained.w;h=constrained.h;
  }
  return {w,h,local};
}

export class ObjectManager {
  constructor({ state, layer, onChange }) { this.state=state; this.layer=layer; this.onChange=onChange; this.drag=null; this.bindGlobalPointerEvents(); }
  get objects() { return activePage(this.state).objects; }

  notifyCapacity(){try{window.dispatchEvent(new CustomEvent('teacherboard:capacity-limit',{detail:{kind:'objects',limit:MAX_OBJECTS_PER_PAGE}}));}catch{}}
  hasCapacity(count=1){if(this.objects.length+count<=MAX_OBJECTS_PER_PAGE)return true;this.notifyCapacity();return false;}
  rejected(kind='shape',reason='capacity'){return {id:null,kind,rejected:true,reason};}

  createShape(shape, box, options={}) { return { id:uid('shape'), kind:'shape', shape, x:box.x, y:box.y, w:clamp(box.w,options.minW??40,MAX_OBJECT_W), h:clamp(box.h,options.minH??40,MAX_OBJECT_H), rotation:options.rotation??0, color:options.color||this.state.color, lineWidth:options.lineWidth||this.state.lineWidth }; }
  addShape(shape, box, options={}) { if(!this.hasCapacity())return this.rejected('shape');pushHistory(this.state); const obj=this.createShape(shape,box,options); this.objects.push(obj); this.state.selection=obj.id; this.changed(); return obj; }
  addGraph(expression='x', options={}) { if(!this.hasCapacity())return this.rejected('graph');pushHistory(this.state); const obj=createGraphObject(this.state,limitText(expression,MAX_GRAPH_EXPRESSION_LENGTH,'x')); Object.assign(obj,options); obj.expression=limitText(obj.expression,MAX_GRAPH_EXPRESSION_LENGTH,'x').trim()||'x'; this.objects.push(obj); this.state.selection=obj.id; this.changed(); return obj; }
  addText(text, options={}) { if(!this.hasCapacity())return this.rejected('text');pushHistory(this.state); const obj={ id:uid('text'), kind:'text', text:limitText(text,MAX_TEXT_LENGTH,'Текст'), x:options.x??360,y:options.y??180,w:options.w??420,h:options.h??100,rotation:0,color:options.color||this.state.color,fontSize:options.fontSize||32 }; this.objects.push(obj); this.state.selection=obj.id; this.changed(); return obj; }
  addImage(src, naturalWidth=800, naturalHeight=600) {
    if(!this.hasCapacity())return this.rejected('image');
    const undoBefore=[...this.state.history.undo],redoBefore=[...this.state.history.redo];
    pushHistory(this.state);
    const obj=createImageObject(src,naturalWidth,naturalHeight);
    this.objects.push(obj);this.state.selection=obj.id;
    const saved=this.changed();
    if(saved===false){
      this.rollbackAdded(obj.id,{discardHistory:false,render:false});
      this.state.history.undo.splice(0,this.state.history.undo.length,...undoBefore);
      this.state.history.redo.splice(0,this.state.history.redo.length,...redoBefore);
      this.changed();
      try{window.dispatchEvent(new CustomEvent('teacherboard:image-storage-failed'));}catch{}
      return this.rejected('image','storage');
    }
    return obj;
  }
  addSegment(a,b,options={}) { return this.addSegments([{a,b}],options)[0]||this.rejected('shape'); }
  addSegments(segments,options={}) { if(!segments.length)return[];if(!this.hasCapacity(segments.length))return[]; pushHistory(this.state); const created=segments.map(({a,b})=>{ const dx=b.x-a.x,dy=b.y-a.y,length=clamp(Math.hypot(dx,dy),8,MAX_OBJECT_W),angle=Math.atan2(dy,dx)*180/Math.PI; const obj=this.createShape('segment',{x:(a.x+b.x)/2-length/2,y:(a.y+b.y)/2-10,w:length,h:20},{minW:8,minH:20,rotation:angle,color:options.color,lineWidth:options.lineWidth}); this.objects.push(obj); return obj; }); this.state.selection=created.at(-1)?.id||null; this.changed(); return created; }
  addCircle(center,radius,options={}) { const r=clamp(radius,12,MAX_OBJECT_H/2); return this.addShape('circle',{x:center.x-r,y:center.y-r,w:r*2,h:r*2},{minW:24,minH:24,color:options.color,lineWidth:options.lineWidth}); }
  addArc(center,radius,startDeg,endDeg,options={}) { if(!this.hasCapacity())return this.rejected('shape');pushHistory(this.state); const r=clamp(radius,12,MAX_OBJECT_H/2); const obj={ id:uid('arc'),kind:'shape',shape:'circleArc',x:center.x-r,y:center.y-r,w:r*2,h:r*2,rotation:Number(options.rotation)||0,color:options.color||this.state.color,lineWidth:options.lineWidth||this.state.lineWidth,startDeg,endDeg }; this.objects.push(obj); this.state.selection=obj.id; this.changed(); return obj; }

  rollbackAdded(id,{discardHistory=true,render=true}={}){
    if(!id)return false;
    const index=this.objects.findIndex(item=>item.id===id);
    if(index<0)return false;
    this.objects.splice(index,1);
    if(this.state.selection===id)this.state.selection=null;
    if(discardHistory&&this.state.history.undo.length)this.state.history.undo.pop();
    if(render)this.render();
    return true;
  }
  selected(){return this.objects.find(o=>o.id===this.state.selection)||null;}
  select(id){const obj=this.objects.find(o=>o.id===id);this.state.selection=obj?.locked?null:(id||null);this.render();}
  deleteSelected(){const id=this.state.selection;if(!id)return;const i=this.objects.findIndex(o=>o.id===id);if(i<0||this.objects[i].locked)return;pushHistory(this.state);this.objects.splice(i,1);this.state.selection=null;this.changed();}
  updateSelected(patch){
    const obj=this.selected();if(!obj||obj.locked)return false;
    const next={...(patch||{})};
    if(obj.kind==='text'&&Object.hasOwn(next,'text'))next.text=limitText(next.text,MAX_TEXT_LENGTH,'');
    if(obj.kind==='graph'&&Object.hasOwn(next,'expression'))next.expression=limitText(next.expression,MAX_GRAPH_EXPRESSION_LENGTH,'x').trim()||'x';
    const entries=Object.entries(next);if(!entries.some(([key,value])=>obj[key]!==value))return false;
    pushHistory(this.state);Object.assign(obj,next);this.changed();return true;
  }
  requestEdit(obj){if(!obj||!['text','graph'].includes(obj.kind))return;this.select(obj.id);this.layer.dispatchEvent(new CustomEvent('objectedit',{detail:{id:obj.id,kind:obj.kind}}));}

  render(){this.layer.innerHTML='';for(const obj of this.objects)this.layer.appendChild(this.createElement(obj));}
  createElement(obj){
    const el=document.createElement('div');
    el.className=`scene-object${obj.kind==='graph'?' graph-object':''}${obj.kind==='text'?' text-object':''}${obj.kind==='image'?' image-object':''}${obj.locked?' locked-object':''}${obj.id===this.state.selection?' selected':''}`;
    el.dataset.id=obj.id; Object.assign(el.style,{left:`${obj.x}px`,top:`${obj.y}px`,width:`${obj.w}px`,height:`${obj.h}px`,color:obj.color||'#245d55',transform:`rotate(${obj.rotation||0}deg)`});
    if(obj.locked) el.style.pointerEvents='none';
    el.innerHTML=obj.kind==='shape'?shapeSvg(obj):obj.kind==='graph'?graphSvg(obj):obj.kind==='text'?textMarkup(obj):obj.kind==='image'?imageMarkup(obj):'';
    if(obj.id===this.state.selection&&!obj.locked){
      const edit=['text','graph'].includes(obj.kind)?'<button class="object-edit" type="button" title="Редагувати">✎</button>':'';
      el.insertAdjacentHTML('beforeend',`${edit}<span class="object-handle resize-handle" data-handle="resize" title="Змінити розмір"></span><span class="object-handle rotate-handle" data-handle="rotate" title="Повернути">↻</span><button class="object-delete" type="button" title="Видалити">×</button>`);
    }
    if(!obj.locked){
      el.addEventListener('pointerdown',e=>this.pointerDownObject(e,obj));
      el.addEventListener('dblclick',e=>{if(!['text','graph'].includes(obj.kind))return;e.preventDefault();e.stopPropagation();this.requestEdit(obj);});
    }
    el.querySelector('.object-edit')?.addEventListener('pointerdown',e=>e.stopPropagation());
    el.querySelector('.object-edit')?.addEventListener('click',e=>{e.stopPropagation();this.requestEdit(obj);});
    el.querySelector('.object-delete')?.addEventListener('pointerdown',e=>e.stopPropagation());
    el.querySelector('.object-delete')?.addEventListener('click',e=>{e.stopPropagation();this.deleteSelected();});
    return el;
  }
  updateElementGeometry(obj){
    const el=[...this.layer.children].find(node=>node.dataset?.id===obj.id);
    if(!el){this.render();return;}
    Object.assign(el.style,{left:`${obj.x}px`,top:`${obj.y}px`,width:`${obj.w}px`,height:`${obj.h}px`,transform:`rotate(${obj.rotation||0}deg)`});
    if(obj.kind==='text'){
      const content=el.querySelector('.text-object-content');
      if(content)content.style.fontSize=`${obj.fontSize||32}px`;
    }
  }
  pointerDownObject(e,obj){if(this.state.tool!=='select'||obj.locked||this.drag)return;e.preventDefault();e.stopPropagation();this.select(obj.id);const handle=e.target.closest('[data-handle]')?.dataset.handle;this.drag={mode:handle||'move',id:obj.id,pointerId:e.pointerId??null,startX:e.clientX,startY:e.clientY,x:obj.x,y:obj.y,w:obj.w,h:obj.h,aspect:obj.w/Math.max(1,obj.h),rotation:obj.rotation||0,center:{x:obj.x+obj.w/2,y:obj.y+obj.h/2},historyPushed:false};}
  bindGlobalPointerEvents(){window.addEventListener('pointermove',e=>this.pointerMove(e));window.addEventListener('pointerup',e=>this.pointerUp(e));window.addEventListener('pointercancel',e=>this.pointerUp(e));window.addEventListener('blur',()=>this.pointerUp());}
  matchesPointer(e){return !this.drag||this.drag.pointerId===null||e?.pointerId===undefined||e.pointerId===this.drag.pointerId;}
  ensureDragHistory(screenDx,screenDy){if(!this.drag)return false;if(this.drag.historyPushed)return true;if(Math.abs(screenDx)<.5&&Math.abs(screenDy)<.5)return false;pushHistory(this.state);this.drag.historyPushed=true;return true;}
  pointerMove(e){
    if(!this.drag||!this.matchesPointer(e))return;
    const obj=this.objects.find(o=>o.id===this.drag.id);if(!obj||obj.locked)return;
    const screenDx=e.clientX-this.drag.startX,screenDy=e.clientY-this.drag.startY;
    if(!this.ensureDragHistory(screenDx,screenDy))return;
    const scale=this.state.zoom||1;
    const delta=sceneDeltaFromClient(screenDx,screenDy,scale),dx=delta.x,dy=delta.y;
    if(this.drag.mode==='move'){
      obj.x=clamp(this.drag.x+dx,-obj.w+20,1580);obj.y=clamp(this.drag.y+dy,-obj.h+20,880);
    }else if(this.drag.mode==='resize'){
      const resized=resizeObjectDimensions({kind:obj.kind,shape:obj.shape,startW:this.drag.w,startH:this.drag.h,dx,dy,rotation:this.drag.rotation,aspect:this.drag.aspect});
      obj.w=resized.w;obj.h=resized.h;
      if(obj.kind==='text')obj.fontSize=clamp(Math.round(32*obj.h/100),14,96);
    }else if(this.drag.mode==='rotate'){
      const rect=this.layer.getBoundingClientRect(),cx=rect.left+this.drag.center.x*scale,cy=rect.top+this.drag.center.y*scale;obj.rotation=Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI+90;
    }
    this.updateElementGeometry(obj);
  }
  pointerUp(e){if(!this.drag||!this.matchesPointer(e))return;const changed=this.drag.historyPushed;this.drag=null;if(changed)this.changed();}
  changed(){if(this.onChange)return this.onChange();this.render();return undefined;}
}
