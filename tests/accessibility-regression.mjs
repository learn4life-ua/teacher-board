import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEACHERBOARD_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless: true });

try {
  console.log('stage: desktop-keyboard');
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await desktop.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('.tb-shape-launcher')?.getAttribute('aria-haspopup') === 'menu');

  const launcher = page.locator('.tb-shape-launcher');
  assert.equal(await launcher.getAttribute('aria-expanded'), 'false', 'Shape launcher starts collapsed');
  await launcher.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(50);
  assert.equal(await launcher.getAttribute('aria-expanded'), 'true', 'Shape launcher announces expanded state');

  const focusedRole = await page.evaluate(() => document.activeElement?.getAttribute('role'));
  assert.equal(focusedRole, 'menuitem', 'Opening shape menu should move focus into the menu');
  const firstShape = await page.evaluate(() => document.activeElement?.getAttribute('data-shape'));
  await page.keyboard.press('ArrowDown');
  const secondShape = await page.evaluate(() => document.activeElement?.getAttribute('data-shape'));
  assert.notEqual(secondShape, firstShape, 'ArrowDown should move through shape choices');
  await page.keyboard.press('End');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-shape')), 'xyTable', 'End should focus the last shape choice');
  await page.keyboard.press('Home');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-shape')), 'line', 'Home should focus the first shape choice');
  await page.keyboard.press('Escape');
  assert.equal(await launcher.getAttribute('aria-expanded'), 'false', 'Escape should collapse the shape menu');
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('tb-shape-launcher')), true, 'Escape should return focus to shape launcher');

  const focusStyle = await page.evaluate(() => {
    const button = document.getElementById('zoomInBtn');
    button.focus();
    const style = getComputedStyle(button);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  assert.notEqual(focusStyle.outlineStyle, 'none', 'Keyboard-focusable controls need a visible outline');
  assert.notEqual(focusStyle.outlineWidth, '0px', 'Focus outline must have non-zero width');
  assert.deepEqual(errors, [], `No desktop page errors expected: ${errors.join('\n')}`);
  await desktop.close();

  console.log('stage: mobile-menu');
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const phone = await mobile.newPage();
  const phoneErrors = [];
  phone.on('pageerror', error => phoneErrors.push(String(error)));
  await phone.goto(BASE_URL, { waitUntil: 'networkidle' });
  await phone.waitForFunction(() => document.querySelector('.tb-mobile-more'));

  const more = phone.locator('.tb-mobile-more');
  assert.equal(await more.getAttribute('aria-label'), 'Додаткові дії');
  assert.equal(await more.getAttribute('aria-haspopup'), 'menu');
  assert.equal(await more.getAttribute('aria-expanded'), 'false');
  const moreBox = await more.boundingBox();
  assert.ok(moreBox && moreBox.width >= 44 && moreBox.height >= 44, 'Mobile overflow trigger should meet 44px touch target');

  await more.click();
  assert.equal(await more.getAttribute('aria-expanded'), 'true', 'Mobile overflow announces expanded state');
  const mobileMenu = phone.locator('#tbMobileMenu');
  assert.equal(await mobileMenu.getAttribute('role'), 'menu');
  const menuItems = mobileMenu.locator('[role="menuitem"]');
  assert.equal(await menuItems.count(), 6, 'Mobile overflow exposes each action as a menuitem');
  const firstMenuBox = await menuItems.first().boundingBox();
  assert.ok(firstMenuBox && firstMenuBox.height >= 44, 'Mobile overflow actions should meet 44px target');

  const firstLabel = await phone.evaluate(() => document.activeElement?.textContent?.trim());
  await phone.keyboard.press('ArrowDown');
  const nextLabel = await phone.evaluate(() => document.activeElement?.textContent?.trim());
  assert.notEqual(nextLabel, firstLabel, 'ArrowDown should move focus in mobile overflow');
  await phone.keyboard.press('End');
  assert.match(await phone.evaluate(() => document.activeElement?.textContent || ''), /Очистити сторінку/, 'End should focus final mobile action');
  await phone.keyboard.press('Escape');
  assert.equal(await more.getAttribute('aria-expanded'), 'false', 'Escape should close mobile overflow');
  assert.equal(await phone.evaluate(() => document.activeElement?.classList.contains('tb-mobile-more')), true, 'Escape should restore focus to mobile overflow trigger');

  await more.click();
  await phone.locator('[data-act="color"]').click();
  const colorDialog = phone.locator('.tb-mobile-pen-pop:not([hidden])');
  assert.equal(await colorDialog.getAttribute('role'), 'dialog');
  assert.equal(await colorDialog.getAttribute('aria-label'), 'Колір і товщина лінії');
  const unlabeledColors = await colorDialog.locator('[data-color]:not([aria-label])').count();
  assert.equal(unlabeledColors, 0, 'Mobile color swatches must have accessible names');

  assert.deepEqual(phoneErrors, [], `No mobile page errors expected: ${phoneErrors.join('\n')}`);
  await mobile.close();
  console.log('TeacherBoard accessibility regression: PASS');
} finally {
  await browser.close();
}
