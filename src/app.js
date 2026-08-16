import { createState, activePage, createBlankPage } from './core/state.js';
import { loadState, saveState } from './core/storage.js';
import { undo, redo, resetHistory, pushHistory } from './core/history.js';
import { Scene } from './core/scene.js';
import { ObjectManager } from './objects/object-manager.js';
import { SHAPE_LABELS } from './objects/shapes.js';
import { FreehandDrawing } from './drawing/freehand.js';
import { GeometryTools } from './instruments/geometry-tools.js';
import { fileToDataUrl, readImageSize } from './objects/images.js';
import { confirmDialog } from './ui/dialogs.js';
import { showNotice } from './ui/notices.js';

let state=loadState(createState());
state.tool='select';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const sceneEl=$('#scene'),viewport=$('#boardViewport'),canvas=$('#drawingCanvas'),objectLayer=$('#objectLayer'),instrumentLayer=$('#instrumentLayer'),zoomLabel=$('#zoomLabel'),pagesEl=$('#pages'),shapeMenu=$('#shapeMenu'),autosaveState=$('#autosaveState');
const scene=new Scene({viewport,scene:sceneEl,zoomLabel,state});
const objectManager=new ObjectManager({state,layer:objectLayer,onChange:commit});
const drawing=new FreehandDrawing({state,canvas,scene,onChange:commit});
const geometryTools=new GeometryTools({state,layer:instrumentLayer,objectManager,onChange:commit});
const MIN_SHAPE_GESTURE=8;
let shapeGesture=null,renamePageIndex=null;

function setAutosaveStatus(ok){autosaveState.textContent=ok?'Збережено':'Не збережено — сховище заповнене';autosaveState.dataset.status=ok?'ok':'error';}
function persistState(){const ok=saveState(state);setAutosaveStatus(ok);return ok;}
function commit(){autosaveState.textContent='Збереження…';const ok=saveState(state);setAutosaveStatus(ok);renderAll();return ok;}
function setTool(tool){state.tool=tool;if(tool!=='select')state.selection=null;$$('.tool').forEach(b=>b.classList.remove('active'));$$('.tool[data-tool]').find(b=>b.dataset.tool===tool)?.classList.add('active');sceneEl.dataset.tool=tool;objectManager.render();shapeMenu.hidden=true;}
function renderAll(){scene.applyZoom();sceneEl.dataset.background=activePage(state).background||'clean';drawing.render();objectManager.render();geometryTools.render();renderPages();syncGraphPanel();syncTextPanel();$$('.background-btn').forEach(b=>b.classList.toggle('selected',b.dataset.bg===activePage(state).background));}
function renderPages(){pagesEl.innerHTML='';state.pages.forEach((page,i)=>{const b=document.createElement('button');b.className=`page-tab${i===state.activePage?' active':''}`;b.textContent=`${i+1}. ${page.name}`;b.addEventListener('click',()=>{if(i===state.activePage)return;state.activePage=i;state.selection=null;resetHistory(state);commit();});b.addEventListener('dblclick',()=>renamePage(i));pagesEl.appendChild(b);});$('#deletePageBtn').disabled=state.pages.length<=1;}
function addPage(){state.pages.push(createBlankPage(`Сторінка ${state.pages.length+1}`));state.activePage=state.pages.length-1;state.selection=null;resetHistory(state);commit();}
function renamePage(index){const page=state.pages[index],dialog=$('#renamePageDialog'),input=$('#renamePageInput');if(!page||!dialog||!input)return;renamePageIndex=index;input.value=page.name||`Сторінка ${index+1}`;if(typeof dialog.showModal==='function'&&!dialog.open)dialog.showModal();else dialog.setAttribute('open','');requestAnimationFrame(()=>{input.focus();input.select();});}
function renameCurrentPage(){renamePage(state.activePage);}
function bindPageRename(){const dialog=$('#renamePageDialog'),form=$('#renamePageForm'),input=$('#renamePageInput');if(!dialog||!form||!input)return;form.addEventListener('submit',e=>{e.preventDefault();const index=renamePageIndex,page=state.pages[index],next=input.value.trim();if(page&&next){page.name=next.slice(0,80);dialog.close?.('save');commit();}else input.focus();});$('#renamePageCancelBtn')?.addEventListener('click',()=>dialog.close?.('cancel'));dialog.addEventListener('close',()=>{renamePageIndex=null;});}
async function deletePage(){if(state.pages.length<=1)return;const page=activePage(state);const ok=await confirmDialog($('#confirmActionDialog'),{title:'Видалити сторінку?',message:`Сторінку «${page.name}» буде видалено разом з усім її вмістом.`,confirmText:'Видалити',danger:true});if(!ok)return;state.pages.splice(state.activePage,1);state.activePage=Math.min(state.activePage,state.pages.length-1);state.selection=null;resetHistory(state);commit();}
function duplicatePage(){const source=activePage(state);const clone=structuredClone(source);clone.id=createBlankPage().id;clone.name=`${source.name||`Сторінка ${state.activePage+1}`} — копія`;state.pages.splice(state.activePage+1,0,clone);state.activePage+=1;state.selection=null;resetHistory(state);commit();}
async function clearPage(){const page=activePage(state);const hasContent=page.strokes.length||page.objects.length||page.instruments.length;if(!hasContent)return;const ok=await confirmDialog($('#confirmActionDialog'),{title:'Очистити сторінку?',message:'Усі штрихи, об’єкти та геометричні інструменти на поточній сторінці буде прибрано. Дію можна скасувати через Undo.',confirmText:'Очистити',danger:true});if(!ok)return;pushHistory(state);page.strokes=[];page.objects=[];page.instruments=[];state.selection=null;commit();}
async function toggleFullscreen(){try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen?.();else await document.exitFullscreen?.();}catch(err){console.warn('Fullscreen unavailable',err);showNotice('Повноекранний режим недоступний у цьому браузері.',{type:'error'});}}

