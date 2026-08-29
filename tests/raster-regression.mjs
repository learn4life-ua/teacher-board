import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEACHERBOARD_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(String(error)));

async function canvasBox() {
  const box = await page.locator('#boardCanvas').boundingBox();
  assert.ok(box && box.width > 200 && box.height > 100, 'Canvas must be visible');
  return box;
}

async function boardToClient(x, y) {
  const box = await canvasBox();
  const size = await page.evaluate(() => ({ width: boardCanvas.width, height: boardCanvas.height }));
  return {
    x: box.x + x / size.width * box.width,
    y: box.y + y / size.height * box.height
  };
}

async function dragBoard(x1, y1, x2, y2, steps = 8) {
  const a = await boardToClient(x1, y1);
  const b = await boardToClient(x2, y2);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps });
  await page.mouse.up();
  await page.waitForTimeout(350);
}

async function pixel(x, y) {
  return page.evaluate(({ x, y }) => [...boardCanvas.getContext('2d').getImageData(x, y, 1, 1).data], { x, y });
}

async function nonTransparentPixels(x, y, w, h) {
  return page.evaluate(({ x, y, w, h }) => {
    const data = boardCanvas.getContext('2d').getImageData(x, y, w, h).data;
    let count = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) count++;
    return count;
  }, { x, y, w, h });
}

try {
  console.log('stage: reset');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await new Promise(resolve => {
      const request = indexedDB.deleteDatabase('teacherboard');
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    });
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => globalThis.TeacherBoardCoreRuntime && globalThis.TeacherBoardHistory);

  console.log('stage: marker');
  await page.locator('.toolbar [data-tool="marker"]').click();
  await dragBoard(180, 180, 520, 180);
  const markerPixel = await pixel(350, 180);
  assert.ok(markerPixel[3] > 0, 'Marker should draw visible raster pixels');
  assert.ok(markerPixel[3] < 255 || markerPixel[0] > 0 || markerPixel[1] > 0 || markerPixel[2] > 0, 'Marker should not remain blank');

  console.log('stage: eraser');
  const beforeErase = await nonTransparentPixels(300, 150, 100, 60);
  assert.ok(beforeErase > 0, 'Marker region should contain pixels before erase');
  await page.locator('.toolbar [data-tool="eraser"]').click();
  await dragBoard(350, 145, 350, 215, 5);
  const afterErase = await nonTransparentPixels(330, 150, 40, 60);
  assert.ok(afterErase < beforeErase, 'Eraser should remove raster pixels');

  console.log('stage: arrow');
  await page.locator('.toolbar [data-tool="arrow"]').click();
  await dragBoard(220, 360, 620, 460);
  const arrowPixels = await nonTransparentPixels(210, 340, 430, 140);
  assert.ok(arrowPixels > 100, 'Raster arrow should draw shaft and arrowhead');

  console.log('stage: raster-undo-redo');
  const arrowBeforeUndo = await nonTransparentPixels(210, 340, 430, 140);
  await page.locator('#undoBtn').click();
  await page.waitForTimeout(250);
  const arrowAfterUndo = await nonTransparentPixels(210, 340, 430, 140);
  assert.ok(arrowAfterUndo < arrowBeforeUndo / 2, 'Undo should remove the last raster arrow');
  await page.locator('#redoBtn').click();
  await page.waitForTimeout(250);
  const arrowAfterRedo = await nonTransparentPixels(210, 340, 430, 140);
  assert.ok(arrowAfterRedo > arrowAfterUndo * 2, 'Redo should restore the raster arrow');

  console.log('stage: chronological-interleave');
  await page.locator('.toolbar [data-tool="pen"]').click();
  await dragBoard(180, 650, 480, 650);
  const penPixels = await nonTransparentPixels(170, 630, 330, 40);
  assert.ok(penPixels > 0, 'Pen stroke should exist before object creation');

  await page.locator('.tb-shape-launcher').click();
  await page.locator('.tb-shape-menu [data-shape="rect"]').click();
  await dragBoard(760, 620, 980, 760);
  const objectCount = await page.evaluate(() => JSON.parse(localStorage.getItem('teacherboard.v1')).pages[0].objects.length);
  assert.ok(objectCount >= 1, 'Object should be created after raster stroke');

  await page.locator('#undoBtn').click();
  await page.waitForTimeout(200);
  const afterObjectUndo = await page.evaluate(() => JSON.parse(localStorage.getItem('teacherboard.v1')).pages[0].objects.length);
  assert.equal(afterObjectUndo, objectCount - 1, 'First undo should remove the most recent object action');
  const penAfterObjectUndo = await nonTransparentPixels(170, 630, 330, 40);
  assert.ok(penAfterObjectUndo > 0, 'Undoing object creation should preserve earlier raster stroke');

  await page.locator('#undoBtn').click();
  await page.waitForTimeout(250);
  const penAfterRasterUndo = await nonTransparentPixels(170, 630, 330, 40);
  assert.ok(penAfterRasterUndo < penAfterObjectUndo / 2, 'Second undo should remove the preceding raster stroke');

  await page.locator('#redoBtn').click();
  await page.waitForTimeout(250);
  const penAfterRasterRedo = await nonTransparentPixels(170, 630, 330, 40);
  assert.ok(penAfterRasterRedo > penAfterRasterUndo * 2, 'First redo should restore raster stroke');
  await page.locator('#redoBtn').click();
  await page.waitForTimeout(200);
  const afterObjectRedo = await page.evaluate(() => JSON.parse(localStorage.getItem('teacherboard.v1')).pages[0].objects.length);
  assert.equal(afterObjectRedo, objectCount, 'Second redo should restore object creation');

  assert.deepEqual(pageErrors, [], `No page errors expected: ${pageErrors.join('\n')}`);
  console.log('TeacherBoard raster regression: PASS');
} finally {
  await context.close();
  await browser.close();
}
