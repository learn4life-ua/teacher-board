import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEACHERBOARD_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));

try {
  console.log('stage: setup-pages');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => globalThis.TeacherBoardStore && globalThis.TeacherBoardCoreRuntime);
  await page.evaluate(async () => {
    TeacherBoardStore.setHeights([900, 900, 900]);
    TeacherBoardStore.setDocument({
      activePage: 1,
      pages: [
        { name: 'Перша', background: 'clean', height: 900, image: null, objects: [{ id:'p1', kind:'text', x:100, y:100, w:300, h:80, text:'ONE', color:'#111', fontSize:28 }] },
        { name: 'Друга', background: 'grid', height: 900, image: null, objects: [{ id:'p2', kind:'text', x:220, y:180, w:300, h:80, text:'TWO', color:'#222', fontSize:28 }] },
        { name: 'Третя', background: 'lines', height: 900, image: null, objects: [{ id:'p3', kind:'text', x:340, y:260, w:300, h:80, text:'THREE', color:'#333', fontSize:28 }] }
      ]
    });
    await TeacherBoardStore.flush();
    TeacherBoardCoreRuntime.renderPages();
    TeacherBoardCoreRuntime.loadPage(1);
    window.dispatchEvent(new CustomEvent('teacherboard:page-changed',{detail:{index:1}}));
  });
  await page.waitForTimeout(200);
  assert.equal(await page.locator('.page-tab').count(), 3, 'Three page tabs should render');

  console.log('stage: rename');
  page.once('dialog', async dialog => {
    assert.equal(dialog.type(), 'prompt');
    await dialog.accept('Алгебра');
  });
  await page.locator('.page-tab').nth(1).locator('.page-menu-btn').click();
  await page.locator('.page-context-v1 [data-act="rename"]').click();
  await page.waitForTimeout(100);
  let data = await page.evaluate(() => JSON.parse(localStorage.getItem('teacherboard.v1')));
  assert.equal(data.pages[1].name, 'Алгебра', 'Rename should update page name');
  assert.equal(data.pages[1].objects[0].id, 'p2', 'Rename must preserve page objects');

  console.log('stage: extend-height');
  const beforeObject = structuredClone(data.pages[1].objects[0]);
  await page.locator('.extend-page').click();
  await page.waitForTimeout(150);
  data = await page.evaluate(() => JSON.parse(localStorage.getItem('teacherboard.v1')));
  const heights = await page.evaluate(() => JSON.parse(localStorage.getItem('teacherboard.pageHeights.v1')));
  assert.equal(data.pages[1].height, 1400, 'Extend should add 500px to active page');
  assert.equal(heights[1], 1400, 'Height cache should match extended page');
  assert.equal(await page.evaluate(() => boardCanvas.height), 1400, 'Canvas height should track extended page');
  assert.deepEqual(data.pages[1].objects[0], beforeObject, 'Extending page should preserve object coordinates and content');

  console.log('stage: delete-middle');
  page.once('dialog', async dialog => {
    assert.equal(dialog.type(), 'confirm');
    await dialog.accept();
  });
  await page.locator('.page-tab').nth(1).locator('.page-menu-btn').click();
  await page.locator('.page-context-v1 [data-act="delete"]').click();
  await page.waitForTimeout(150);
  data = await page.evaluate(() => JSON.parse(localStorage.getItem('teacherboard.v1')));
  assert.equal(data.pages.length, 2, 'Deleting middle page should reduce page count');
  assert.deepEqual(data.pages.map(p => p.objects[0]?.id), ['p1','p3'], 'Deleting a page must not shift wrong object data into neighbors');
  assert.equal(data.activePage, 1, 'After deleting active middle page, next page should become active');
  assert.equal(await page.locator('.tb-object-text-content').textContent(), 'THREE', 'Visible object layer should belong to the new active page');

  console.log('stage: last-page-protection');
  page.once('dialog', async dialog => dialog.accept());
  await page.locator('.page-tab').nth(0).locator('.page-menu-btn').click();
  await page.locator('.page-context-v1 [data-act="delete"]').click();
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.page-tab').count(), 1, 'Deleting one of two pages should leave one page');

  let alertSeen = false;
  page.once('dialog', async dialog => {
    alertSeen = dialog.type() === 'alert';
    await dialog.accept();
  });
  await page.locator('.page-tab').nth(0).locator('.page-menu-btn').click();
  await page.locator('.page-context-v1 [data-act="delete"]').click();
  await page.waitForTimeout(100);
  assert.equal(alertSeen, true, 'Deleting last page should show protection alert');
  assert.equal(await page.locator('.page-tab').count(), 1, 'Last page must remain');

  assert.deepEqual(errors, [], `No page errors expected: ${errors.join('\n')}`);
  console.log('TeacherBoard page lifecycle regression: PASS');
} finally {
  await context.close();
  await browser.close();
}
