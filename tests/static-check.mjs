import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { graphSvg, evaluateExpression } from '../src/math/graph.js';

const root = process.cwd();
const errors = [];

function fail(message) { errors.push(message); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function near(actual, expected, eps=1e-9) { return Number.isFinite(actual) && Math.abs(actual-expected) <= eps; }

function walk(dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap(entry => {
    const rel = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(rel) : [rel];
  });
}

const jsFiles = walk('src').filter(file => file.endsWith('.js'));
if (!jsFiles.length) fail('У src/ не знайдено JavaScript-модулів.');

const importPattern = /(?:import\s+(?:[^'\"]+?\s+from\s+)?|export\s+[^'\"]+?\s+from\s+)["']([^"']+)["']/g;
for (const file of jsFiles) {
  const source = read(file);
  for (const match of source.matchAll(importPattern)) {
    const spec = match[1];
    if (!spec.startsWith('.')) continue;
    const target = path.normalize(path.join(path.dirname(file), spec));
    const candidates = [target, `${target}.js`, path.join(target, 'index.js')];
    if (!candidates.some(exists)) fail(`${file}: не знайдено import ${spec}`);
  }
}

if (!exists('preview.html')) fail('Відсутній preview.html.');
else {
  const html = read('preview.html');
  const requiredIds = [
    'scene','boardViewport','drawingCanvas','objectLayer','instrumentLayer','laserDot',
    'shapeMenu','shapeBtn','textBtn','imageBtn','imageInput','laserBtn',
    'undoBtn','redoBtn','deleteBtn','zoomInBtn','zoomOutBtn','zoomLabel','savePngBtn',
    'duplicatePageBtn','renamePageBtn','deletePageBtn','clearPageBtn','fullscreenBtn',
    'pages','addPageBtn','autosaveState','sidePanel','mobilePanelBtn','closeSidePanelBtn','panelScrim',
    'textValue','symbolButtons','addTextBtn','updateTextBtn',
    'graphExpression','graphXMin','graphXMax','graphYMin','graphYMax','graphStep','addGraphBtn','updateGraphBtn'
  ];
  for (const id of requiredIds) {
    const re = new RegExp(`id=["']${id}["']`);
    if (!re.test(html)) fail(`preview.html: відсутній #${id}`);
  }
  if (!/type=["']module["'][^>]+src=["']src\/app\.js["']/.test(html) && !/src=["']src\/app\.js["'][^>]+type=["']module["']/.test(html)) fail('preview.html: src/app.js має бути підключений як ES module.');
  if (!/href=["']css\/touch\.css["']/.test(html)) fail('preview.html: не підключено touch-safe stylesheet.');
  if (!/src=["']src\/core\/export-bind\.js["']/.test(html)) fail('preview.html: не підключено PNG export binder.');
  if (!/src=["']src\/tools\/laser\.js["']/.test(html)) fail('preview.html: не підключено laser module.');
  if (!/src=["']src\/ui\/mobile-drawer\.js["']/.test(html)) fail('preview.html: не підключено touch-safe mobile drawer module.');
  if (/\b(?:v2|v3|fixes-v\d+)\.js\b/.test(html)) fail('preview.html не повинен підключати legacy patch-файли.');
}

const app=exists('src/app.js')?read('src/app.js'):'';
if(!/renamePageBtn/.test(app)||!/deletePageBtn/.test(app)) fail('Page management controls не підключені в src/app.js.');
if(!/clipboardData/.test(app)||!/\.items/.test(app)||!/getAsFile/.test(app)) fail('Paste зображень має підтримувати clipboardData.items/getAsFile, а не лише files.');

const shapes=exists('src/objects/shapes.js')?read('src/objects/shapes.js'):'';
if(!/curtain\s*:\s*['"]Шторка['"]/.test(shapes)) fail('У shape registry відсутня редагована Шторка.');

const drawing=exists('src/drawing/freehand.js')?read('src/drawing/freehand.js'):'';
if(!/destination-out/.test(drawing)) fail('Гумка має стирати drawing canvas через destination-out, а не малювати білим.');
if(/strokeStyle\s*=\s*[^;]*#ffffff/.test(drawing)) fail('Гумка не повинна використовувати білий strokeStyle — це ламає grid/coords backgrounds.');

const objectManager=exists('src/objects/object-manager.js')?read('src/objects/object-manager.js'):'';
if(!/pointercancel/.test(objectManager)||!/blur/.test(objectManager)) fail('Object drag має завершуватись на pointercancel і blur.');

const touch=exists('css/touch.css')?read('css/touch.css'):'';
if(!/touch-action\s*:\s*none/.test(touch)) fail('Touch stylesheet має блокувати browser pan/zoom на редагованих об’єктах.');

const laser=exists('src/tools/laser.js')?read('src/tools/laser.js'):'';
if(!/pointerdown/.test(laser)||!/pointermove/.test(laser)||!/pointerup/.test(laser)) fail('Laser module має обробляти pointerdown/pointermove/pointerup.');
if(!/laser-active/.test(laser)||!/laserDot/.test(laser)) fail('Laser module не має повного activation/overlay контракту.');
if(/setPointerCapture/.test(laser)) fail('Laser module не повинен залежати від setPointerCapture — це нестабільно на touch/browser smoke.');

const graphSource=exists('src/math/graph.js')?read('src/math/graph.js'):'';
if(/\bnew\s+Function\b|\beval\s*\(/.test(graphSource)) fail('Graph parser не повинен виконувати формули через Function/eval.');
const parserCases = [
  ['x^2', 3, 9],
  ['-x^2', 3, -9],
  ['2^-2', 0, .25],
  ['2x-3', 4, 5],
  ['3(x+1)', 2, 9],
  ['πx', 2, Math.PI*2],
  ['sin(pi/2)', 0, 1],
  ['sqrt(9)+abs(-2)', 0, 5],
  ['1,5x', 2, 3],
  ['2×x+6÷3', 4, 10]
];
for(const [expression,x,expected] of parserCases){
  try {
    const actual=evaluateExpression(expression,x);
    if(!near(actual,expected,1e-8)) fail(`Graph parser: ${expression} при x=${x} дав ${actual}, очікувалось ${expected}`);
  } catch(error) { fail(`Graph parser відхилив дозволений вираз ${expression}: ${error.message}`); }
}
for(const expression of ['alert(1)','x;1','constructor(1)','sin x','x..2']){
  try { evaluateExpression(expression,1); fail(`Graph parser мав відхилити: ${expression}`); } catch {}
}

const graphBase={x:0,y:0,w:760,h:560,color:'#245d55',xMin:-10,xMax:10,yMin:-10,yMax:10,majorStep:1};
for(const expression of ['x^2','2x-3','sin(x)','sqrt(x)','abs(x)','πx']){
  const svg=graphSvg({...graphBase,expression});
  if(svg.includes('graph-error')) fail(`Графік не приймає дозволений вираз: ${expression}`);
  if(!/class="graph-curve"[^>]+d="[^"]+"/.test(svg)) fail(`Графік не побудував криву для: ${expression}`);
}
const rejected=graphSvg({...graphBase,expression:'alert(1)'});
if(!rejected.includes('graph-error')) fail('Graph parser має відхиляти сторонні JavaScript-ідентифікатори.');

const requiredModules = [
  'src/app.js','src/core/state.js','src/core/storage.js','src/core/history.js','src/core/scene.js',
  'src/core/export-png.js','src/core/export-bind.js','src/tools/laser.js','src/ui/mobile-drawer.js',
  'src/drawing/freehand.js','src/objects/object-manager.js','src/objects/shapes.js','src/objects/text.js',
  'src/objects/images.js','src/math/graph.js','src/instruments/geometry-tools.js'
];
for (const file of requiredModules) if (!exists(file)) fail(`Відсутній критичний модуль: ${file}`);

if (errors.length) {
  console.error(`TeacherBoard static check: FAIL (${errors.length})`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`TeacherBoard static check: OK (${jsFiles.length} JS modules checked)`);