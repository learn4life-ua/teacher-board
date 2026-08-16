import fs from 'node:fs';
import process from 'node:process';
import { isSafeImageType,isSafeImageDataUrl } from '../src/core/image-format.js';

const errors=[];
const fail=message=>errors.push(message);

for(const type of ['image/png','image/jpeg','image/webp','image/gif','image/avif']){
  if(!isSafeImageType(type))fail(`Safe raster MIME was rejected: ${type}`);
}
for(const type of ['image/svg+xml','text/html','application/xml','']){
  if(isSafeImageType(type))fail(`Unsafe MIME was accepted: ${type||'(empty)'}`);
}
for(const src of [
  'data:image/png;base64,AA==','data:image/jpeg;base64,AA==','data:image/webp;base64,AA==',
  'data:image/gif;base64,AA==','data:image/avif;base64,AA=='
]){
  if(!isSafeImageDataUrl(src))fail(`Safe raster DataURL was rejected: ${src.slice(0,30)}`);
}
for(const src of ['data:image/svg+xml,<svg/>','javascript:alert(1)','https://example.com/x.png','data:text/html,x']){
  if(isSafeImageDataUrl(src))fail(`Unsafe image source was accepted: ${src}`);
}

const html=fs.readFileSync('preview.html','utf8');
if(!html.includes('accept="image/png,image/jpeg,image/webp,image/gif,image/avif"'))fail('Image picker accept policy is not restricted to raster formats.');
const images=fs.readFileSync('src/objects/images.js','utf8');
const storage=fs.readFileSync('src/core/storage.js','utf8');
if(!images.includes("from '../core/image-format.js'"))fail('Image object module must reuse core image policy.');
if(!storage.includes("from './image-format.js'"))fail('Storage must reuse core image policy.');

if(errors.length){
  console.error(`TeacherBoard image policy: FAIL (${errors.length})`);
  errors.forEach(error=>console.error(`- ${error}`));
  process.exit(1);
}
console.log('TeacherBoard image policy: OK (safe raster formats only)');
