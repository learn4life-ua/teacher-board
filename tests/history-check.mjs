import process from 'node:process';
import { createState, createBlankPage, activePage } from '../src/core/state.js';
import { pushHistory, undo, redo, resetHistory, MAX_HISTORY_SNAPSHOTS, MAX_HISTORY_CHARS } from '../src/core/history.js';

const errors=[];
const fail=message=>errors.push(message);

const state=createState();
const page=activePage(state);
page.strokes.push({id:'s1',tool:'pen',points:[{x:1,y:2},{x:3,y:4}]});
page.objects.push({id:'o1',kind:'shape',shape:'rect',x:10,y:20,w:100,h:80});
page.instruments.push({id:'r1',type:'ruler',x:30,y:40,w:520,h:96});
pushHistory(state);
page.strokes=[];
page.objects=[];
page.instruments=[];

if(!undo(state)) fail('Undo must succeed after clear snapshot.');
const restored=activePage(state);
if(restored.strokes.length!==1||restored.strokes[0].id!=='s1') fail('Undo did not restore strokes.');
if(restored.objects.length!==1||restored.objects[0].id!=='o1') fail('Undo did not restore objects.');
if(restored.instruments.length!==1||restored.instruments[0].id!=='r1') fail('Undo did not restore instruments.');
if(!redo(state)) fail('Redo must succeed after undo.');
const cleared=activePage(state);
if(cleared.strokes.length||cleared.objects.length||cleared.instruments.length) fail('Redo did not restore cleared page state.');

state.pages.push(createBlankPage('Сторінка 2'));
state.activePage=1;
activePage(state).objects.push({id:'page2',kind:'text',text:'B'});
resetHistory(state);
pushHistory(state);
activePage(state).objects.push({id:'page2-extra',kind:'text',text:'C'});
undo(state);
if(activePage(state).objects.length!==1||activePage(state).objects[0].id!=='page2') fail('Page 2 undo restored the wrong snapshot.');
state.activePage=0;
if(activePage(state).id===state.pages[1].id) fail('Page identities were mixed by history.');

resetHistory(state);
for(let i=0;i<60;i++) pushHistory(state);
if(state.history.undo.length!==MAX_HISTORY_SNAPSHOTS) fail(`Undo history limit must be ${MAX_HISTORY_SNAPSHOTS}, got ${state.history.undo.length}.`);

// Image-heavy pages can make every JSON snapshot several megabytes. The stack
// must adapt to its total character budget instead of blindly keeping 50 copies.
resetHistory(state);
state.activePage=0;
activePage(state).objects=[{id:'heavy',kind:'text',text:'x'.repeat(4_000_000),x:0,y:0,w:100,h:50}];
for(let i=0;i<5;i++) pushHistory(state);
const historyChars=state.history.undo.reduce((sum,item)=>sum+item.length,0);
if(state.history.undo.length<1) fail('Heavy history must preserve at least one undo snapshot.');
if(state.history.undo.length>=5) fail('Heavy history did not trim old snapshots.');
if(state.history.undo.length>1&&historyChars>MAX_HISTORY_CHARS) fail(`Heavy history exceeded memory budget: ${historyChars} chars.`);

if(errors.length){
  console.error(`TeacherBoard history check: FAIL (${errors.length})`);
  errors.forEach(error=>console.error(`- ${error}`));
  process.exit(1);
}
console.log('TeacherBoard history check: OK (clear/undo/redo/page isolation/count + memory budget)');
