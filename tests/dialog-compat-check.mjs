import fs from 'node:fs';
import process from 'node:process';

const errors=[];
const fail=message=>errors.push(message);
const dialogs=fs.readFileSync('src/ui/dialogs.js','utf8');
const compat=fs.readFileSync('src/ui/dialog-compat.js','utf8');

if(!dialogs.includes("import './dialog-compat.js'"))fail('dialogs.js must load the dialog compatibility layer before app dialogs are used.');
for(const token of ['ensureDialogCompatibility','showModal','close','returnValue','removeAttribute','dispatchEvent']){
  if(!compat.includes(token))fail(`dialog-compat.js is missing ${token}.`);
}
if(!/typeof\s+proto\.showModal\s*!==\s*['"]function['"]/.test(compat))fail('showModal fallback guard is missing.');
if(!/typeof\s+proto\.close\s*!==\s*['"]function['"]/.test(compat))fail('close fallback guard is missing.');
if(!/new Event\(['"]close['"]\)/.test(compat))fail('Fallback close() must dispatch a close event for rename/confirm cleanup.');

if(errors.length){
  console.error(`TeacherBoard dialog compatibility check: FAIL (${errors.length})`);
  errors.forEach(error=>console.error(`- ${error}`));
  process.exit(1);
}
console.log('TeacherBoard dialog compatibility check: OK (showModal/close fallback contract)');
