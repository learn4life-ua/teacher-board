import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';

const baseURL=process.env.TB_URL||'http://127.0.0.1:4173/preview.html';
const watchdog=setTimeout(()=>{
  console.error('TeacherBoard browser smoke watchdog: test exceeded 45 seconds. See the last completed step above.');
  process.exit(124);
},45000);

async function drawShape(page,shape,from,to){
  await page.click('#shapeBtn');
  assert.equal(await page.locator('#shapeMenu').isVisible(),true,'shape menu did not open');
  await page.locator(`#shapeMenu [data-shape="${shape}"]`).click();
  assert.equal(await page.locator('#shapeMenu').isHidden(),true,'shape menu did not close');
  const box=await page.locator('#scene').boundingBox();
  assert.ok(box,'no scene box');
  await page.mouse.move(box.x+from.x,box.y+from.y);
  await page.mouse.down();
  await page.mouse.move(box.x+to.x,box.y+to.y);
  await page.mouse.up();
  await page.waitForTimeout(80);
}

async function desktopExtras(page){
  const beforeCurtain=await page.locator('.scene-object').count();
  await drawShape(page,'curtain',{x:55,y:80},{x:180,y:165});
  assert.equal(await page.locator('.scene-object').count(),beforeCurtain+1,'desktop: curtain object was not created');
  assert.ok(await page.locator('.scene-object svg rect[fill="#e7ecea"]').count()>=1,'desktop: curtain visual missing');
  await page.click('#undoBtn');
  assert.equal(await page.locator('.scene-object').count(),beforeCurtain,'desktop: undo did not remove curtain');
  await page.click('#redoBtn');
  assert.equal(await page.locator('.scene-object').count(),beforeCurtain+1,'desktop: redo did not restore curtain');
  console.log('[desktop] curtain+undo/redo ok');
}

async function geometryExtras(page){
  const beforeRuler=await page.locator('.scene-object').count();
  await page.locator('.geometry-ruler .geometry-action').click();
  assert.equal(await page.locator('.scene-object').count(),beforeRuler+1,'desktop: ruler did not construct segment');

  await page.locator('.instrument-btn[data-instrument="protractor"]').click();
  assert.equal(await page.locator('.geometry-protractor .angle-readout').count(),1,'desktop: protractor readout missing');
  const beforeAngle=await page.locator('.scene-object').count();
  await page.locator('.geometry-protractor .geometry-action').click();
  assert.equal(await page.locator('.scene-object').count(),beforeAngle+2,'desktop: protractor did not construct two rays');

  await page.locator('.instrument-btn[data-instrument="compass"]').click();
  assert.equal(await page.locator('.geometry-compass .compass-readout').count(),1,'desktop: compass readout missing');
  const beforeCircle=await page.locator('.scene-object').count();
  await page.locator('.geometry-compass .geometry-action').click();
  assert.equal(await page.locator('.scene-object').count(),beforeCircle+1,'desktop: compass did not construct circle');
  await page.locator('.geometry-compass .compass-mode[data-mode="arc"]').click();
  const beforeArc=await page.locator('.scene-object').count();
  await page.locator('.geometry-compass .geometry-action').click();
  assert.equal(await page.locator('.scene-object').count(),beforeArc+1,'desktop: compass did not construct arc');
  console.log('[desktop] geometry constructions ok');
}

async function runCase(name,contextOptions={}){
  console.log(`[${name}] start`);
  const browser=await chromium.launch({headless:true});
  try{
    const context=await browser.newContext({acceptDownloads:true,...contextOptions});
    const page=await context.newPage();
    page.setDefaultTimeout(8000);
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});

    await page.goto(baseURL,{waitUntil:'networkidle'});
    await page.waitForSelector('#scene');
    const narrow=(contextOptions.viewport?.width||9999)<=900||contextOptions.isMobile;

    assert.equal(await page.locator('#shapeMenu').isHidden(),true,`${name}: shape menu must start closed`);
    assert.equal(await page.locator('.tool.active[data-tool="select"]').count(),1,`${name}: select must be active on startup`);

    await drawShape(page,'rect',{x:220,y:180},{x:430,y:320});
    assert.ok(await page.locator('.scene-object').count()>=1,`${name}: shape object was not created`);
    console.log(`[${name}] shape ok`);
    if(name==='desktop')await desktopExtras(page);

    if(narrow){
      await page.click('#mobilePanelBtn');
      assert.equal(await page.locator('#sidePanel').evaluate(()=>document.body.classList.contains('side-panel-open')),true,`${name}: mobile panel did not open`);
      await page.waitForTimeout(180);
    }

    await page.fill('#textValue','x² + y² = 25');
    await page.click('#addTextBtn');
    assert.ok(await page.locator('.text-object').count()>=1,`${name}: text object was not created`);
    await page.fill('#graphExpression','x^2');
    await page.click('#addGraphBtn');
    assert.ok(await page.locator('.graph-object').count()>=1,`${name}: graph object was not created`);
    assert.ok(await page.locator('.graph-object .graph-label').count()>=8,`${name}: graph numeric scale missing`);
    assert.equal(await page.locator('.graph-object .graph-axis-name').count(),2,`${name}: graph axis names missing`);
    console.log(`[${name}] text+graph scale ok`);

    if(narrow)await page.click('#closeSidePanelBtn');
    await page.locator('.instrument-btn[data-instrument="ruler"]').click();
    assert.ok(await page.locator('.geometry-ruler').count()>=1,`${name}: ruler was not created`);
    console.log(`[${name}] ruler ok`);

    if(name==='desktop'){
      await geometryExtras(page);
      const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('teacherboard.v2')||'null'));
      assert.ok(saved?.pages?.length>=1,'desktop: autosave did not persist v2 state');
      assert.ok(saved.pages.some(p=>Array.isArray(p.objects)&&p.objects.length>0),'desktop: autosave has no objects');
      console.log('[desktop] autosave ok');
    }

    const beforePages=await page.locator('.page-tab').count();
    await page.click('#addPageBtn');
    assert.equal(await page.locator('.page-tab').count(),beforePages+1,`${name}: page was not added`);
    await page.click('#duplicatePageBtn');
    assert.equal(await page.locator('.page-tab').count(),beforePages+2,`${name}: page was not duplicated`);
    console.log(`[${name}] pages ok`);

    if(name==='desktop'){
      const pending=page.waitForEvent('download',{timeout:15000});
      await page.click('#savePngBtn');
      const download=await pending;
      assert.match(download.suggestedFilename(),/\.png$/i,'desktop: invalid PNG filename');
      console.log('[desktop] png ok');
    }

    assert.deepEqual(errors,[],`${name}: browser errors: ${errors.join(' | ')}`);
    console.log(`[${name}] ok`);
  }finally{
    await browser.close();
  }
}

await runCase('desktop',{viewport:{width:1440,height:1000}});
await runCase('tablet',{viewport:{width:820,height:1180},hasTouch:true});
await runCase('android',{...devices['Pixel 7']});
clearTimeout(watchdog);
console.log('TeacherBoard browser smoke: OK');