function buildShapeMenu(){shapeMenu.innerHTML=Object.entries(SHAPE_LABELS).map(([key,label])=>`<button type="button" data-shape="${key}">${label}</button>`).join('');shapeMenu.addEventListener('click',e=>{const b=e.target.closest('[data-shape]');if(!b)return;state.tool=`shape:${b.dataset.shape}`;$$('.tool').forEach(x=>x.classList.remove('active'));$('#shapeBtn').classList.add('active');sceneEl.dataset.tool='shape';shapeMenu.hidden=true;});}
function cancelShapeGesture(e){if(!shapeGesture)return;if(e?.pointerId!==undefined&&shapeGesture.pointerId!==null&&e.pointerId!==shapeGesture.pointerId)return;shapeGesture=null;$('#shapePreview').hidden=true;}
function validShapeGesture(type,dx,dy){return type==='line'||type==='arrow'?Math.hypot(dx,dy)>=MIN_SHAPE_GESTURE:Math.min(Math.abs(dx),Math.abs(dy))>=MIN_SHAPE_GESTURE;}
function createGestureShape(type,start,end){
  const dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI;
  if(type==='line')return objectManager.addShape('segment',{x:(start.x+end.x)/2-length/2,y:(start.y+end.y)/2-10,w:length,h:20},{minW:8,minH:20,rotation:angle});
  if(type==='arrow')return objectManager.addShape('arrow',{x:(start.x+end.x)/2-length/2,y:(start.y+end.y)/2-10,w:length,h:20},{minW:8,minH:20,rotation:angle});
  if(type==='circle'){
    const side=Math.max(40,Math.min(Math.abs(dx),Math.abs(dy)));
    const x=dx>=0?start.x:start.x-side,y=dy>=0?start.y:start.y-side;
    return objectManager.addShape('circle',{x,y,w:side,h:side});
  }
  const x=Math.min(start.x,end.x),y=Math.min(start.y,end.y),w=Math.abs(dx),h=Math.abs(dy);
  return objectManager.addShape(type,{x,y,w,h});
}
function bindShapeDrawing(){
  sceneEl.addEventListener('pointerdown',e=>{
    if(shapeGesture||!state.tool.startsWith('shape:')||e.target.closest('.scene-object,.geometry-tool'))return;
    e.preventDefault();
    const p=scene.pointFromEvent(e);
    shapeGesture={start:p,end:p,pointerId:e.pointerId??null,type:state.tool.slice(6)};
    updateShapePreview();
  });
  sceneEl.addEventListener('pointermove',e=>{
    if(!shapeGesture)return;
    if(shapeGesture.pointerId!==null&&e.pointerId!==undefined&&e.pointerId!==shapeGesture.pointerId)return;
    shapeGesture.end=scene.pointFromEvent(e);
    updateShapePreview();
  });
  window.addEventListener('pointerup',e=>{
    if(!shapeGesture)return;
    if(shapeGesture.pointerId!==null&&e?.pointerId!==undefined&&e.pointerId!==shapeGesture.pointerId)return;
    const{start,end,type}=shapeGesture,dx=end.x-start.x,dy=end.y-start.y;
    $('#shapePreview').hidden=true;
    shapeGesture=null;
    if(!validShapeGesture(type,dx,dy))return;
    const obj=createGestureShape(type,start,end);
    setTool('select');
    objectManager.select(obj.id);
  });
  window.addEventListener('pointercancel',cancelShapeGesture);
  window.addEventListener('blur',()=>cancelShapeGesture());
}
function updateShapePreview(){
  const p=$('#shapePreview'),{start,end,type}=shapeGesture;
  const dx=end.x-start.x,dy=end.y-start.y,directed=type==='line'||type==='arrow';
  p.hidden=false;
  p.classList.toggle('directed',directed);
  p.classList.toggle('arrow-preview',type==='arrow');
  if(directed){
    p.style.left=`${start.x}px`;p.style.top=`${start.y}px`;p.style.width=`${Math.hypot(dx,dy)}px`;p.style.height='0px';p.style.transform=`rotate(${Math.atan2(dy,dx)*180/Math.PI}deg)`;
  }else{
    p.style.transform='';
    if(type==='circle'){
      const side=Math.min(Math.abs(dx),Math.abs(dy));
      p.style.left=`${dx>=0?start.x:start.x-side}px`;p.style.top=`${dy>=0?start.y:start.y-side}px`;p.style.width=`${side}px`;p.style.height=`${side}px`;
    }else{
      p.style.left=`${Math.min(start.x,end.x)}px`;p.style.top=`${Math.min(start.y,end.y)}px`;p.style.width=`${Math.abs(dx)}px`;p.style.height=`${Math.abs(dy)}px`;
    }
  }
}

