import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const errors = [];

function fail(message) { errors.push(message); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

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
    'duplicatePageBtn','clearPageBtn','fullscreenBtn',
    'pages','addPageBtn','autosaveState','sidePanel','mobilePanelBtn','closeSidePanelBtn','panelScrim',
    'textValue','symbolButtons','addTextBtn','updateTextBtn',
    'graphExpression','graphXMin','graphXMax','graphYMin','graphYMax','graphStep','addGraphBtn','updateGraphBtn'
  ];
  for (const id of requiredIds) {
    const re = new RegExp(`id=["']${id}["']`);
    if (!re.test(html)) fail(`preview.html: відсутній #${id}`);
  }
  if (!/type=["']module["'][^>]+src=["']src\/app\.js["']/.test(html) && !/src=["']src\/app\.js["'][^>]+type=["']module["']/.test(html)) {
    fail('preview.html: src/app.js має бути підключений як ES module.');
  }
  if (!/src=["']src\/core\/export-bind\.js["']/.test(html)) fail('preview.html: не підключено PNG export binder.');
  if (!/src=["']src\/tools\/laser\.js["']/.test(html)) fail('preview.html: не підключено laser module.');
  if (!/src=["']src\/ui\/mobile-drawer\.js["']/.test(html)) fail('preview.html: не підключено touch-safe mobile drawer module.');
  if (/\b(?:v2|v3|fixes-v\d+)\.js\b/.test(html)) fail('preview.html не повинен підключати legacy patch-файли.');
}

const shapes=exists('src/objects/shapes.js')?read('src/objects/shapes.js'):'';
if(!/curtain\s*:\s*['"]Шторка['"]/.test(shapes)) fail('У shape registry відсутня редагована Шторка.');

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
