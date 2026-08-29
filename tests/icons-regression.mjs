import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEACHERBOARD_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless: true });

try {
  console.log('stage: desktop-icons');
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await desktop.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => globalThis.TeacherBoardIcons && document.querySelector('#undoBtn > svg.tb-icon'));

  const iconOnlyIds = ['undoBtn','redoBtn','zoomOutBtn','zoomInBtn','fullscreenBtn','mathToggleBtn','fitBoardBtn','addPageBtn'];
  for (const id of iconOnlyIds) {
    assert.equal(await page.locator(`#${id} > svg.tb-icon`).count(), 1, `${id} should use the SVG icon system`);
  }

  for (const id of ['insertBtn','duplicatePageBtn','savePngBtn','clearBtn','presentationBtn','saveLessonPdfBtn']) {
    assert.equal(await page.locator(`#${id} > svg.tb-icon`).count(), 1, `${id} should have a leading SVG icon`);
  }

  const toolbarMissing = await page.locator('.toolbar .tool[data-tool]:not(:has(.tb-icon))').count();
  assert.equal(toolbarMissing, 0, 'All toolbar tools should use SVG icons');
  assert.equal(await page.locator('.tb-select-tool .tb-icon').count(), 1, 'Select should use SVG icon');
  assert.equal(await page.locator('.tb-shape-launcher .tb-icon').count(), 1, 'Shapes launcher should use SVG icon');

  await page.locator('.tb-shape-launcher').click();
  const shapeButtons = page.locator('.tb-shape-menu [data-shape]');
  const shapeCount = await shapeButtons.count();
  assert.ok(shapeCount >= 15, 'Shape menu should expose all expected choices');
  assert.equal(await page.locator('.tb-shape-menu [data-shape]:not(:has(svg.tb-icon))').count(), 0, 'Shape choices should use SVG previews');
  assert.equal((await page.locator('.tb-shape-menu [data-shape="rect"]').textContent()).trim(), 'Прямокутник');
  await page.keyboard.press('Escape');

  const educationalSymbols = await page.locator('#symbolButtons button').allTextContents();
  assert.ok(educationalSymbols.includes('√') && educationalSymbols.includes('π') && educationalSymbols.includes('∫'), 'Math symbols remain educational text content');
  assert.equal(await page.locator('#symbolButtons svg.tb-icon').count(), 0, 'Math content buttons must not be converted into UI icons');

  const pageMenuButton = page.locator('.page-menu-btn').first();
  assert.equal(await pageMenuButton.locator('svg.tb-icon').count(), 1, 'Page action trigger should use SVG more icon');
  await pageMenuButton.click();
  assert.equal(await page.locator('.page-context-v1 [data-act]:not(:has(svg.tb-icon))').count(), 0, 'Page context actions should use SVG icons');

  assert.deepEqual(errors, [], `No desktop page errors expected: ${errors.join('\n')}`);
  await desktop.close();

  console.log('stage: mobile-icons');
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const phone = await mobile.newPage();
  const phoneErrors = [];
  phone.on('pageerror', error => phoneErrors.push(String(error)));
  await phone.goto(BASE_URL, { waitUntil: 'networkidle' });
  await phone.waitForFunction(() => document.querySelector('.tb-mobile-more > svg.tb-icon'));

  assert.equal(await phone.locator('.tb-mobile-more > svg.tb-icon').count(), 1, 'Mobile overflow trigger should use SVG icon');
  await phone.locator('.tb-mobile-more').click();
  assert.equal(await phone.locator('#tbMobileMenu [role="menuitem"]:not(:has(svg.tb-icon))').count(), 0, 'Mobile overflow actions should use SVG icons');
  assert.equal((await phone.locator('#tbMobileMenu [data-act="color"]').textContent()).trim(), 'Колір і товщина');
  assert.equal((await phone.locator('#tbMobileMenu [data-act="clear"]').textContent()).trim(), 'Очистити сторінку');

  assert.deepEqual(phoneErrors, [], `No mobile page errors expected: ${phoneErrors.join('\n')}`);
  await mobile.close();
  console.log('TeacherBoard SVG icon regression: PASS');
} finally {
  await browser.close();
}
