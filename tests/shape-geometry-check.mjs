import process from 'node:process';
import { shapeSvg } from '../src/objects/shapes.js';

const errors=[];
const fail=message=>errors.push(message);

const half=shapeSvg({id:'half',kind:'shape',shape:'circleArc',startDeg:0,endDeg:180,lineWidth:4});
const halfArcCount=(half.match(/A46 46/g)||[]).length;
if(halfArcCount!==1)fail(`180° circleArc must use one SVG arc command, got ${halfArcCount}.`);
if(!half.includes('M96.00 50.00'))fail('180° circleArc must start at the rightmost circle point.');

const full=shapeSvg({id:'full',kind:'shape',shape:'circleArc',startDeg:0,endDeg:360,lineWidth:4});
const fullArcCount=(full.match(/A46 46/g)||[]).length;
if(fullArcCount!==2)fail(`360° circleArc must use two SVG arc commands, got ${fullArcCount}.`);
if(!/A46 46 0 1 0/.test(full))fail('360° circleArc must use two large half-circle arcs.');
if(!full.includes('M96.00 50.00'))fail('360° circleArc must keep a deterministic start point.');

const wrapped=shapeSvg({id:'wrapped',kind:'shape',shape:'circleArc',startDeg:300,endDeg:60,lineWidth:4});
if((wrapped.match(/A46 46/g)||[]).length!==1)fail('Wrapped 300°→60° arc must remain a single 120° arc.');

const circle=shapeSvg({id:'c',kind:'shape',shape:'circle',lineWidth:4});
const ellipse=shapeSvg({id:'e',kind:'shape',shape:'ellipse',lineWidth:4});
if(!circle.includes('<ellipse')||!ellipse.includes('<ellipse'))fail('Circle and ellipse renderers must remain available.');

if(errors.length){
  console.error(`TeacherBoard shape geometry check: FAIL (${errors.length})`);
  errors.forEach(error=>console.error(`- ${error}`));
  process.exit(1);
}
console.log('TeacherBoard shape geometry check: OK (circleArc 180/360/wrapped arc rendering)');
