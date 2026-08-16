import fs from 'node:fs';
import process from 'node:process';
import { normalizeZoom, scenePointFromClient, sceneDeltaFromClient, sceneDeltaToLocalAxes, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from '../src/core/scene.js';
import { resizeObjectDimensions } from '../src/objects/object-manager.js';

const errors=[];
const fail=message=>errors.push(message);
const near=(a,b,eps=1e-9)=>Number.isFinite(a)&&Math.abs(a-b)<=eps;

if(ZOOM_STEP!==.25) fail(`Zoom step must be 0.25, got ${ZOOM_STEP}.`);
for(const value of [.25,.5,.75,1,1.25,1.5,1.75,2]){
  if(!near(normalizeZoom(value),value)) fail(`Zoom ${value} was normalized incorrectly.`);
}
if(normalizeZoom(.1)!==MIN_ZOOM) fail('Zoom must clamp to MIN_ZOOM.');
if(normalizeZoom(3)!==MAX_ZOOM) fail('Zoom must clamp to MAX_ZOOM.');
if(normalizeZoom(Number.NaN)!==1) fail('Invalid zoom must fall back to 100%.');
if(normalizeZoom(1.11)!==1) fail('Persisted 111% must snap to 100%.');
if(normalizeZoom(1.14)!==1.25) fail('Persisted 114% must snap to 125%.');

const logical={x:640,y:360};
for(const zoom of [.25,.5,.75,1,1.25,1.5,1.75,2]){
  const rectLeft=137,rectTop=83;
  const clientX=rectLeft+logical.x*zoom;
  const clientY=rectTop+logical.y*zoom;
  const point=scenePointFromClient({clientX,clientY,rectLeft,rectTop,zoom});
  if(!near(point.x,logical.x)||!near(point.y,logical.y)){
    fail(`client→scene coordinates drift at ${Math.round(zoom*100)}%: ${point.x}, ${point.y}`);
  }
  const delta=sceneDeltaFromClient(100*zoom,64*zoom,zoom);
  if(!near(delta.x,100)||!near(delta.y,64)){
    fail(`client delta→scene delta drift at ${Math.round(zoom*100)}%: ${delta.x}, ${delta.y}`);
  }
}

const local90=sceneDeltaToLocalAxes(0,120,90);
if(!near(local90.x,120)||!near(local90.y,0)) fail('90° local-axis resize transform is incorrect.');
const a=Math.PI/4;
const local45=sceneDeltaToLocalAxes(80*Math.cos(a),80*Math.sin(a),45);
if(!near(local45.x,80)||!near(local45.y,0,1e-8)) fail('45° local-axis resize transform is incorrect.');
const cross45=sceneDeltaToLocalAxes(-50*Math.sin(a),50*Math.cos(a),45);
if(!near(cross45.x,0,1e-8)||!near(cross45.y,50,1e-8)) fail('Local perpendicular resize axis is incorrect.');

const imageCases=[
  {rotation:0,dx:120,dy:10},
  {rotation:45,dx:120*Math.cos(a),dy:120*Math.sin(a)},
  {rotation:90,dx:0,dy:120},
  {rotation:45,dx:-90*Math.sin(a),dy:90*Math.cos(a)}
];
for(const test of imageCases){
  const box=resizeObjectDimensions({kind:'image',startW:400,startH:300,aspect:4/3,...test});
  if(!near(box.w/box.h,4/3,1e-8)) fail(`Image aspect ratio drifted after ${test.rotation}° resize: ${box.w}×${box.h}.`);
  if(box.w<80||box.h<60) fail(`Image resize broke minimum dimensions after ${test.rotation}°.`);
}
const tinyImage=resizeObjectDimensions({kind:'image',startW:100,startH:75,aspect:4/3,dx:-1000,dy:-1000,rotation:0});
if(!near(tinyImage.w/tinyImage.h,4/3,1e-8)||tinyImage.w<80||tinyImage.h<60)fail('Image minimum resize must preserve aspect ratio.');

for(const rotation of [0,45,90]){
  const radians=rotation*Math.PI/180;
  const circle=resizeObjectDimensions({kind:'shape',shape:'circle',startW:160,startH:160,dx:100*Math.cos(radians),dy:100*Math.sin(radians),rotation});
  if(!near(circle.w,circle.h,1e-8))fail(`Circle became non-square after ${rotation}° resize: ${circle.w}×${circle.h}.`);
  if(circle.w<40)fail(`Circle resize broke minimum side after ${rotation}°.`);
}
const segment=resizeObjectDimensions({kind:'shape',shape:'segment',startW:180,startH:20,dx:80,dy:70,rotation:0});
if(segment.h!==20||segment.w!==260)fail(`Segment resize must change length only, got ${segment.w}×${segment.h}.`);
const arrow=resizeObjectDimensions({kind:'shape',shape:'arrow',startW:180,startH:20,dx:0,dy:80,rotation:90});
if(arrow.h!==20||!near(arrow.w,260))fail(`Rotated arrow resize must follow its local length axis, got ${arrow.w}×${arrow.h}.`);

const app=fs.readFileSync('src/app.js','utf8');
if(!/setZoom\(state\.zoom\+\.25\)/.test(app)||!/setZoom\(state\.zoom-\.25\)/.test(app)){
  fail('Toolbar zoom buttons must step by 25%.');
}
if(!app.includes('MIN_SHAPE_GESTURE=8'))fail('Shape gesture threshold must remain enabled.');
if(!app.includes('pointerId:e.pointerId??null'))fail('Shape gestures must track pointerId for multi-touch safety.');
if(!app.includes("type==='line'||type==='arrow'"))fail('Directed line/arrow gesture contract is missing.');
if(!app.includes("type==='circle'"))fail('Circle gesture constraint is missing.');
const objects=fs.readFileSync('src/objects/object-manager.js','utf8');
const geometry=fs.readFileSync('src/instruments/geometry-tools.js','utf8');
if(!objects.includes('sceneDeltaFromClient')) fail('Object drag must use the shared scene delta helper.');
if(!geometry.includes('sceneDeltaFromClient')) fail('Geometry drag must use the shared scene delta helper.');
if(!objects.includes('sceneDeltaToLocalAxes')) fail('Rotated object resize must use local axes.');
if(!geometry.includes('sceneDeltaToLocalAxes')) fail('Rotated geometry resize must use local axes.');
if(!objects.includes('resizeObjectDimensions')) fail('Object resize must use the shared deterministic resize helper.');

const css=fs.readFileSync('css/next.css','utf8');
if(!/\.board-viewport\{[^}]*width:calc\(1600px \* var\(--scene-zoom,1\)\)[^}]*height:calc\(900px \* var\(--scene-zoom,1\)\)/.test(css)){
  fail('Viewport dimensions must follow the same --scene-zoom as the scene.');
}
if(!/\.scene\{[^}]*width:1600px[^}]*height:900px/.test(css)){
  fail('Scene must keep one fixed 1600×900 logical coordinate space.');
}
if(!/#drawingCanvas,\.object-layer,\.instrument-layer\{[^}]*position:absolute[^}]*inset:0[^}]*width:1600px[^}]*height:900px/.test(css)){
  fail('Canvas, object and instrument layers must share the 1600×900 scene space.');
}

if(errors.length){
  console.error(`TeacherBoard zoom check: FAIL (${errors.length})`);
  errors.forEach(error=>console.error(`- ${error}`));
  process.exit(1);
}
console.log('TeacherBoard zoom check: OK (zoom presets incl. 25%, shared scene, rotated resize, image/circle/directed-shape geometry)');
