import fs from 'node:fs';
import process from 'node:process';
import { createState } from '../src/core/state.js';
import { MAX_TEXT_LENGTH,MAX_GRAPH_EXPRESSION_LENGTH,limitText } from '../src/core/content-limits.js';
import { evaluateExpression,createGraphObject } from '../src/math/graph.js';

const errors=[];
const fail=message=>errors.push(message);

if(limitText('a'.repeat(MAX_TEXT_LENGTH+5),MAX_TEXT_LENGTH).length!==MAX_TEXT_LENGTH)fail('limitText did not clamp text length.');
const graph=createGraphObject(createState(),'x'.repeat(MAX_GRAPH_EXPRESSION_LENGTH+20));
if(graph.expression.length!==MAX_GRAPH_EXPRESSION_LENGTH)fail('createGraphObject did not clamp expression length.');
let rejected=false;
try{evaluateExpression('x'.repeat(MAX_GRAPH_EXPRESSION_LENGTH+1),1);}catch{rejected=true;}
if(!rejected)fail('Graph parser must reject overlong expressions before tokenization.');

const html=fs.readFileSync('preview.html','utf8');
if(!new RegExp(`id="textValue"[^>]*maxlength="${MAX_TEXT_LENGTH}"`).test(html))fail('Text textarea maxlength is missing or out of sync.');
if(!new RegExp(`id="graphExpression"[^>]*maxlength="${MAX_GRAPH_EXPRESSION_LENGTH}"`).test(html))fail('Graph input maxlength is missing or out of sync.');
if(!html.includes('src/ui/input-limits.js'))fail('Input limit UI module is not loaded by preview.html.');

const manager=fs.readFileSync('src/objects/object-manager.js','utf8');
const storage=fs.readFileSync('src/core/storage.js','utf8');
const ui=fs.readFileSync('src/ui/input-limits.js','utf8');
for(const [name,source] of [['ObjectManager',manager],['Storage',storage],['Input UI',ui]]){
  if(!source.includes('MAX_TEXT_LENGTH')||!source.includes('MAX_GRAPH_EXPRESSION_LENGTH'))fail(`${name} is not using shared content limits.`);
}

if(errors.length){
  console.error(`TeacherBoard content limits: FAIL (${errors.length})`);
  errors.forEach(error=>console.error(`- ${error}`));
  process.exit(1);
}
console.log('TeacherBoard content limits: OK (UI, parser, objects and storage share the same limits)');