function graphValues(){const xMin=Number($('#graphXMin').value),xMax=Number($('#graphXMax').value),yMin=Number($('#graphYMin').value),yMax=Number($('#graphYMax').value),majorStep=Number($('#graphStep').value);if(!(xMin<xMax)||!(yMin<yMax)||!(majorStep>0))return null;return{expression:$('#graphExpression').value.trim()||'x',xMin,xMax,yMin,yMax,majorStep};}
function syncGraphPanel(){const obj=objectManager.selected(),isGraph=obj?.kind==='graph';$('#updateGraphBtn').disabled=!isGraph;if(!isGraph||document.activeElement?.closest?.('.graph-panel'))return;$('#graphExpression').value=obj.expression||'x';$('#graphXMin').value=obj.xMin;$('#graphXMax').value=obj.xMax;$('#graphYMin').value=obj.yMin;$('#graphYMax').value=obj.yMax;$('#graphStep').value=obj.majorStep||1;}
function bindGraphPanel(){$('#addGraphBtn').addEventListener('click',()=>{const values=graphValues();if(!values){showNotice('Перевірте межі осей і крок шкали.',{type:'error'});return;}const graph=objectManager.addGraph(values.expression);Object.assign(graph,values);setTool('select');objectManager.select(graph.id);commit();});$('#updateGraphBtn').addEventListener('click',()=>{const obj=objectManager.selected(),values=graphValues();if(!obj||obj.kind!=='graph')return;if(!values){showNotice('Перевірте межі осей і крок шкали.',{type:'error'});return;}objectManager.updateSelected(values);});}
function syncTextPanel(){const obj=objectManager.selected(),isText=obj?.kind==='text';$('#updateTextBtn').disabled=!isText;if(isText&&!document.activeElement?.closest?.('.text-panel'))$('#textValue').value=obj.text||'';}
function insertAtCursor(textarea,value){const start=textarea.selectionStart??textarea.value.length,end=textarea.selectionEnd??start;textarea.setRangeText(value,start,end,'end');textarea.focus();}
function bindTextPanel(){$('#textBtn').addEventListener('click',()=>{$('#textValue').focus();openSidePanel();});$('#symbolButtons').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;insertAtCursor($('#textValue'),b.textContent||'');});$('#addTextBtn').addEventListener('click',()=>{const value=$('#textValue').value.trim();if(!value)return;const obj=objectManager.addText(value);setTool('select');objectManager.select(obj.id);});$('#updateTextBtn').addEventListener('click',()=>{const obj=objectManager.selected();if(obj?.kind==='text')objectManager.updateSelected({text:$('#textValue').value});});}
function bindObjectEditing(){objectLayer.addEventListener('objectedit',()=>{const obj=objectManager.selected();if(!obj)return;openSidePanel();if(obj.kind==='text'){syncTextPanel();requestAnimationFrame(()=>$('#textValue').focus());}else if(obj.kind==='graph'){syncGraphPanel();requestAnimationFrame(()=>$('#graphExpression').focus());}});}

