import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';

const baseURL=process.env.TB_URL||'http://127.0.0.1:4173/preview.html';
const watchdog=setTimeout(()=>{
  console.error('TeacherBoard browser smoke watchdog: test exceeded 45 seconds. See the last completed step above.');
  process.exit(124);
},45000);

const legacyFixture={
  activePage:0,
  pages:[{
    id:'legacy-page-1',
    name:'Старий урок',
    background:'grid',
    image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    texts:[{text:'Старий текст',x:123,y:234,color:'#123456'}]
  }]
};

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

async function runLegacyMigrationCase(){
  console.log('[migration] start');
  const browser=await chromium.launch({headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1280,height:900}});
    const page=await context.newPage();
    page.setDefaultTimeout(8000);
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});

    await page.addInitScript(data=>{
      localStorage.removeItem('teacherboard.v2');
      localStorage.removeItem('teacherboard.v2.migratedFromV1');
      localStorage.setItem('teacherboard.v1',JSON.stringify(data));
    },legacyFixture);

    await page.goto(baseURL,{waitUntil:'networkidle'});
    await page.waitForSelector('#scene');

    const migrated=await page.evaluate(()=>({
      v1:localStorage.getItem('teacherboard.v1'),
      flag:localStorage.getItem('teacherboard.v2.migratedFromV1'),
      v2:JSON.parse(localStorage.getItem('teacherboard.v2')||'null')
    }));

    assert.equal(migrated.v1,null,'migration: legacy v1 key should be removed after successful migration');
    assert.equal(migrated.flag,'1','migration: migration flag was not written');
    assert.equal(migrated.v2?.pages?.length,1,'migration: expected one migrated page');
    assert.equal(migrated.v2.pages[0].id,'legacy-page-1','migration: page id was not preserved');
    assert.equal(migrated.v2.pages[0].name,'Старий урок','migration: page name was not preserved');
    assert.equal(migrated.v2.pages[0].background,'grid','migration: page background was not preserved');

    const objects=migrated.v2.pages[0].objects||[];
    const raster=objects.find(o=>o.legacyRaster===true);
    const text=objects.find(o=>o.kind==='text'&&o.text==='Старий текст');
    assert.ok(raster,'migration: legacy canvas raster was not converted to an image object');
    assert.equal(raster.kind,'image','migration: legacy raster must be an image object');
    assert.equal(raster.locked,true,'migration: legacy raster must be locked');
    assert.equal(raster.x,0,'migration: legacy raster x must be 0');
    assert.equal(raster.y,0,'migration: legacy raster y must be 0');
    assert.equal(raster.w,1600,'migration: legacy raster width must cover scene');
    assert.equal(raster.h,900,'migration: legacy raster height must cover scene');
    assert.ok(text,'migration: legacy text was not converted to a text object');
    assert.equal(text.x,123,'migration: legacy text x was not preserved');
    assert.equal(text.y,234,'migration: legacy text y was not preserved');
    assert.equal(text.color,'#123456','migration: legacy text color was not preserved');

    assert.equal(await page.locator('.locked-object.image-object').count(),1,'migration: locked legacy image was not rendered');
    assert.equal(await page.locator('.locked-object.image-object').evaluate(el=>getComputedStyle(el).pointerEvents),'none','migration: locked raster must ignore pointer events');
    assert.ok((await page.locator('.text-object').allTextContents()).some(value=>value.includes('Старий текст')),'migration: migrated text was not rendered');

    const beforeReload=await page.locator('.scene-object').count();
    await page.reload({waitUntil:'networkidle'});
    await page.waitForSelector('#scene');
    assert.equal(await page.locator('.scene-object').count(),beforeReload,'migration: reload duplicated migrated objects');
    assert.equal(await page.evaluate(()=>localStorage.getItem('teacherboard.v1')),null,'migration: v1 unexpectedly reappeared after reload');
    assert.deepEqual(errors,[],`migration: browser errors: ${errors.join(' | ')}`);
    console.log('[migration] v1 → v2 ok');
  }finally{
    await browser.close();
  }
}

