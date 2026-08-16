import process from 'node:process';
import { createState } from '../src/core/state.js';
import { normalizeStoredState, saveState } from '../src/core/storage.js';
import { MAX_TEXT_LENGTH, MAX_GRAPH_EXPRESSION_LENGTH } from '../src/core/content-limits.js';
import { shapeSvg } from '../src/objects/shapes.js';

const errors=[];
const fail=message=>errors.push(message);
const fallback=createState();

if(normalizeStoredState(null,fallback)!==null)fail('Null persisted data must be rejected.');
if(normalizeStoredState({pages:[]},fallback)!==null)fail('Persisted state without pages must be rejected.');

const data={
  tool:'broken-tool',color:123,lineWidth:'bad',zoom:'1.37',activePage:99,
  pages:[
    {
      id:'p1',name:'A'.repeat(120),background:'broken-bg',
      strokes:[
        {id:'s1',tool:'pen',width:undefined,points:[{x:'10',y:'20'},{x:'bad',y:3}]},
        {tool:'unknown',points:[{x:1,y:2}]},
        null
      ],
      objects:[
        {id:'t1',kind:'text',text:'Тест',x:'12',y:'13'},
        {id:'long-text',kind:'text',text:'Т'.repeat(MAX_TEXT_LENGTH+123)},
        {id:'g1',kind:'graph',expression:'x^2',xMin:5,xMax:5,yMin:'bad',yMax:'bad',majorStep:-4},
        {id:'long-graph',kind:'graph',expression:'x+'.repeat(MAX_GRAPH_EXPRESSION_LENGTH)},
        {id:'i1',kind:'image',src:''},
        {id:'remote-image',kind:'image',src:'https://example.com/image.png'},
        {id:'bad',kind:'unknown'},
        {id:'bad-shape',kind:'shape',shape:'inventedShape'},
        {id:'shape1',kind:'shape',shape:'rect',lineWidth:999},
        {id:'circle1',kind:'shape',shape:'circle',w:120,h:220,lineWidth:4},
        {id:'arc1',kind:'shape',shape:'circleArc',w:90,h:170,lineWidth:4},
        {id:'legacy-n5',kind:'shape',shape:'number5',lineWidth:4},
        {id:'legacy-n10',kind:'shape',shape:'number10',lineWidth:4},
        {id:'legacy-blank',kind:'shape',shape:'numberBlank',lineWidth:4}
      ],
      instruments:[
        {id:'pr1',type:'protractor'},
        {id:'c1',type:'compass',w:200,h:200,radius:999,mode:'bad'},
        {id:'bad-inst',type:'unknown'}
      ]
    },
    null
  ]
};

