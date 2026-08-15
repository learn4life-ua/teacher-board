import process from 'node:process';
import { graphSvg } from '../src/math/graph.js';

const errors=[];
const fail=m=>errors.push(m);

const svg=graphSvg({
  expression:'x" onload="alert(1)<tag>',
  color:'red" onmouseover="alert(1)',
  xMin:-10,xMax:10,yMin:-10,yMax:10,majorStep:1,w:760
});
if(svg.includes(' onload="alert(1)'))fail('Graph expression escaped aria-label attribute.');
if(svg.includes('onmouseover'))fail('Unsafe graph color escaped style attribute.');
if(!svg.includes('&quot;'))fail('Quotes in graph aria-label must be escaped.');
if(!svg.includes('&lt;tag&gt;'))fail('Graph title text must escape angle brackets.');
if(!svg.includes('Некоректний вираз'))fail('Invalid graph expression must render an error state.');
if(!svg.includes('stroke:#245d55'))fail('Unsafe graph color must fall back to default.');

const safe=graphSvg({expression:'πx',color:'#123abc',xMin:-5,xMax:5,yMin:-5,yMax:5,majorStep:1,w:760});
if(!safe.includes('y = πx'))fail('Safe math expression must remain visible in graph title.');
if(!safe.includes('stroke:#123abc'))fail('Safe graph color must be preserved.');

if(errors.length){
  console.error(`TeacherBoard graph safety: FAIL (${errors.length})`);
  errors.forEach(e=>console.error(`- ${e}`));
  process.exit(1);
}
console.log('TeacherBoard graph safety: OK (escaped title/ARIA and safe curve color)');
