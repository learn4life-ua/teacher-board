import fs from 'node:fs';
import process from 'node:process';

const errors=[];
const fail=message=>errors.push(message);
const read=path=>fs.readFileSync(path,'utf8');

const storage=read('src/core/storage.js');
if(!storage.includes('let lastSavedRaw = null'))fail('Storage autosave dedupe cache is missing.');
if(!storage.includes('if(raw===lastSavedRaw)return true'))fail('Identical autosave writes are not deduplicated.');
if(!storage.includes('lastSavedRaw=raw'))fail('Successful autosave does not refresh the dedupe cache.');

const touch=read('css/touch.css');
if(!/\.app-shell\s*\{[^}]*height\s*:\s*100dvh/s.test(touch))fail('Dynamic viewport height override is missing.');

const smoke=read('tests/browser-smoke.mjs');
if(smoke.includes("page.once('dialog'"))fail('Browser Smoke still depends on legacy browser dialogs.');
if(smoke.includes("'120%'"))fail('Browser Smoke still expects obsolete 10% zoom steps.');
if(!smoke.includes("'150%'"))fail('Browser Smoke does not verify the 25% zoom contract.');
if(!smoke.includes("page.fill('#graphStep','0.5')"))fail('Browser Smoke does not verify custom graph scale step 0.5.');
if(!smoke.includes("#renamePageDialog")||!smoke.includes("#confirmActionDialog"))fail('Browser Smoke does not exercise custom page dialogs.');
if(!smoke.includes("runStartupToolRecoveryCase"))fail('Browser Smoke does not verify Select-on-startup recovery.');

if(errors.length){
  console.error(`TeacherBoard release contract: FAIL (${errors.length})`);
  errors.forEach(error=>console.error(`- ${error}`));
  process.exit(1);
}
console.log('TeacherBoard release contract: OK (autosave dedupe, dynamic viewport, current browser smoke expectations)');
