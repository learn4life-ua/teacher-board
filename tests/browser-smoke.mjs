import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';

const baseURL = process.env.TB_URL || 'http://127.0.0.1:4173/preview.html';

async function drawShape(page, shape, from, to) {
  await page.click('#shapeBtn');
  assert.equal(await page.locator('#shapeMenu').isVisible(), true, 'shape menu did not open');
  await page.locator(`#shapeMenu [data-shape="${shape}"]`).click();
  assert.equal(await page.locator('#shapeMenu').isHidden(), true, 'shape menu did not close after selection');
  const box = await page.locator('#scene').boundingBox();
  assert.ok(box, 'no scene box');
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + to.x, box.y + to.y);
  await page.mouse.up();
  await page.waitForTimeout(80);
}

async function runCase(name, contextOptions = {}) {
  console.log(`[${name}] start`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true, ...contextOptions });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#scene');
  const narrow = (contextOptions.viewport?.width || 9999) <= 900 || contextOptions.isMobile;

  assert.equal(await page.locator('#shapeMenu').isHidden(), true, `${name}: shape menu must start closed`);
  assert.equal(await page.locator('.tool.active[data-tool="select"]').count(), 1, `${name}: select must be active on startup`);

  await drawShape(page, 'rect', { x: 220, y: 180 }, { x: 430, y: 320 });
  assert.ok(await page.locator('.scene-object').count() >= 1, `${name}: shape object was not created`);
  console.log(`[${name}] shape ok`);

  if (name === 'desktop') {
    const beforeCurtain = await page.locator('.scene-object').count();
    await drawShape(page, 'curtain', { x: 55, y: 80 }, { x: 180, y: 165 });
    assert.equal(await page.locator('.scene-object').count(), beforeCurtain + 1, `${name}: curtain object was not created`);
    assert.ok(await page.locator('.scene-object svg rect[fill="#e7ecea"]').count() >= 1, `${name}: curtain visual is missing`);
    await page.click('#undoBtn');
    assert.equal(await page.locator('.scene-object').count(), beforeCurtain, `${name}: undo did not remove curtain`);
    await page.click('#redoBtn');
    assert.equal(await page.locator('.scene-object').count(), beforeCurtain + 1, `${name}: redo did not restore curtain`);
    console.log(`[${name}] curtain+undo/redo ok`);
  }

  if (narrow) {
    await page.click('#mobilePanelBtn');
    assert.equal(await page.locator('#sidePanel').evaluate(() => document.body.classList.contains('side-panel-open')), true, `${name}: mobile panel did not open`);
    await page.waitForTimeout(180);
  }

  await page.fill('#textValue', 'x² + y² = 25');
  await page.click('#addTextBtn');
  assert.ok(await page.locator('.text-object').count() >= 1, `${name}: text object was not created`);
  await page.fill('#graphExpression', 'x^2');
  await page.click('#addGraphBtn');
  assert.ok(await page.locator('.graph-object').count() >= 1, `${name}: graph object was not created`);
  assert.ok(await page.locator('.graph-object .graph-label').count() >= 8, `${name}: graph numeric scale is missing`);
  assert.equal(await page.locator('.graph-object .graph-axis-name').count(), 2, `${name}: graph axis names are missing`);
  console.log(`[${name}] text+graph scale ok`);

  if (narrow) await page.click('#closeSidePanelBtn');

  await page.locator('.instrument-btn[data-instrument="ruler"]').click();
  assert.ok(await page.locator('.geometry-ruler').count() >= 1, `${name}: ruler was not created`);
  console.log(`[${name}] ruler ok`);

  if (name === 'desktop') {
    const objectCountBeforeRuler = await page.locator('.scene-object').count();
    await page.locator('.geometry-ruler .geometry-action').click();
    assert.equal(await page.locator('.scene-object').count(), objectCountBeforeRuler + 1, `${name}: ruler did not construct a segment`);

    await page.locator('.instrument-btn[data-instrument="protractor"]').click();
    assert.equal(await page.locator('.geometry-protractor .angle-readout').count(), 1, `${name}: protractor angle readout missing`);
    const beforeAngle = await page.locator('.scene-object').count();
    await page.locator('.geometry-protractor .geometry-action').click();
    assert.equal(await page.locator('.scene-object').count(), beforeAngle + 2, `${name}: protractor did not construct two rays`);

    await page.locator('.instrument-btn[data-instrument="compass"]').click();
    assert.equal(await page.locator('.geometry-compass .compass-readout').count(), 1, `${name}: compass radius readout missing`);
    const beforeCircle = await page.locator('.scene-object').count();
    await page.locator('.geometry-compass .geometry-action').click();
    assert.equal(await page.locator('.scene-object').count(), beforeCircle + 1, `${name}: compass did not construct a circle`);
    await page.locator('.geometry-compass .compass-mode[data-mode="arc"]').click();
    const beforeArc = await page.locator('.scene-object').count();
    await page.locator('.geometry-compass .geometry-action').click();
    assert.equal(await page.locator('.scene-object').count(), beforeArc + 1, `${name}: compass did not construct an arc`);
    console.log(`[${name}] geometry constructions ok`);

    const beforeLaserObjects = await page.locator('.scene-object').count();
    await page.click('#laserBtn');
    assert.equal(await page.locator('#laserBtn').evaluate(el => el.classList.contains('active')), true, `${name}: laser did not activate`);
    const sceneBox = await page.locator('#scene').boundingBox();
    assert.ok(sceneBox, `${name}: no scene box for laser`);
    await page.mouse.move(sceneBox.x + 70, sceneBox.y + 390);
    await page.mouse.down();
    await page.mouse.move(sceneBox.x + 130, sceneBox.y + 430);
    assert.equal(await page.locator('#laserDot').isVisible(), true, `${name}: laser dot is not visible while pointing`);
    await page.mouse.up();
    await page.waitForTimeout(260);
    assert.equal(await page.locator('#laserDot').isHidden(), true, `${name}: laser dot did not hide after pointer up`);
    assert.equal(await page.locator('.scene-object').count(), beforeLaserObjects, `${name}: laser must not create board objects`);
    await page.click('#laserBtn');
    console.log(`[${name}] laser ok`);

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('teacherboard.v2') || 'null'));
    assert.ok(saved?.pages?.length >= 1, `${name}: autosave did not persist v2 state`);
    assert.ok(saved.pages.some(p => Array.isArray(p.objects) && p.objects.length > 0), `${name}: autosave state has no objects`);
    console.log(`[${name}] autosave ok`);
  }

  const beforePages = await page.locator('.page-tab').count();
  await page.click('#addPageBtn');
  assert.equal(await page.locator('.page-tab').count(), beforePages + 1, `${name}: page was not added`);
  await page.click('#duplicatePageBtn');
  assert.equal(await page.locator('.page-tab').count(), beforePages + 2, `${name}: page was not duplicated`);
  console.log(`[${name}] pages ok`);

  if (name === 'desktop') {
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await page.click('#savePngBtn');
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /\.png$/i, `${name}: PNG download filename is invalid`);
    console.log(`[${name}] png ok`);
  }

  assert.deepEqual(errors, [], `${name}: browser console/page errors: ${errors.join(' | ')}`);
  await browser.close();
  console.log(`[${name}] ok`);
}

await runCase('desktop', { viewport: { width: 1440, height: 1000 } });
await runCase('tablet', { viewport: { width: 820, height: 1180 }, hasTouch: true });
await runCase('android', { ...devices['Pixel 7'] });
console.log('TeacherBoard browser smoke: OK');
