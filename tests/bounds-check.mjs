import process from 'node:process';
import { createState } from '../src/core/state.js';
import { normalizeStoredState } from '../src/core/storage.js';
import {
  MAX_PAGES,MAX_STROKES_PER_PAGE,MAX_POINTS_PER_STROKE,
  MAX_OBJECTS_PER_PAGE,MAX_INSTRUMENTS_PER_PAGE,MAX_IMAGE_DATA_URL_LENGTH
} from '../src/core/content-limits.js';
import { resizeObjectDimensions } from '../src/objects/object-manager.js';

const errors=[];
const fail=message=>errors.push(message);
const fallback=createState();

const normalized=normalizeStoredState({
  tool:'select',zoom:1,activePage:0,pages:[{
    id:'p',name:'Bounds',background:'clean',
    strokes:[{id:'s',tool:'pen',width:4,points:[{x:1e12,y:-1e12}]}],
    objects:[
      {id:'rect',kind:'shape',shape:'rect',x:1e12,y:-1e12,w:1e12,h:1e12,rotation:-450,lineWidth:4},
      {id:'circle',kind:'shape',shape:'circle',x:0,y:0,w:1e12,h:50,rotation:725,lineWidth:4}
    ],
    instruments:[
      {id:'r',type:'ruler',x:1e12,y:-1e12,w:1e12,h:1e12,rotation:-810},
      {id:'p',type:'protractor',x:0,y:0,w:1e12,h:1e12,angle:999},
      {id:'c',type:'compass',x:0,y:0,w:1e12,h:1e12,radius:1e12}
    ]
  }]
},fallback);

if(!normalized)fail('Bounds fixture was rejected instead of sanitized.');
else{
  const page=normalized.pages[0];
  const rect=page.objects.find(item=>item.id==='rect');
  if(!rect||rect.x!==3200||rect.y!==-1800||rect.w!==3200||rect.h!==1800||rect.rotation!==270){
    fail(`Oversized object was not clamped safely: ${JSON.stringify(rect)}`);
  }
  const circle=page.objects.find(item=>item.id==='circle');
  if(!circle||circle.w!==1800||circle.h!==1800||circle.rotation!==5)fail(`Circle bounds/rotation recovery failed: ${JSON.stringify(circle)}`);
  const stroke=page.strokes[0];
  if(!stroke||stroke.points[0]?.x!==3200||stroke.points[0]?.y!==-1800)fail('Stroke point bounds were not clamped.');
  const ruler=page.instruments.find(item=>item.id==='r');
  if(!ruler||ruler.x!==3200||ruler.y!==-1800||ruler.w!==1600||ruler.h!==240||ruler.rotation!==270)fail(`Ruler bounds recovery failed: ${JSON.stringify(ruler)}`);
  const protractor=page.instruments.find(item=>item.id==='p');
  if(!protractor||protractor.w!==1600||protractor.h!==900||protractor.angle!==180)fail(`Protractor bounds recovery failed: ${JSON.stringify(protractor)}`);
  const compass=page.instruments.find(item=>item.id==='c');
  if(!compass||compass.w!==1600||compass.h!==900||compass.radius!==405)fail(`Compass bounds recovery failed: ${JSON.stringify(compass)}`);
}

const hugeGraph=resizeObjectDimensions({kind:'graph',startW:760,startH:560,dx:1e9,dy:1e9,rotation:0});
if(hugeGraph.w!==3200||hugeGraph.h!==1800)fail(`Runtime graph resize escaped safe bounds: ${hugeGraph.w}×${hugeGraph.h}.`);
const hugeCircle=resizeObjectDimensions({kind:'shape',shape:'circle',startW:160,startH:160,dx:1e9,dy:1e9,rotation:0});
if(hugeCircle.w!==1800||hugeCircle.h!==1800)fail(`Runtime circle resize escaped safe bounds: ${hugeCircle.w}×${hugeCircle.h}.`);
const hugeSegment=resizeObjectDimensions({kind:'shape',shape:'segment',startW:180,startH:20,dx:1e9,dy:0,rotation:0});
if(hugeSegment.w!==3200||hugeSegment.h!==20)fail(`Runtime segment resize escaped safe length bounds: ${hugeSegment.w}×${hugeSegment.h}.`);

const points=Array.from({length:MAX_POINTS_PER_STROKE+50},(_,i)=>({x:i,y:i}));
const strokes=Array.from({length:MAX_STROKES_PER_PAGE+20},(_,i)=>({id:`s${i}`,tool:'pen',width:4,points:i===0?points:[{x:i,y:i}]}));
const objects=Array.from({length:MAX_OBJECTS_PER_PAGE+20},(_,i)=>({id:`o${i}`,kind:'shape',shape:'rect',x:0,y:0,w:80,h:60,lineWidth:4}));
const oversizedRaster=`data:image/png;base64,${'A'.repeat(MAX_IMAGE_DATA_URL_LENGTH)}`;
objects[0]={id:'too-big-image',kind:'image',src:oversizedRaster};
objects[1]={id:'large-legacy-raster',kind:'image',src:oversizedRaster,legacyRaster:true,locked:true,w:1600,h:900};
const instruments=Array.from({length:MAX_INSTRUMENTS_PER_PAGE+20},(_,i)=>({id:`r${i}`,type:'ruler'}));
const pages=Array.from({length:MAX_PAGES+20},(_,i)=>({id:`p${i}`,name:`P${i}`,strokes:i===0?strokes:[],objects:i===0?objects:[],instruments:i===0?instruments:[]}));
const capped=normalizeStoredState({tool:'select',zoom:1,activePage:999,pages},fallback);
if(!capped)fail('Collection-cap fixture was rejected instead of sanitized.');
else{
  if(capped.pages.length!==MAX_PAGES)fail(`Page cap failed: ${capped.pages.length}/${MAX_PAGES}.`);
  if(capped.activePage!==MAX_PAGES-1)fail(`activePage did not clamp after page cap: ${capped.activePage}.`);
  const page=capped.pages[0];
  if(page.strokes.length!==MAX_STROKES_PER_PAGE)fail(`Stroke cap failed: ${page.strokes.length}/${MAX_STROKES_PER_PAGE}.`);
  if(page.strokes[0]?.points.length!==MAX_POINTS_PER_STROKE)fail(`Stroke-point cap failed: ${page.strokes[0]?.points.length}/${MAX_POINTS_PER_STROKE}.`);
  if(page.objects.length!==MAX_OBJECTS_PER_PAGE-1)fail(`Object cap/image rejection failed: ${page.objects.length}.`);
  if(page.objects.some(item=>item.id==='too-big-image'))fail('Oversized new image DataURL must be rejected before render.');
  const legacy=page.objects.find(item=>item.id==='large-legacy-raster');
  if(!legacy||!legacy.locked||!legacy.legacyRaster)fail('Oversized legacy raster must be preserved so migration can rely on transactional storage rollback.');
  if(page.instruments.length!==MAX_INSTRUMENTS_PER_PAGE)fail(`Instrument cap failed: ${page.instruments.length}/${MAX_INSTRUMENTS_PER_PAGE}.`);
}

if(errors.length){
  console.error(`TeacherBoard bounds check: FAIL (${errors.length})`);
  errors.forEach(error=>console.error(`- ${error}`));
  process.exit(1);
}
console.log('TeacherBoard bounds check: OK (dimensions, structural caps and legacy raster preservation)');
