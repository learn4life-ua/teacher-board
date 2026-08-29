import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEACHERBOARD_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(String(error)));

try {
  console.log('stage: export-setup');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => globalThis.TeacherBoardStore && globalThis.TeacherBoardExport?.composePage);

  await page.evaluate(async () => {
    const imageCanvas = document.createElement('canvas');
    imageCanvas.width = 32;
    imageCanvas.height = 32;
    const imageCtx = imageCanvas.getContext('2d');
    imageCtx.fillStyle = '#ff0000';
    imageCtx.fillRect(0, 0, 32, 32);
    const imageSrc = imageCanvas.toDataURL('image/png');

    const rasterCanvas = document.createElement('canvas');
    rasterCanvas.width = 1600;
    rasterCanvas.height = 1200;
    const rasterCtx = rasterCanvas.getContext('2d');
    rasterCtx.clearRect(0, 0, 1600, 1200);
    rasterCtx.fillStyle = '#0000ff';
    rasterCtx.fillRect(30, 30, 80, 80);
    const rasterSrc = rasterCanvas.toDataURL('image/png');

    globalThis.TeacherBoardStore.setHeights([1200, 900]);
    globalThis.TeacherBoardStore.setDocument({
      activePage: 0,
      pages: [
        {
          name: 'Експорт 1',
          background: 'clean',
          height: 1200,
          image: rasterSrc,
          objects: [
            { id: 'text_export', kind: 'text', x: 180, y: 150, w: 500, h: 100, text: 'Експортний текст', color: '#111111', fontSize: 40 },
            { id: 'shape_export', kind: 'shape', shape: 'rect', x: 760, y: 130, w: 260, h: 180, color: '#008000', lineWidth: 12 },
            { id: 'curtain_export', kind: 'curtain', x: 160, y: 520, w: 380, h: 180, fill: '#fedcba', opacity: 1 },
            { id: 'image_export', kind: 'image', x: 900, y: 540, w: 160, h: 160, src: imageSrc, alt: 'Тестове зображення' }
          ]
        },
        {
          name: 'Експорт 2',
          background: 'grid',
          height: 900,
          image: null,
          objects: [
            { id: 'page2_text', kind: 'text', x: 200, y: 180, w: 520, h: 90, text: 'Друга сторінка', color: '#222222', fontSize: 36 }
          ]
        }
      ]
    });
    await globalThis.TeacherBoardStore.flush();
    globalThis.TeacherBoardCoreRuntime?.loadPage?.(0);
  });

  await page.waitForTimeout(400);

  console.log('stage: compose-page');
  const composed = await page.evaluate(async () => {
    const out = await globalThis.TeacherBoardExport.composePage(0);
    const ctx = out.getContext('2d');
    const sample = (x, y) => [...ctx.getImageData(x, y, 1, 1).data];
    return {
      width: out.width,
      height: out.height,
      raster: sample(60, 60),
      curtain: sample(220, 580),
      image: sample(960, 600),
      shapeBorder: sample(765, 200),
      textRegion: [...ctx.getImageData(180, 150, 500, 100).data].some((value, index) => index % 4 !== 3 && value < 100)
    };
  });

  assert.equal(composed.width, 1600, 'PNG composition should keep board width');
  assert.equal(composed.height, 1200, 'Extended page should compose at full height');
  assert.ok(composed.raster[2] > 180 && composed.raster[0] < 80, 'Raster content should be present');
  assert.ok(composed.curtain[0] > 200 && composed.curtain[1] > 180, 'Curtain should be composited');
  assert.ok(composed.image[0] > 200 && composed.image[1] < 80, 'Editable image should be composited');
  assert.ok(composed.shapeBorder[1] > 80 && composed.shapeBorder[0] < 80, 'Shape should be composited');
  assert.equal(composed.textRegion, true, 'Editable text should be composited');

  console.log('stage: png-download');
  const downloadPromise = page.waitForEvent('download');
  await page.evaluate(() => document.getElementById('savePngBtn')?.click());
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /^TeacherBoard-1\.png$/, 'PNG should use expected file name');

  console.log('stage: pdf-pages');
  const pdfResult = await page.evaluate(async () => {
    globalThis.__pdfTrace = { constructors: [], addPages: [], addImages: [], saves: [] };
    class JsPdfStub {
      constructor(options) { globalThis.__pdfTrace.constructors.push(options); }
      addPage(format, orientation) { globalThis.__pdfTrace.addPages.push({ format, orientation }); }
      addImage(data, format, x, y, width, height) {
        globalThis.__pdfTrace.addImages.push({ format, x, y, width, height, hasData: String(data).startsWith('data:image/jpeg') });
      }
      save(name) { globalThis.__pdfTrace.saves.push(name); }
    }
    globalThis.jspdf = { jsPDF: JsPdfStub };
    document.getElementById('saveLessonPdfBtn')?.click();
    const started = Date.now();
    while (!globalThis.__pdfTrace.saves.length && Date.now() - started < 5000) await new Promise(resolve => setTimeout(resolve, 25));
    return globalThis.__pdfTrace;
  });

  assert.equal(pdfResult.constructors.length, 1, 'PDF should create one document');
  assert.equal(pdfResult.addPages.length, 1, 'Two lesson pages should create one additional PDF page');
  assert.equal(pdfResult.addImages.length, 2, 'PDF should include both lesson pages');
  assert.equal(pdfResult.addImages[0].height, 1200, 'PDF should preserve extended first page height');
  assert.equal(pdfResult.addImages[1].height, 900, 'PDF should preserve second page height');
  assert.ok(pdfResult.addImages.every(item => item.hasData), 'PDF pages should be composed as images');
  assert.match(pdfResult.saves[0] || '', /^TeacherBoard-заняття-\d{4}-\d{2}-\d{2}\.pdf$/, 'PDF should use expected lesson file name');

  assert.deepEqual(pageErrors, [], `No page errors expected: ${pageErrors.join('\n')}`);
  console.log('TeacherBoard export regression: PASS');
} finally {
  await context.close();
  await browser.close();
}
