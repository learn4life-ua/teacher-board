import fs from 'node:fs';
import process from 'node:process';
import { normalizeZoom, scenePointFromClient, sceneDeltaFromClient, MIN_ZOOM, MAX_ZOOM } from '../src/core/scene.js';

const errors=[];
const fail=message=>errors.push(message);
const near=(a,b,eps=1e-9)=>Number.isFinite(a)&&Math.abs(a-b)<=eps;

for(const value of [.5,.75,1,1.25,1.5,1.75,2]){
  if(!near(normalizeZoom(value),value)) fail(`Zoom ${value} was normalized incorrectly.`);
}
if(normalizeZoom(.1)!==MIN_ZOOM) fail('Zoom must clamp to MIN_ZOOM.');
if(normalizeZoom(3)!==MAX_ZOOM) fail('Zoom must clamp to MAX_ZOOM.');
if(normalizeZoom(Number.NaN)!==1) fail('Invalid zoom must fall back to 100%.');

const logical={x:640,y:360};
for(const zoom of [.5,.75,1,1.25,1.5,1.75,2]){
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

const app=fs.readFileSync('src/app.js','utf8');
if(!/setZoom\(state\.zoom\+\.25\)/.test(app)||!/setZoom\(state\.zoom-\.25\)/.test(app)){
  fail('Toolbar zoom buttons must step by 25%.');
}
const objects=fs.readFileSync('src/objects/object-manager.js','utf8');
const geometry=fs.readFileSync('src/instruments/geometry-tools.js','utf8');
if(!objects.includes('sceneDeltaFromClient')) fail('Object drag must use the shared scene delta helper.');
if(!geometry.includes('sceneDeltaFromClient')) fail('Geometry drag must use the shared scene delta helper.');

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
console.log('TeacherBoard zoom check: OK (50–200%, shared logical scene)');
