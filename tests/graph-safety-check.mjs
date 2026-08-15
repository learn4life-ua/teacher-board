import process from 'node:process';
import { graphSvg } from '../src/math/graph.js';

const errors=[];
const fail=m=>errors.push(m);

const hostileExpression='x" onload="alert(1)<tag>';
const svg=graphSvg({
  expression:hostileExpression,
  color:'#245d55',
  xMin:-10,xMax:10,yMin:-10,yMax:10,majorStep:1,w:760
});
const ariaMatch=svg.match(/aria-label="([^"]*)"/);
if(!ariaMatch)fail('Graph SVG must contain aria-label.');
else{
  if(ariaMatch[1].includes('"'))fail('Raw quote escaped aria-label value.');
  if(!ariaMatch[1].includes('&quot;'))fail('Quotes in graph aria-label must be entity-escaped.');
  if(!ariaMatch[1].includes('&lt;tag&gt;'))fail('Angle brackets in graph aria-label must be escaped.');
}
if(!svg.includes('y = x" onload="alert(1)&lt;tag&gt;'))fail('Visible graph title should preserve quotes as text while escaping angle brackets.');
if(!svg.includes('Некоректний вираз'))fail('Invalid graph expression must render an error state.');

const unsafeColor=graphSvg({expression:'x',color:'red" onmouseover="alert(1)',xMin:-5,xMax:5,yMin:-5,yMax:5,majorStep:1,w:760});
if(unsafeColor.includes('onmouseover'))fail('Unsafe graph color escaped style attribute.');
if(!unsafeColor.includes('stroke:#245d55'))fail('Unsafe graph color must fall back to default.');

const safe=graphSvg({expression:'πx',color:'#123abc',xMin:-5,xMax:5,yMin:-5,yMax:5,majorStep:1,w:760});
if(!safe.includes('y = πx'))fail('Safe math expression must remain visible in graph title.');
if(!safe.includes('stroke:#123abc'))fail('Safe graph color must be preserved.');

if(errors.length){
  console.error(`TeacherBoard graph safety: FAIL (${errors.length})`);
  errors.forEach(e=>console.error(`- ${e}`));
  process.exit(1);
}
console.log('TeacherBoard graph safety: OK (escaped ARIA/title and safe curve color)');
