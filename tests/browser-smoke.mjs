import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const baseURL = 'http://127.0.0.1:4173/index.html';

async function waitForAppReady(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('#boardCanvas').waitFor({ state: 'attached', timeout: 10000 });
  await page.locator('.toolbar').waitFor({ state: 'attached', timeout: 10000 });
}

async function waitForAutosave(page) {
  await page.waitForFunction(() => document.getElementById('autosaveState')?.textContent === 'Збережено', null, { timeout: 7000 });
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

async function openCleanPage(browser, viewport) {
  const context = await browser.newContext({ viewport });
  await context.route('https://cdnjs.cloudflare.com/**', route => route.abort());
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForAppReady(page);
  return { context, page, consoleErrors, pageErrors };
}

async function desktopScenario(browser) {
  const env = await openCleanPage(browser, { width: 1440, height: 1000 });
  const { page, context, consoleErrors, pageErrors } = env;

  assert.equal(await page.title(), 'TeacherBoard — Дошка для занять');
  await page.locator('#undoBtn').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#undoBtn').getAttribute('aria-label'), 'Скасувати останню дію');

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

  await page.locator('[data-tool="text"]').click();
  await page.mouse.click(box.x + 320, box.y + 220);
  await page.locator('#textDialog').waitFor({ state: 'visible' });
  await page.locator('#textInput').fill('Тестовий текст');
  await page.locator('#textConfirmBtn').click();
  await page.locator('.tb-object-text').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.tb-object-text').count(), 1);

  await page.locator('.tb-shape-launcher').click();
  await page.locator('.tb-shape-menu [data-shape="rect"]').click();
  await page.mouse.move(box.x + 420, box.y + 240);
  await page.mouse.down();
  await page.mouse.move(box.x + 560, box.y + 340, { steps: 4 });
  await page.mouse.up();
  await page.locator('.tb-object-shape').waitFor({ state: 'visible' });

  await page.locator('#undoBtn').click();
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.tb-object-shape').count(), 0, 'Undo should remove last object action');
  await page.locator('#redoBtn').click();
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.tb-object-shape').count(), 1, 'Redo should restore last object action');

  const pagesBefore = await page.locator('.page-tab').count();
  await page.locator('#addPageBtn').click();
  await waitForAppReady(page);
  assert.equal(await page.locator('.page-tab').count(), pagesBefore + 1, 'Add page should create one page');

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