const normalized=normalizeStoredState(data,fallback);
if(!normalized)fail('Recoverable persisted state was rejected.');
else{
  if(normalized.tool!=='select')fail(`Unknown tool must recover to select, got ${normalized.tool}.`);
  if(normalized.color!==fallback.color)fail('Invalid color must recover to fallback color.');
  if(normalized.lineWidth!==fallback.lineWidth)fail(`Missing/bad line width must recover to ${fallback.lineWidth}, got ${normalized.lineWidth}.`);
  if(normalized.zoom!==1.25)fail(`Persisted zoom 1.37 must normalize to 1.25, got ${normalized.zoom}.`);
  if(normalized.activePage!==1)fail(`activePage must clamp to final page, got ${normalized.activePage}.`);
  if(normalized.pages.length!==2)fail('Page count must remain stable during sanitization.');

  const page=normalized.pages[0];
  if(page.name.length!==80)fail(`Page name must be capped at 80 chars, got ${page.name.length}.`);
  if(page.background!=='clean')fail(`Invalid background must recover to clean, got ${page.background}.`);
  if(page.strokes.length!==1||page.strokes[0].points.length!==1)fail('Invalid strokes/points were not filtered safely.');
  if(page.strokes[0]?.width!==4)fail(`Stroke width default must be 4, got ${page.strokes[0]?.width}.`);

  const text=page.objects.find(o=>o.id==='t1');
  if(!text||text.fontSize!==32)fail(`Text default font size must be 32, got ${text?.fontSize}.`);
  const longText=page.objects.find(o=>o.id==='long-text');
  if(longText?.text.length!==MAX_TEXT_LENGTH)fail(`Persisted text must clamp to ${MAX_TEXT_LENGTH} chars, got ${longText?.text.length}.`);
  const graph=page.objects.find(o=>o.id==='g1');
  if(!graph||graph.xMin!==-10||graph.xMax!==10||graph.yMin!==-10||graph.yMax!==10||graph.majorStep!==.1)fail('Malformed graph ranges/step were not repaired.');
  const longGraph=page.objects.find(o=>o.id==='long-graph');
  if(longGraph?.expression.length!==MAX_GRAPH_EXPRESSION_LENGTH)fail(`Persisted graph expression must clamp to ${MAX_GRAPH_EXPRESSION_LENGTH} chars, got ${longGraph?.expression.length}.`);
  const shape=page.objects.find(o=>o.id==='shape1');
  if(!shape||shape.lineWidth!==40)fail(`Shape line width must clamp to 40, got ${shape?.lineWidth}.`);
  const circle=page.objects.find(o=>o.id==='circle1');
  if(!circle||circle.w!==220||circle.h!==220)fail(`Persisted circle must normalize to square bounds, got ${circle?.w}×${circle?.h}.`);
  const arc=page.objects.find(o=>o.id==='arc1');
  if(!arc||arc.w!==170||arc.h!==170)fail(`Compass arc must normalize to square bounds, got ${arc?.w}×${arc?.h}.`);
  if(circle&&!shapeSvg(circle).includes('<ellipse'))fail('Circle SVG renderer must remain available after storage normalization.');
  if(page.objects.some(o=>['i1','remote-image','bad','bad-shape'].includes(o.id)))fail('Invalid/remote image, unknown object or unsupported shape must be removed.');

  const n5=page.objects.find(o=>o.id==='legacy-n5');
  const n10=page.objects.find(o=>o.id==='legacy-n10');
  const blankLine=page.objects.find(o=>o.id==='legacy-blank');
  if(!n5||n5.shape!=='numberLine'||n5.numberMin!==-5||n5.numberMax!==5||n5.showLabels!==true)fail('Legacy number5 did not migrate to labeled −5…5 numberLine.');
  if(!n10||n10.shape!=='numberLine'||n10.numberMin!==-10||n10.numberMax!==10||n10.showLabels!==true)fail('Legacy number10 did not migrate to labeled −10…10 numberLine.');
  if(!blankLine||blankLine.shape!=='numberLine'||blankLine.numberMin!==-5||blankLine.numberMax!==5||blankLine.showLabels!==false)fail('Legacy numberBlank did not migrate to unlabeled numberLine.');

  if(n5){
    const svg=shapeSvg(n5);
    if(!svg.includes('>-5</text>')||!svg.includes('>5</text>'))fail('Migrated number5 SVG must render −5 and 5 labels.');
    if(!svg.includes('M96 50 L90 45'))fail('Number line must keep a single arrowhead toward +x.');
  }
  if(n10){
    const svg=shapeSvg(n10);
    if(!svg.includes('>-10</text>')||!svg.includes('>10</text>'))fail('Migrated number10 SVG must render −10 and 10 labels.');
  }
  if(blankLine){
    const svg=shapeSvg(blankLine);
    if(svg.includes('class="scale-label"'))fail('Migrated numberBlank must render tick marks without numeric labels.');
  }

  const protractor=page.instruments.find(i=>i.id==='pr1');
  if(!protractor||protractor.angle!==60||protractor.w!==420||protractor.h!==220)fail('Protractor defaults were not restored.');
  const compass=page.instruments.find(i=>i.id==='c1');
  if(!compass||compass.radius!==90||compass.mode!=='circle')fail(`Compass radius/mode were not clamped safely: ${compass?.radius}/${compass?.mode}.`);
  if(page.instruments.some(i=>i.id==='bad-inst'))fail('Unknown instrument must be removed.');

  const blank=normalized.pages[1];
  if(!Array.isArray(blank.strokes)||!Array.isArray(blank.objects)||!Array.isArray(blank.instruments))fail('Malformed page must recover to arrays.');
}

const previousStorage=globalThis.localStorage;
try{
  let written='',writes=0;
  globalThis.localStorage={setItem:(key,value)=>{writes+=1;written=`${key}:${value}`;},getItem:()=>null,removeItem:()=>{}};
  const stable=createState();
  if(saveState(stable)!==true)fail('saveState must return true after successful localStorage write.');
  if(!written.startsWith('teacherboard.v2:'))fail('saveState did not write teacherboard.v2.');
  if(saveState(stable)!==true)fail('Repeated identical saveState call must still report success.');
  if(writes!==1)fail(`Identical autosave state must be deduplicated to one write, got ${writes}.`);
  stable.color='#123456';
  if(saveState(stable)!==true)fail('Changed state must still save successfully after deduplication.');
  if(writes!==2)fail(`Changed state must trigger a new storage write, got ${writes} total writes.`);

  globalThis.localStorage={
    setItem:()=>{const error=new Error('quota');error.name='QuotaExceededError';throw error;},
    getItem:()=>null,removeItem:()=>{}
  };
  let quotaResult;
  try{quotaResult=saveState(createState());}catch(error){fail(`saveState leaked quota exception: ${error.message}`);}
  if(quotaResult!==false)fail(`saveState must return false on quota failure, got ${quotaResult}.`);
}finally{
  if(previousStorage===undefined)delete globalThis.localStorage;
  else globalThis.localStorage=previousStorage;
}

if(errors.length){
  console.error(`TeacherBoard storage check: FAIL (${errors.length})`);
  errors.forEach(error=>console.error(`- ${error}`));
  process.exit(1);
}
console.log('TeacherBoard storage check: OK (corrupt data, content limits, circle/arc, legacy number lines, quota handling, write deduplication)');