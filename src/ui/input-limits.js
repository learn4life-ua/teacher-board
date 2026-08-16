import { showNotice } from './notices.js';
import { MAX_TEXT_LENGTH, MAX_GRAPH_EXPRESSION_LENGTH } from '../core/content-limits.js';

function bindLimit(selector,max,label){
  const input=document.querySelector(selector);
  if(!input)return;
  input.maxLength=max;
  input.addEventListener('input',()=>{
    if(input.value.length<=max)return;
    const start=Math.min(input.selectionStart??max,max);
    input.value=input.value.slice(0,max);
    input.setSelectionRange?.(start,start);
    showNotice(`${label}: максимум ${max.toLocaleString('uk-UA')} символів.`,{type:'error',duration:3600});
  });
}

bindLimit('#textValue',MAX_TEXT_LENGTH,'Текст скорочено');
bindLimit('#graphExpression',MAX_GRAPH_EXPRESSION_LENGTH,'Формулу скорочено');
