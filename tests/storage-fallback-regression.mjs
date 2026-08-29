import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEACHERBOARD_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

await context.addInitScript(() => {
  try { Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: undefined }); }
  catch { globalThis.indexedDB = undefined; }

  if (!localStorage.getItem('teacherboard.fallback.seeded')) {
    localStorage.setItem('teacherboard.v1', JSON.stringify({
      activePage: 0,
      pages: [{
        name: 'Fallback',
        background: 'grid',
        image: null,
        texts: [{ x: 180, y: 160, text: 'Локальний режим', color: '#245d55', fontSize: 30 }],
        objects: []
      }]
    }));
    localStorage.setItem('teacherboard.pageHeights.v1', JSON.stringify([1100]));
    localStorage.setItem('teacherboard.fallback.seeded', '1');
  }
});

const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));

try {
  console.log('stage: boot-without-indexeddb');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => globalThis.TeacherBoardStore && globalThis.TeacherBoardCoreRuntime && document.querySelector('.tb-object-text-content'));

  const recovered = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('teacherboard.v1'));
    return {
      name: data.pages[0].name,
      background: data.pages[0].background,
      objectKinds: data.pages[0].objects.map(item => item.kind),
      objectText: data.pages[0].objects.find(item => item.kind === 'text')?.text,
      canvasHeight: boardCanvas.height,
      idbAvailable: Boolean(globalThis.indexedDB)
    };
  });
  assert.equal(recovered.idbAvailable, false, 'Test must actually run without IndexedDB');
  assert.equal(recovered.name, 'Fallback', 'Local cache should remain the source when IndexedDB is unavailable');
  assert.equal(recovered.background, 'grid', 'Fallback mode should preserve the legacy page background');
  assert.deepEqual(recovered.objectKinds, ['text'], 'Legacy text should still migrate in fallback mode');
  assert.equal(recovered.objectText, 'Локальний режим');
  assert.equal(recovered.canvasHeight, 1100, 'Legacy page height should remain usable without IndexedDB');

  console.log('stage: local-write-after-idb-failure');
  await page.locator('.toolbar [data-tool="pen"]').click();
  const box = await page.locator('#boardCanvas').boundingBox();
  assert.ok(box);
  await page.mouse.move(box.x + 80, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + 220, box.y + 120, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  const afterWrite = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('teacherboard.v1'));
    return {
      background: data.pages[0].background,
      hasRaster: typeof data.pages[0].image === 'string' && data.pages[0].image.startsWith('data:image/png'),
      objectText: data.pages[0].objects.find(item => item.kind === 'text')?.text
    };
  });
  assert.equal(afterWrite.background, 'grid', 'Raster autosave should preserve the fallback page background');
  assert.equal(afterWrite.hasRaster, true, 'Raster changes should still save to local cache');
  assert.equal(afterWrite.objectText, 'Локальний режим', 'Local write-through failure must not lose editable objects');

  assert.deepEqual(errors, [], `No page errors expected: ${errors.join('\n')}`);
  console.log('TeacherBoard storage fallback regression: PASS');
} finally {
  await context.close();
  await browser.close();
}
