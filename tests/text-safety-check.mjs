import process from 'node:process';
import { textMarkup } from '../src/objects/text.js';

const errors=[];
const fail=m=>errors.push(m);

const html=textMarkup({text:'1 < 2 & 3 > 1\n<script>x</script>',fontSize:999,color:'red" onmouseover="alert(1)'});
if(html.includes('<script>'))fail('Text content must escape HTML tags.');
if(!html.includes('1 &lt; 2 &amp; 3 &gt; 1'))fail('Text content escaping is incomplete.');
if(!html.includes('<br>'))fail('Newlines must render as <br>.');
if(!html.includes('font-size:160px'))fail('Text font size must clamp to 160px.');
if(!html.includes('color:#18342f'))fail('Unsafe inline color must fall back to default.');
if(html.includes('onmouseover'))fail('Unsafe color text must not escape the style attribute.');

const safe=textMarkup({text:'π ≤ x²',fontSize:32,color:'#245d55'});
if(!safe.includes('π ≤ x²'))fail('Math symbols must remain intact in text rendering.');
if(!safe.includes('color:#245d55'))fail('Safe hex colors must be preserved.');

if(errors.length){
  console.error(`TeacherBoard text safety: FAIL (${errors.length})`);
  errors.forEach(e=>console.error(`- ${e}`));
  process.exit(1);
}
console.log('TeacherBoard text safety: OK (escaped content, bounded size, safe inline color)');
