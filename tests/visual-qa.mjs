import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const BASE_URL = process.env.TEACHERBOARD_URL || 'http://127.0.0.1:4173/index.html';
const OUTPUT = 'artifacts/visual-qa';

await fs.mkdir(OUTPUT, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function capture(name, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.route('https://cdnjs.cloudflare.com/**', route => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(globalThis.TeacherBoardCoreRuntime && document.getElementById('objectLayer') && document.querySelector('.tb-select-tool')));
  await page.waitForTimeout(250);

  const metrics = await page.evaluate(() => {
    const rect = selector => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom, display:s.display, visibility:s.visibility };
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      bodyScrollWidth: document.documentElement.scrollWidth,
      bodyClientWidth: document.documentElement.clientWidth,
      topbar: rect('.topbar'),
      toolbar: rect('.toolbar'),
      board: rect('#board'),
      pagebar: rect('.pagebar'),
      visibleTools: document.querySelectorAll('.toolbar .tool:not([hidden])').length,
      mobileMoreVisible: Boolean(document.querySelector('.tb-mobile-more') && getComputedStyle(document.querySelector('.tb-mobile-more')).display !== 'none')
    };
  });

  assert.equal(errors.length, 0, `${name}: no page errors expected: ${errors.join('\n')}`);
  assert.ok(metrics.topbar?.height > 40, `${name}: topbar must remain visible`);
  assert.ok(metrics.toolbar?.width >= 40, `${name}: toolbar must remain visible`);
  assert.ok(metrics.board?.width > 250 && metrics.board?.height > 180, `${name}: board must remain usable`);
  assert.ok(metrics.pagebar?.height >= 30, `${name}: page strip must remain visible`);
  assert.ok(metrics.visibleTools >= 5, `${name}: enough primary tools must remain available`);
  assert.ok(metrics.bodyScrollWidth <= metrics.bodyClientWidth + 2, `${name}: page itself must not develop unintended horizontal overflow (${metrics.bodyScrollWidth} > ${metrics.bodyClientWidth})`);

  await page.screenshot({ path: `${OUTPUT}/${name}.png`, fullPage: true });
  await fs.writeFile(`${OUTPUT}/${name}.json`, JSON.stringify(metrics, null, 2));
  await context.close();
  console.log(`visual-qa: ${name} PASS`);
}

try {
  await capture('desktop-1440x1000', { width: 1440, height: 1000 });
  await capture('tablet-900x1100', { width: 900, height: 1100 });
  await capture('mobile-390x844', { width: 390, height: 844 });
  console.log('TeacherBoard visual QA capture: PASS');
} finally {
  await browser.close();
}
