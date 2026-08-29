import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEACHERBOARD_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));

  console.log('stage: renderer');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => globalThis.TeacherBoardObjects?.renderShapeSvg && document.querySelector('.tb-shape-launcher'));

  const renderer = await page.evaluate(() => {
    const shapes = ['line','rect','ellipse','triangle','rightTriangle','parallelogram','trapezoid','rhombus','angle','arc'];
    const geometry = Object.fromEntries(shapes.map(shape => [shape, TeacherBoardObjects.renderShapeSvg({ shape, lineWidth: 4, color: '#245d55' })]));

    function inspect(shape) {
      const host = document.createElement('div');
      host.innerHTML = TeacherBoardObjects.renderShapeSvg({ shape, lineWidth: 4, color: '#245d55' });
      return {
        paths: [...host.querySelectorAll('path')].map(el => el.getAttribute('d')),
        lines: host.querySelectorAll('line').length,
        labels: [...host.querySelectorAll('text')].map(el => el.textContent)
      };
    }

    return {
      geometry,
      number5: inspect('number5'),
      number10: inspect('number10'),
      numberBlank: inspect('numberBlank'),
      axes: inspect('axes'),
      table: inspect('xyTable')
    };
  });

  Object.entries(renderer.geometry).forEach(([shape, svg]) => {
    assert.match(svg, /^<svg[\s\S]*<\/svg>$/, `${shape} should render a complete SVG`);
  });
  assert.equal(renderer.number5.paths.length, 1, 'Number line should have one arrowhead path');
  assert.equal(renderer.number5.labels[0], '-5');
  assert.equal(renderer.number5.labels.at(-1), '5');
  assert.deepEqual(renderer.number10.labels, ['-10','-8','-6','-4','-2','0','2','4','6','8','10'], '−10…10 should keep readable even-number labels');
  assert.equal(renderer.numberBlank.labels.length, 0, 'Blank number line should not render labels');
  assert.equal(renderer.axes.paths.length, 1, 'Axes should keep arrowheads in the integrated renderer');
  assert.ok(renderer.axes.paths[0].includes('M95 50') && renderer.axes.paths[0].includes('M50 5'), 'Axes should have positive x and y arrowheads');
  assert.ok(renderer.table.lines >= 4, 'x/y table should render internal grid lines');
  assert.deepEqual(renderer.table.labels, ['x','y']);

  console.log('stage: preset-insertion');
  await page.locator('#mathToggleBtn').click();
  await page.locator('#insertAxesBtn').click({ force: true });
  await page.locator('#insertNumberLineBtn').click({ force: true });
  await page.locator('#insertXYTableBtn').click({ force: true });
  const presetObjects = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('teacherboard.v1'));
    return data.pages[data.activePage].objects.map(item => ({ kind: item.kind, shape: item.shape }));
  });
  assert.ok(presetObjects.some(item => item.shape === 'axes'), 'Axes preset should create editable object');
  assert.ok(presetObjects.some(item => item.shape === 'number5'), 'Number line preset should create editable object');
  assert.ok(presetObjects.some(item => item.shape === 'xyTable'), 'x/y table preset should create editable object');

  assert.deepEqual(pageErrors, [], `No page errors expected: ${pageErrors.join('\n')}`);
  await context.close();

  console.log('stage: mobile-shape-menu');
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const phone = await mobile.newPage();
  const phoneErrors = [];
  phone.on('pageerror', error => phoneErrors.push(String(error)));
  await phone.goto(BASE_URL, { waitUntil: 'networkidle' });
  await phone.waitForFunction(() => document.querySelector('.tb-shape-launcher'));
  await phone.locator('.tb-shape-launcher').click();
  const menu = await phone.locator('.tb-shape-menu:not([hidden])').boundingBox();
  assert.ok(menu, 'Shape menu should open on phone');
  assert.ok(menu.x >= 0 && menu.y >= 0, 'Shape menu should stay inside top/left viewport bounds');
  assert.ok(menu.x + menu.width <= 390 + 1, 'Shape menu should fit phone width');
  assert.ok(menu.height <= 844 * 0.76, 'Shape menu should use a bounded scrollable height on phone');

  const firstButton = phone.locator('.tb-shape-menu [data-shape="line"]');
  const buttonBox = await firstButton.boundingBox();
  assert.ok(buttonBox && buttonBox.height >= 44, 'Shape choices should meet mobile touch target height');
  assert.deepEqual(phoneErrors, [], `No phone page errors expected: ${phoneErrors.join('\n')}`);
  await mobile.close();

  console.log('TeacherBoard math regression: PASS');
} finally {
  await browser.close();
}