async function runLegacyRollbackCase(){
  console.log('[migration-rollback] start');
  const browser=await chromium.launch({headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1100,height:800}});
    const page=await context.newPage();
    page.setDefaultTimeout(8000);

    await page.addInitScript(data=>{
      localStorage.removeItem('teacherboard.v2');
      localStorage.removeItem('teacherboard.v2.migratedFromV1');
      localStorage.setItem('teacherboard.v1',JSON.stringify(data));
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){
        if(key==='teacherboard.v2') throw new DOMException('Simulated storage quota failure','QuotaExceededError');
        return original.call(this,key,value);
      };
    },legacyFixture);

    await page.goto(baseURL,{waitUntil:'networkidle'});
    await page.waitForSelector('#scene');

    const state=await page.evaluate(()=>({
      v1:localStorage.getItem('teacherboard.v1'),
      v2:localStorage.getItem('teacherboard.v2'),
      flag:localStorage.getItem('teacherboard.v2.migratedFromV1')
    }));
    assert.ok(state.v1,'migration rollback: original v1 was not restored after v2 write failure');
    const restored=JSON.parse(state.v1);
    assert.equal(restored.pages?.[0]?.name,'Старий урок','migration rollback: restored v1 content changed');
    assert.equal(state.v2,null,'migration rollback: partial v2 state must be removed');
    assert.equal(state.flag,null,'migration rollback: migration flag must not be set on failure');
    console.log('[migration-rollback] v1 restored after failed v2 write');
  }finally{
    await browser.close();
  }
}

async function desktopDrawingExtras(page){
  const box=await page.locator('#drawingCanvas').boundingBox();
  assert.ok(box,'desktop: drawing canvas box missing');
  const from={x:Math.min(520,box.width*0.46),y:Math.min(390,box.height*0.46)};
  const to={x:from.x+120,y:from.y};
  const sampleX=Math.round((from.x+to.x)/2);
  const sampleY=Math.round(from.y);

  await page.click('.tool[data-tool="pen"]');
  await page.mouse.move(box.x+from.x,box.y+from.y);
  await page.mouse.down();
  await page.mouse.move(box.x+to.x,box.y+to.y,{steps:8});
  await page.mouse.up();
  const alphaBefore=await page.locator('#drawingCanvas').evaluate((canvas,{x,y})=>canvas.getContext('2d').getImageData(x,y,1,1).data[3],{x:sampleX,y:sampleY});
  assert.ok(alphaBefore>0,'desktop: pen stroke did not paint an opaque canvas pixel');

  await page.click('.tool[data-tool="eraser"]');
  await page.mouse.move(box.x+from.x,box.y+from.y);
  await page.mouse.down();
  await page.mouse.move(box.x+to.x,box.y+to.y,{steps:8});
  await page.mouse.up();
  const alphaAfter=await page.locator('#drawingCanvas').evaluate((canvas,{x,y})=>canvas.getContext('2d').getImageData(x,y,1,1).data[3],{x:sampleX,y:sampleY});
  assert.ok(alphaAfter<alphaBefore,'desktop: eraser did not remove drawing canvas alpha');
  await page.click('.tool[data-tool="select"]');
  console.log('[desktop] transparent eraser ok');
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

async function pageActions(page,name,beforePages){
  await page.click('#addPageBtn');
  assert.equal(await page.locator('.page-tab').count(),beforePages+1,`${name}: page was not added`);
  await page.click('#duplicatePageBtn');
  assert.equal(await page.locator('.page-tab').count(),beforePages+2,`${name}: page was not duplicated`);

  page.once('dialog',dialog=>dialog.accept('Урок — тест'));
  await page.click('#renamePageBtn');
  assert.match(await page.locator('.page-tab.active').innerText(),/Урок — тест/,`${name}: active page was not renamed`);

  page.once('dialog',dialog=>dialog.accept());
  await page.click('#deletePageBtn');
  assert.equal(await page.locator('.page-tab').count(),beforePages+1,`${name}: page was not deleted`);
  assert.equal((await page.locator('.page-tab.active').innerText()).includes('Урок — тест'),false,`${name}: deleted page is still active`);
  assert.equal(await page.locator('#deletePageBtn').isDisabled(),false,`${name}: delete page button unexpectedly disabled with multiple pages`);
  console.log(`[${name}] page add/duplicate/rename/delete ok`);
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

    if(name==='desktop')await desktopDrawingExtras(page);

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
      assert.ok(saved.pages.some(p=>Array.isArray(p.strokes)&&p.strokes.some(s=>s.tool==='eraser')),'desktop: autosave has no eraser stroke');
      console.log('[desktop] autosave ok');
    }

    const beforePages=await page.locator('.page-tab').count();
    await pageActions(page,name,beforePages);

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

await runLegacyMigrationCase();
await runLegacyRollbackCase();
await runCase('desktop',{viewport:{width:1440,height:1000}});
await runCase('tablet',{viewport:{width:820,height:1180},hasTouch:true});
await runCase('android',{...devices['Pixel 7']});
clearTimeout(watchdog);
console.log('TeacherBoard browser smoke: OK');
