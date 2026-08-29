import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEACHERBOARD_URL || 'http://127.0.0.1:4173/index.html';
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n9sAAAAASUVORK5CYII=';

async function openPage(browser, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options });
  await context.route('https://cdnjs.cloudflare.com/**', route => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(globalThis.TeacherBoardCoreRuntime && document.getElementById('objectLayer') && document.querySelector('.tb-select-tool')));
  return { context, page, errors };
}

async function activeObjects(page) {
  return page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('teacherboard.v1') || '{}');
    return data.pages?.[Number(data.activePage) || 0]?.objects || [];
  });
}

const browser = await chromium.launch({ headless: true });
try {
  console.log('stage: clipboard-curtain-image');
  const { context, page, errors } = await openPage(browser);
  const canvas = page.locator('#boardCanvas');
  const box = await canvas.boundingBox();
  assert.ok(box, 'Canvas must have a bounding box');

  assert.equal(await page.locator('label[for="textInput"]').count(), 1, 'Text dialog must expose an explicit label');

  await page.locator('[data-tool="curtain"]').click();
  await page.mouse.move(box.x + 180, box.y + 150);
  await page.mouse.down();
  await page.mouse.move(box.x + 430, box.y + 300, { steps: 5 });
  await page.mouse.up();
  await page.locator('.tb-object-curtain').waitFor({ state: 'visible' });

  await page.evaluate(base64 => {
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    const file = new File([bytes], 'clipboard.png', { type: 'image/png' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer });
    window.dispatchEvent(event);
  }, PNG_BASE64);
  await page.locator('.tb-object-image').waitFor({ state: 'visible' });
  let objects = await activeObjects(page);
  assert.ok(objects.some(item => item.kind === 'curtain'), 'Curtain object must be stored');
  assert.ok(objects.some(item => item.kind === 'image'), 'Clipboard image must be stored as an editable object');

  console.log('stage: keyboard-object-history');
  const curtain = page.locator('.tb-object-curtain');
  const curtainId = await curtain.getAttribute('data-id');
  assert.ok(curtainId);
  const beforeMove = objects.find(item => item.id === curtainId);
  assert.ok(beforeMove);

  await curtain.focus();
  assert.equal(await curtain.getAttribute('tabindex'), '0', 'Editable objects must be keyboard focusable');
  assert.ok(await curtain.getAttribute('aria-label'), 'Editable objects must have accessible names');
  await curtain.press('ArrowRight');
  await page.waitForTimeout(150);
  objects = await activeObjects(page);
  const afterMove = objects.find(item => item.id === curtainId);
  assert.equal(afterMove.x, beforeMove.x + 8, 'ArrowRight should move the object by the keyboard step');

  await page.locator('#undoBtn').click({ force: true });
  await page.waitForTimeout(180);
  objects = await activeObjects(page);
  assert.equal(objects.find(item => item.id === curtainId)?.x, beforeMove.x, 'Undo must revert keyboard movement');

  const refocusedCurtain = page.locator(`.tb-object[data-id="${curtainId}"]`);
  await refocusedCurtain.focus();
  await refocusedCurtain.press('Shift+ArrowDown');
  await page.waitForTimeout(150);
  objects = await activeObjects(page);
  assert.equal(objects.find(item => item.id === curtainId)?.y, beforeMove.y + 32, 'Shift+ArrowDown should use the large movement step');

  console.log('stage: image-resize-delete');
  await page.locator('.tb-select-tool').click();
  const image = page.locator('.tb-object-image');
  await image.click();
  objects = await activeObjects(page);
  const imageId = await image.getAttribute('data-id');
  const beforeImage = objects.find(item => item.id === imageId);
  assert.ok(beforeImage);
  const handle = image.locator('.tb-resize-handle');
  const handleBox = await handle.boundingBox();
  assert.ok(handleBox, 'Selected image must expose a resize handle');
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2 + 50, handleBox.y + handleBox.height / 2 + 35, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(160);
  objects = await activeObjects(page);
  const resizedImage = objects.find(item => item.id === imageId);
  assert.ok(resizedImage.w > beforeImage.w && resizedImage.h > beforeImage.h, 'Image resize must update stored dimensions');

  const imageAfterResize = page.locator(`.tb-object[data-id="${imageId}"]`);
  await imageAfterResize.focus();
  await imageAfterResize.press('Delete');
  await page.waitForTimeout(140);
  assert.equal((await activeObjects(page)).some(item => item.id === imageId), false, 'Delete key must remove the focused object');
  await page.locator('#undoBtn').click({ force: true });
  await page.waitForTimeout(180);
  assert.equal((await activeObjects(page)).some(item => item.id === imageId), true, 'Undo must restore a keyboard-deleted object');

  assert.deepEqual(errors, [], `No page errors expected: ${errors.join('\n')}`);
  await context.close();

  console.log('stage: reduced-motion');
  const reduced = await openPage(browser, { reducedMotion: 'reduce' });
  const motion = await reduced.page.evaluate(() => {
    const values = [
      getComputedStyle(document.querySelector('.workspace')).transitionDuration,
      getComputedStyle(document.querySelector('.math-panel')).transitionDuration,
      getComputedStyle(document.querySelector('.laser-dot')).transitionDuration
    ];
    const seconds = value => value.split(',').map(part => {
      const text = part.trim();
      return text.endsWith('ms') ? parseFloat(text) / 1000 : parseFloat(text) || 0;
    });
    return values.flatMap(seconds);
  });
  assert.ok(motion.every(value => value <= 0.001), `Reduced motion should suppress transitions: ${motion.join(', ')}`);
  assert.deepEqual(reduced.errors, [], `No reduced-motion page errors expected: ${reduced.errors.join('\n')}`);
  await reduced.context.close();

  console.log('TeacherBoard advanced interaction regression: PASS');
} finally {
  await browser.close();
}
