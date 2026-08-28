import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const baseURL = 'http://127.0.0.1:4173/index.html';
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl3pXcAAAAASUVORK5CYII=', 'base64');

async function waitForRuntime(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => Boolean(
    globalThis.TeacherBoardStore &&
    globalThis.TeacherBoardCoreRuntime &&
    document.querySelector('.tb-select-tool') &&
    document.getElementById('objectLayer')
  ), null, { timeout: 8000 });
}

async function openPage(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('https://cdnjs.cloudflare.com/**', route => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForRuntime(page);
  return { context, page, pageErrors };
}

async function activeObjects(page) {
  return page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('teacherboard.v1') || '{}');
    return data.pages?.[Number(data.activePage) || 0]?.objects || [];
  });
}

const browser = await chromium.launch({ headless: true });

try {
  console.log('stage: editable-content');
  {
    const { context, page, pageErrors } = await openPage(browser);
    const canvasBox = await page.locator('#boardCanvas').boundingBox();
    assert.ok(canvasBox, 'Canvas must be visible');

    // Text create + edit.
    await page.locator('[data-tool="text"]').click();
    await page.mouse.click(canvasBox.x + 260, canvasBox.y + 180);
    await page.locator('#textDialog').waitFor({ state: 'visible' });
    await page.locator('#textInput').fill('Початковий текст');
    await page.locator('#textConfirmBtn').click();
    const textObject = page.locator('.tb-object-text');
    await textObject.waitFor({ state: 'visible' });
    await textObject.dblclick();
    await page.locator('#textDialog').waitFor({ state: 'visible' });
    await page.locator('#textInput').fill('Відредагований текст');
    await page.locator('#textConfirmBtn').click();
    await page.waitForFunction(() => document.querySelector('.tb-object-text-content')?.textContent === 'Відредагований текст');
    assert.equal((await activeObjects(page)).filter(item => item.kind === 'text' && item.text === 'Відредагований текст').length, 1, 'Text edit should persist in runtime state');

    // Curtain create.
    await page.locator('[data-tool="curtain"]').click();
    await page.mouse.move(canvasBox.x + 520, canvasBox.y + 260);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 760, canvasBox.y + 420, { steps: 5 });
    await page.mouse.up();
    await page.locator('.tb-object-curtain').waitFor({ state: 'visible' });
    assert.equal((await activeObjects(page)).filter(item => item.kind === 'curtain').length, 1, 'Curtain should be an editable object');

    // File image insertion through the real hidden input.
    await page.locator('#imageInput').setInputFiles({ name: 'tiny.png', mimeType: 'image/png', buffer: tinyPng });
    await page.locator('.tb-object-image').waitFor({ state: 'visible' });
    const imageState = (await activeObjects(page)).find(item => item.kind === 'image');
    assert.ok(imageState?.src?.startsWith('data:image/png'), 'Inserted image should be stored as local data URL object');

    // Clear must remove raster and all editable objects.
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#clearBtn').click();
    await page.waitForTimeout(150);
    const cleared = await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('teacherboard.v1') || '{}');
      const current = data.pages?.[Number(data.activePage) || 0] || {};
      return { image: current.image ?? null, texts: current.texts || [], objects: current.objects || [] };
    });
    assert.equal(cleared.image, null, 'Clear should remove raster image');
    assert.equal(cleared.texts.length, 0, 'Clear should remove legacy texts');
    assert.equal(cleared.objects.length, 0, 'Clear should remove editable objects');
    assert.equal(await page.locator('.tb-object').count(), 0, 'Clear should empty object layer');

    if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
    await context.close();
  }

  console.log('stage: legacy-migration');
  {
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    await context.route('https://cdnjs.cloudflare.com/**', route => route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.addInitScript(() => {
      localStorage.setItem('teacherboard.v1', JSON.stringify({
        activePage: 0,
        pages: [{
          name: 'Стара сторінка',
          background: 'grid',
          image: null,
          texts: [{ x: 180, y: 140, w: 460, h: 80, text: 'Старий текст', color: '#245d55', fontSize: 30 }],
          objects: []
        }]
      }));
      localStorage.setItem('teacherboard.pageHeights.v1', JSON.stringify([900]));
    });

    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitForRuntime(page);
    await page.evaluate(async () => {
      await globalThis.TeacherBoardStore?.ready;
      await globalThis.TeacherBoardStore?.flush?.();
    });
    await page.waitForTimeout(200);

    assert.equal(await page.locator('.tb-object-text').count(), 1, 'Legacy text should render exactly once as editable object');
    assert.equal(await page.locator('.tb-object-text-content').textContent(), 'Старий текст');

    const cache = await page.evaluate(() => JSON.parse(localStorage.getItem('teacherboard.v1') || '{}'));
    assert.equal(cache.pages?.[0]?.texts?.length || 0, 0, 'Legacy text array should be emptied after migration');
    assert.equal(cache.pages?.[0]?.objects?.filter(item => item.kind === 'text').length, 1, 'Runtime cache should contain one migrated text object');

    const durable = await page.evaluate(async () => {
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
      return value;
    });
    assert.equal(durable.pages?.[0]?.items?.filter(item => item.type === 'text').length, 1, 'IndexedDB should contain one canonical migrated text item');
    assert.equal(durable.pages?.[0]?.items?.[0]?.text, 'Старий текст');

    if (pageErrors.length) throw new Error(`Legacy migration page errors: ${pageErrors.join(' | ')}`);
    await context.close();
  }

  console.log('TeacherBoard content regression: PASS');
} finally {
  await browser.close();
}
