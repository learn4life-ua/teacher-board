import fs from 'node:fs';
import process from 'node:process';

const code=fs.readFileSync('src/core/export-png.js','utf8');
const errors=[];
const fail=message=>errors.push(message);

if(!code.includes('const WIDTH=1600, HEIGHT=900')) fail('PNG export must stay fixed at 1600×900 logical scene size.');
const background=code.indexOf('drawBackground(ctx,scene.dataset.background');
const canvas=code.indexOf('ctx.drawImage(canvas,0,0,WIDTH,HEIGHT)');
const objects=code.indexOf('await drawObjects(ctx,objectLayer)');
const instruments=code.indexOf('await drawInstruments(ctx,instrumentLayer)');
if([background,canvas,objects,instruments].some(i=>i<0)||!(background<canvas&&canvas<objects&&objects<instruments)){
  fail('PNG layer order must be background → drawing canvas → objects → instruments.');
}
if(!code.includes("if(bg==='coords')")) fail('PNG export must have a coordinate-background renderer.');
if(!code.includes('ctx.moveTo(WIDTH/2,0);ctx.lineTo(WIDTH/2,HEIGHT)')) fail('Coordinate PNG background must include the central vertical axis.');
if(!code.includes('ctx.moveTo(0,HEIGHT/2);ctx.lineTo(WIDTH,HEIGHT/2)')) fail('Coordinate PNG background must include the central horizontal axis.');
if(!code.includes("ctx.strokeStyle='#76998e';ctx.lineWidth=2")) fail('Coordinate PNG axes must stay visually distinct from the grid.');
if(!code.includes("objectLayer.querySelectorAll('.scene-object')")) fail('PNG export must render all scene objects.');
if(!code.includes("instrumentLayer.querySelectorAll('.geometry-tool')")) fail('PNG export must render visible geometry tools.');
if(!code.includes("el.classList.contains('text-object')")) fail('PNG export must have a dedicated text renderer.');
if(!code.includes("el.classList.contains('image-object')")) fail('PNG export must have a dedicated image renderer.');
if(!code.includes("el.querySelector(':scope > svg, svg')")) fail('PNG export must render SVG-backed shapes/graphs/instruments.');
if(/querySelector(All)?\([^)]*(object-delete|object-edit|object-handle|geometry-close|geometry-action|geometry-rotate|geometry-resize)/.test(code)){
  fail('PNG export must not explicitly collect UI controls/handles.');
}
if(!code.includes("out.toBlob(resolve,'image/png')")) fail('PNG exporter must encode as image/png.');
if(!code.includes('URL.revokeObjectURL')) fail('PNG exporter must revoke temporary object URLs.');

if(errors.length){
  console.error(`TeacherBoard export contract: FAIL (${errors.length})`);
  for(const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('TeacherBoard export contract: OK (1600×900, coordinate axes, correct layer order, content-only renderers)');
