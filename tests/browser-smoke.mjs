import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const baseURL = 'http://127.0.0.1:4173/index.html';

async function waitForAppReady(page) {
  await page.waitForLoadState('domcontentloaded');
  const diagnostic = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    hasCanvas: Boolean(document.getElementById('boardCanvas')),
    hasToolbar: Boolean(document.querySelector('.toolbar')),
    hasObjectLayer: Boolean(document.getElementById('objectLayer')),
    hasSelectTool: Boolean(document.querySelector('.tb-select-tool')),
    bodyStart: document.body?.innerText?.slice(0, 500) || ''
  }));
  if (!diagnostic.hasCanvas || !diagnostic.hasToolbar) throw new Error(`TeacherBoard DOM not ready: ${JSON.stringify(diagnostic)}`);
}

async function waitForAutosave(page) {
  await page.waitForFunction(() => document.getElementById('autosaveState')?.textContent === 'Збережено', null, { timeout: 7000 });
}

async function elementDiagnostics(page, selector) {
  return page.evaluate(selector => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { selector, display: cs.display, visibility: cs.visibility, opacity: cs.opacity, overflow: cs.overflow, position: cs.position, width: r.width, height: r.height, x: r.x, y: r.y, right: r.right, bottom: r.bottom, hidden: el.hidden, disabled: el.disabled ?? null, className: el.className };
  }, selector);
}

async function canvasDiagnostics(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('boardCanvas');
    const board = document.getElementById('board');
    const wrap = document.getElementById('boardWrap');
    const cs = canvas ? getComputedStyle(canvas) : null;
    const bs = board ? getComputedStyle(board) : null;
    const cr = canvas?.getBoundingClientRect();
    const br = board?.getBoundingClientRect();
    const wr = wrap?.getBoundingClientRect();
    return {
      canvas: canvas ? { display: cs.display, visibility: cs.visibility, opacity: cs.opacity, width: cr.width, height: cr.height } : null,
      board: board ? { display: bs.display, visibility: bs.visibility, width: br.width, height: br.height } : null,
      wrap: wrap ? { width: wr.width, height: wr.height } : null,
      bodyClass: document.body.className
    };
  });
}

async function activeObjects(page) {
  return page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('teacherboard.v1') || '{}');
    const index = Number(data.activePage) || 0;
    return data.pages?.[index]?.objects || [];
  });
}

