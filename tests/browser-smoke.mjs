import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';

const baseURL = process.env.TB_URL || 'http://127.0.0.1:4173/preview.html';

async function runCase(name, contextOptions = {}) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true, ...contextOptions });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#scene');

  assert.equal(await page.locator('#shapeMenu').isHidden(), true, `${name}: shape menu must start closed`);
  await page.click('#shapeBtn');
  assert.equal(await page.locator('#shapeMenu').isVisible(), true, `${name}: shape menu did not open`);
  await page.locator('#shapeMenu [data-shape="rect"]').click();
  assert.equal(await page.locator('#shapeMenu').isHidden(), true, `${name}: shape menu did not close after selection`);

  const scene = page.locator('#scene');
  const box = await scene.boundingBox();
  assert.ok(box, `${name}: no scene box`);
  await page.mouse.move(box.x + 220, box.y + 180);
  await page.mouse.down();
  await page.mouse.move(box.x + 430, box.y + 320);
  await page.mouse.up();
  await page.waitForTimeout(100);
  assert.ok(await page.locator('.scene-object').count() >= 1, `${name}: shape object was not created`);

  await page.fill('#textValue', 'x² + y² = 25');
  await page.click('#addTextBtn');
  assert.ok(await page.locator('.text-object').count() >= 1, `${name}: text object was not created`);

  await page.fill('#graphExpression', 'x^2');
  await page.click('#addGraphBtn');
  assert.ok(await page.locator('.graph-object').count() >= 1, `${name}: graph object was not created`);

  await page.locator('.instrument-btn[data-instrument="ruler"]').click();
  assert.ok(await page.locator('.geometry-tool').count() >= 1, `${name}: ruler was not created`);

  const beforePages = await page.locator('.page-tab').count();
  await page.click('#addPageBtn');
  assert.equal(await page.locator('.page-tab').count(), beforePages + 1, `${name}: page was not added`);
  await page.click('#duplicatePageBtn');
  assert.equal(await page.locator('.page-tab').count(), beforePages + 2, `${name}: page was not duplicated`);

  if (contextOptions.viewport?.width <= 900 || contextOptions.isMobile) {
    await page.click('#mobilePanelBtn');
    assert.equal(await page.locator('#sidePanel').evaluate(() => document.body.classList.contains('side-panel-open')), true, `${name}: mobile panel did not open`);
    await page.click('#closeSidePanelBtn');
  }

  if (name === 'desktop') {
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await page.click('#savePngBtn');
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /\.png$/i, `${name}: PNG download filename is invalid`);
  }

  assert.deepEqual(errors, [], `${name}: browser console/page errors: ${errors.join(' | ')}`);
  await browser.close();
}

await runCase('desktop', { viewport: { width: 1440, height: 1000 } });
await runCase('tablet', { viewport: { width: 820, height: 1180 }, hasTouch: true });
await runCase('android', { ...devices['Pixel 7'] });
console.log('TeacherBoard browser smoke: OK');
