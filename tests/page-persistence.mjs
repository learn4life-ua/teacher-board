import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const baseURL = 'http://127.0.0.1:4173/index.html';

async function waitForRuntime(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => Boolean(
    globalThis.TeacherBoardStore &&
    globalThis.TeacherBoardCoreRuntime &&
    document.querySelector('.tb-select-tool') &&
    document.getElementById('objectLayer')
  ), null, { timeout: 8000 });
}

async function getDocument(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('teacherboard.v1') || 'null'));
}

async function flushStore(page) {
  await page.evaluate(async () => {
    await globalThis.TeacherBoardStore?.flush?.();
  });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.route('https://cdnjs.cloudflare.com/**', route => route.abort());
const page = await context.newPage();
page.setDefaultTimeout(8000);
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

try {
  console.log('stage: page-state-setup');
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForRuntime(page);

  const canvas = page.locator('#boardCanvas');
  const box = await canvas.boundingBox();
  assert.ok(box && box.width > 300 && box.height > 200, 'Canvas must be usable');

  await page.mouse.move(box.x + 110, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 240, box.y + 150, { steps: 6 });
  await page.mouse.up();
  await page.waitForFunction(() => document.getElementById('autosaveState')?.textContent === 'Збережено');

  await page.locator('[data-tool="text"]').click();
  await page.mouse.click(box.x + 330, box.y + 230);
  await page.locator('#textDialog').waitFor({ state: 'visible' });
  await page.locator('#textInput').fill('Сторінка один');
  await page.locator('#textConfirmBtn').click();
  await page.locator('.tb-object-text').waitFor({ state: 'visible' });

  const original = await getDocument(page);
  assert.equal(original.pages.length, 1, 'Initial document should have one page');
  assert.ok(original.pages[0].image?.startsWith('data:image/png'), 'Original page should contain raster state');
  assert.equal(original.pages[0].objects?.filter(item => item.kind === 'text').length, 1, 'Original page should contain text object');

  console.log('stage: duplicate-page');
  await page.locator('#duplicatePageBtn').click({ force: true });
  await page.waitForFunction(() => document.querySelectorAll('.page-tab').length === 2);
  const duplicated = await getDocument(page);
  assert.equal(duplicated.activePage, 1, 'Duplicate should become active page');
  assert.equal(duplicated.pages.length, 2, 'Duplicate should add one page');
  assert.equal(duplicated.pages[1].image, duplicated.pages[0].image, 'Duplicate should preserve raster image');
  assert.deepEqual(duplicated.pages[1].objects, duplicated.pages[0].objects, 'Duplicate should preserve editable objects');
  assert.equal(await page.locator('.tb-object-text').count(), 1, 'Duplicated page should render its text object');

  console.log('stage: switch-pages');
  await page.locator('.page-tab').nth(0).click();
  await page.waitForFunction(() => {
    const data = JSON.parse(localStorage.getItem('teacherboard.v1') || '{}');
    return data.activePage === 0;
  });
  assert.equal(await page.locator('.tb-object-text').count(), 1, 'Original page should restore editable object after switch');

  await page.locator('.page-tab').nth(1).click();
  await page.waitForFunction(() => {
    const data = JSON.parse(localStorage.getItem('teacherboard.v1') || '{}');
    return data.activePage === 1;
  });
  assert.equal(await page.locator('.tb-object-text').count(), 1, 'Duplicate page should restore editable object after switch');

  console.log('stage: indexeddb-durability');
  await flushStore(page);
  const durableBeforeReload = await getDocument(page);
  assert.equal(durableBeforeReload.pages.length, 2);

  // Force a durable-store recovery path instead of relying on the localStorage cache.
  await page.evaluate(() => {
    localStorage.removeItem('teacherboard.v1');
    localStorage.removeItem('teacherboard.pageHeights.v1');
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForRuntime(page);
  await page.evaluate(async () => { await globalThis.TeacherBoardStore?.ready; });
  await page.waitForTimeout(300);

  const recovered = await getDocument(page);
  assert.ok(recovered, 'Document should recover from IndexedDB when local cache is absent');
  assert.equal(recovered.pages.length, 2, `IndexedDB recovery should preserve both pages: ${JSON.stringify(recovered)}`);
  assert.equal(recovered.activePage, 1, 'IndexedDB recovery should preserve active page');
  assert.equal(recovered.pages[1].objects?.filter(item => item.kind === 'text').length, 1, 'Recovered page should preserve editable text object');
  assert.ok(recovered.pages[1].image?.startsWith('data:image/png'), 'Recovered page should preserve raster image');
  assert.equal(await page.locator('.page-tab').count(), 2, 'Recovered UI should render both pages');
  assert.equal(await page.locator('.tb-object-text').count(), 1, 'Recovered active page should render editable object');

  if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
  console.log('TeacherBoard page persistence: PASS');
} finally {
  await context.close();
  await browser.close();
}