async function openCleanPage(browser, viewport) {
  const context = await browser.newContext({ viewport });
  await context.route('https://cdnjs.cloudflare.com/**', route => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForAppReady(page);
  await page.waitForFunction(() => Boolean(document.querySelector('.tb-select-tool') && document.getElementById('objectLayer')), null, { timeout: 5000 });
  return { context, page, consoleErrors, pageErrors };
}

async function desktopScenario(browser) {
  console.log('stage: desktop-open');
  const env = await openCleanPage(browser, { width: 1440, height: 1000 });
  const { page, context, consoleErrors, pageErrors } = env;

  assert.equal(await page.title(), 'TeacherBoard — Дошка для занять');
  const undoDiag = await elementDiagnostics(page, '#undoBtn');
  const actionsDiag = await elementDiagnostics(page, '.top-actions');
  const topbarDiag = await elementDiagnostics(page, '.topbar');
  assert.ok(undoDiag, 'Undo button must exist');
  assert.ok(undoDiag.width > 0 && undoDiag.height > 0 && undoDiag.display !== 'none' && undoDiag.visibility !== 'hidden', `Undo button layout invalid: ${JSON.stringify({ undoDiag, actionsDiag, topbarDiag })}`);
  assert.equal(await page.locator('#undoBtn').getAttribute('aria-label'), 'Скасувати останню дію');

  console.log('stage: raster');
  const canvas = page.locator('#boardCanvas');
  const box = await canvas.boundingBox();
  const diagnostics = await canvasDiagnostics(page);
  assert.ok(box && box.width > 300 && box.height > 200, `Canvas should have usable dimensions: ${JSON.stringify(diagnostics)}`);

  await page.mouse.move(box.x + 120, box.y + 120);
  await page.mouse.down();
  await page.mouse.move(box.x + 240, box.y + 180, { steps: 8 });
  await page.mouse.up();
  await waitForAutosave(page);
  const rasterSaved = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('teacherboard.v1') || '{}');
    return d.pages?.[d.activePage || 0]?.image || null;
  });
  assert.ok(rasterSaved?.startsWith('data:image/png'), 'Raster drawing should persist as PNG data');

  console.log('stage: text');
  await page.locator('[data-tool="text"]').click();
  await page.waitForTimeout(80);
  await page.mouse.click(box.x + 320, box.y + 220);
  await page.waitForTimeout(120);
  const textState = await page.evaluate(() => ({
    dialogOpen: Boolean(document.getElementById('textDialog')?.open),
    activeTool: document.querySelector('.toolbar .tool.active')?.getAttribute('data-tool') || document.querySelector('.toolbar .tool.active')?.className || null,
    bodyClass: document.body.className,
    hasObjectLayer: Boolean(document.getElementById('objectLayer')),
    hasSelectTool: Boolean(document.querySelector('.tb-select-tool'))
  }));
  if (!textState.dialogOpen) throw new Error(`Text tool did not open dialog: ${JSON.stringify({ textState, pageErrors, consoleErrors })}`);
  await page.locator('#textInput').fill('Тестовий текст');
  await page.locator('#textConfirmBtn').click();
  await page.locator('.tb-object-text').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.tb-object-text').count(), 1);

  console.log('stage: shape-history');
  await page.locator('.tb-shape-launcher').click();
  await page.locator('.tb-shape-menu [data-shape="rect"]').click();
  await page.waitForTimeout(80);
  await page.mouse.move(box.x + 420, box.y + 240);
  await page.mouse.down();
  await page.mouse.move(box.x + 560, box.y + 340, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const shapeState = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('teacherboard.v1') || '{}');
    const pageIndex = Number(data.activePage) || 0;
    return {
      objects: data.pages?.[pageIndex]?.objects || [],
      domShapes: document.querySelectorAll('.tb-object-shape').length,
      preview: Boolean(document.querySelector('.tb-shape-preview')),
      activeClass: document.querySelector('.toolbar .tool.active')?.className || null,
      activeDataTool: document.querySelector('.toolbar .tool.active')?.getAttribute('data-tool') || null,
      bodyClass: document.body.className
    };
  });
  if (!shapeState.objects.some(item => item?.kind === 'shape')) throw new Error(`Shape gesture did not create state object: ${JSON.stringify({ shapeState, pageErrors, consoleErrors })}`);
  assert.ok(shapeState.domShapes >= 1, `Shape state exists but DOM render missing: ${JSON.stringify({ shapeState, pageErrors, consoleErrors })}`);

  await page.locator('#undoBtn').click({ force: true });
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.tb-object-shape').count(), 0, 'Undo should remove last object action');
  await page.locator('#redoBtn').click({ force: true });
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.tb-object-shape').count(), 1, 'Redo should restore last object action');

  console.log('stage: object-manipulation');
  await page.locator('.tb-select-tool').click();
  const shape = page.locator('.tb-object-shape');
  await shape.click();
  const beforeMove = (await activeObjects(page)).find(item => item.kind === 'shape');
  assert.ok(beforeMove, 'Shape state must exist before move');
  const shapeBox = await shape.boundingBox();
  assert.ok(shapeBox, 'Shape must have a bounding box before move');
  await page.mouse.move(shapeBox.x + shapeBox.width / 2, shapeBox.y + shapeBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(shapeBox.x + shapeBox.width / 2 + 70, shapeBox.y + shapeBox.height / 2 + 45, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const afterMove = (await activeObjects(page)).find(item => item.kind === 'shape');
  assert.ok(afterMove && (afterMove.x !== beforeMove.x || afterMove.y !== beforeMove.y), `Move should update shape coordinates: ${JSON.stringify({ beforeMove, afterMove })}`);

  const resizeHandle = page.locator('.tb-object-shape.selected .tb-resize-handle');
  const resizeBox = await resizeHandle.boundingBox();
  assert.ok(resizeBox, 'Selected shape must expose resize handle');
  const beforeResize = { w: afterMove.w, h: afterMove.h };
  await page.mouse.move(resizeBox.x + resizeBox.width / 2, resizeBox.y + resizeBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(resizeBox.x + resizeBox.width / 2 + 55, resizeBox.y + resizeBox.height / 2 + 40, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const afterResize = (await activeObjects(page)).find(item => item.kind === 'shape');
  assert.ok(afterResize && afterResize.w > beforeResize.w && afterResize.h > beforeResize.h, `Resize should increase shape dimensions: ${JSON.stringify({ beforeResize, afterResize })}`);

  await page.locator('.tb-object-shape.selected .tb-delete-handle').click();
  await page.waitForTimeout(120);
  assert.equal((await activeObjects(page)).filter(item => item.kind === 'shape').length, 0, 'Delete handle should remove selected shape');
  await page.locator('#undoBtn').click({ force: true });
  await page.waitForTimeout(180);
  assert.equal((await activeObjects(page)).filter(item => item.kind === 'shape').length, 1, 'Undo should restore deleted shape');

  console.log('stage: pages-storage');
  const pagesBefore = await page.locator('.page-tab').count();
  await page.locator('#addPageBtn').click({ force: true });
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.page-tab').count(), pagesBefore + 1, 'Add page should create one page');

  await page.evaluate(() => globalThis.TeacherBoardStore?.flush?.());
  const persisted = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('teacherboard', 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction('documents', 'readonly');
      const req = tx.objectStore('documents').get('current');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return Boolean(value?.pages?.length);
  });
  assert.ok(persisted, 'IndexedDB should contain durable document state');

  if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
  const relevantConsoleErrors = consoleErrors.filter(x => !x.includes('Failed to load resource'));
  if (relevantConsoleErrors.length) throw new Error(`Console errors: ${relevantConsoleErrors.join(' | ')}`);
  await context.close();
}

async function responsiveScenario(browser, viewport, label) {
  console.log(`stage: ${label}`);
  const { page, context, pageErrors } = await openCleanPage(browser, viewport);
  const boardBox = await page.locator('#board').boundingBox();
  const diagnostics = await canvasDiagnostics(page);
  assert.ok(boardBox && boardBox.width > 250, `${label}: board should remain visible: ${JSON.stringify(diagnostics)}`);
  const visibleTools = await page.locator('.toolbar .tool:visible').count();
  assert.ok(visibleTools >= 3, `${label}: toolbar should expose usable controls`);
  assert.equal(pageErrors.length, 0, `${label}: no page errors expected`);
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await desktopScenario(browser);
  await responsiveScenario(browser, { width: 900, height: 1100 }, 'tablet');
  await responsiveScenario(browser, { width: 390, height: 844 }, 'mobile');
  console.log('TeacherBoard browser smoke: PASS');
} finally {
  await browser.close();
}
