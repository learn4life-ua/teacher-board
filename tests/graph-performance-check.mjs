import process from 'node:process';
import { graphSvg, adaptiveGridStep, graphSampleCount } from '../src/math/graph.js';

const errors=[];
const fail=message=>errors.push(message);

const step=adaptiveGridStep(-100000,100000,.1);
if(!(step>=80)) fail(`Adaptive grid step is too small for extreme range: ${step}`);
if(graphSampleCount(100000)!==1600) fail(`Graph samples must cap at 1600, got ${graphSampleCount(100000)}.`);
if(graphSampleCount(100)!==480) fail(`Graph samples must floor at 480, got ${graphSampleCount(100)}.`);

const extreme=graphSvg({
  expression:'sin(x)',x:0,y:0,w:100000,h:560,color:'#245d55',
  xMin:-100000,xMax:100000,yMin:-100000,yMax:100000,majorStep:.1
});
const gridCount=(extreme.match(/class="graph-grid"/g)||[]).length;
const labelCount=(extreme.match(/class="graph-label"/g)||[]).length;
const curve=extreme.match(/class="graph-curve"[^>]+d="([^"]*)"/)?.[1]||'';
const commandCount=(curve.match(/[ML]/g)||[]).length;
if(gridCount>500) fail(`Extreme graph rendered too many grid lines: ${gridCount}`);
if(labelCount>500) fail(`Extreme graph rendered too many labels: ${labelCount}`);
if(commandCount>1601) fail(`Extreme graph rendered too many curve samples: ${commandCount}`);

const broken=graphSvg({
  expression:'x',x:0,y:0,w:760,h:560,color:'#245d55',
  xMin:5,xMax:5,yMin:Number.NaN,yMax:Number.NaN,majorStep:0
});
if(/NaN|Infinity/.test(broken)) fail('Graph SVG must not expose NaN/Infinity for malformed ranges.');
if(!broken.includes('graph-curve')) fail('Malformed stored graph ranges should recover to safe defaults.');

if(errors.length){
  console.error(`TeacherBoard graph performance check: FAIL (${errors.length})`);
  errors.forEach(error=>console.error(`- ${error}`));
  process.exit(1);
}
console.log(`TeacherBoard graph performance check: OK (${gridCount} grid lines, ${commandCount} samples)`);