async function insertImageFile(file){
  if(!file?.type?.startsWith('image/'))return;
  try{
    const src=await fileToDataUrl(file),size=await readImageSize(src),obj=objectManager.addImage(src,size.width,size.height);
    setTool('select');objectManager.select(obj.id);
    if(!saveState(state)){
      const page=activePage(state);page.objects=page.objects.filter(item=>item.id!==obj.id);state.selection=null;
      persistState();renderAll();
      showNotice('Зображення завелике для сховища браузера. Спробуйте менший файл або очистіть непотрібні сторінки.',{type:'error',duration:5200});
    }
  }catch(err){console.error(err);showNotice('Не вдалося вставити зображення.',{type:'error'});}
}
function clipboardImageFile(data){
  const fromFiles=[...(data?.files||[])].find(file=>file.type?.startsWith('image/'));
  if(fromFiles)return fromFiles;
  for(const item of [...(data?.items||[])]){
    if(item.kind==='file'&&item.type?.startsWith('image/')){
      const file=item.getAsFile?.();
      if(file)return file;
    }
  }
  return null;
}
function bindImages(){
  $('#imageBtn').addEventListener('click',()=>$('#imageInput').click());
  $('#imageInput').addEventListener('change',e=>{const file=e.target.files?.[0];if(file)insertImageFile(file);e.target.value='';});
  window.addEventListener('paste',e=>{
    const file=clipboardImageFile(e.clipboardData);
    if(!file)return;
    e.preventDefault();
    insertImageFile(file);
  });
}

function openSidePanel(){document.body.classList.add('side-panel-open');$('#panelScrim').hidden=false;}
function closeSidePanel(){document.body.classList.remove('side-panel-open');$('#panelScrim').hidden=true;}
function bindResponsivePanel(){$('#mobilePanelBtn').addEventListener('click',()=>document.body.classList.contains('side-panel-open')?closeSidePanel():openSidePanel());$('#closeSidePanelBtn').addEventListener('click',closeSidePanel);window.addEventListener('resize',()=>{if(innerWidth>900)closeSidePanel();},{passive:true});}
function isEditableTarget(target){return Boolean(target?.closest?.('input,textarea,select,[contenteditable="true"]'));}

function bindUi(){$$('.tool[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));$$('.instrument-btn').forEach(b=>b.addEventListener('click',()=>{geometryTools.add(b.dataset.instrument);setTool('select');}));$('#shapeBtn').addEventListener('click',e=>{e.stopPropagation();shapeMenu.hidden=!shapeMenu.hidden;});document.addEventListener('click',e=>{if(!e.target.closest('#shapeMenu')&&!e.target.closest('#shapeBtn'))shapeMenu.hidden=true;});$('#colorPicker').addEventListener('change',e=>{state.color=e.target.value;const selected=objectManager.selected();if(selected&&!['image'].includes(selected.kind))objectManager.updateSelected({color:state.color});else persistState();});$('#lineWidth').addEventListener('change',e=>{state.lineWidth=Number(e.target.value);const selected=objectManager.selected();if(selected&&!['graph','text','image'].includes(selected.kind))objectManager.updateSelected({lineWidth:state.lineWidth});else persistState();});$('#zoomInBtn').addEventListener('click',()=>{scene.setZoom(state.zoom+.25);persistState();geometryTools.render();});$('#zoomOutBtn').addEventListener('click',()=>{scene.setZoom(state.zoom-.25);persistState();geometryTools.render();});$('#undoBtn').addEventListener('click',()=>{if(undo(state))commit();});$('#redoBtn').addEventListener('click',()=>{if(redo(state))commit();});$('#duplicatePageBtn').addEventListener('click',duplicatePage);$('#renamePageBtn').addEventListener('click',renameCurrentPage);$('#deletePageBtn').addEventListener('click',deletePage);$('#clearPageBtn').addEventListener('click',clearPage);$('#fullscreenBtn').addEventListener('click',toggleFullscreen);$('#deleteBtn').addEventListener('click',()=>objectManager.deleteSelected());$('#addPageBtn').addEventListener('click',addPage);$$('.background-btn').forEach(b=>b.addEventListener('click',()=>{const page=activePage(state);if(page.background===b.dataset.bg)return;pushHistory(state);page.background=b.dataset.bg;commit();}));sceneEl.addEventListener('pointerdown',e=>{if(state.tool==='select'&&!e.target.closest('.scene-object,.geometry-tool'))objectManager.select(null);});window.addEventListener('keydown',e=>{const editing=isEditableTarget(e.target);if(!editing&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey?redo(state):undo(state))commit();}if(!editing&&(e.key==='Delete'||e.key==='Backspace')&&state.selection){e.preventDefault();objectManager.deleteSelected();}if(e.key==='Escape'){setTool('select');closeSidePanel();}});}

buildShapeMenu();bindShapeDrawing();bindGraphPanel();bindTextPanel();bindObjectEditing();bindImages();bindPageRename();bindResponsivePanel();bindUi();setTool(state.tool);renderAll();