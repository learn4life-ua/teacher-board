import { MAX_PAGES, MAX_INSTRUMENTS_PER_PAGE } from '../core/content-limits.js';
import { showNotice } from './notices.js';

function stopWithNotice(event,message){
  event.preventDefault();
  event.stopImmediatePropagation();
  showNotice(message,{type:'error',duration:4200});
}

for(const selector of ['#addPageBtn','#duplicatePageBtn']){
  document.querySelector(selector)?.addEventListener('click',event=>{
    if(document.querySelectorAll('.page-tab').length>=MAX_PAGES){
      stopWithNotice(event,`Досягнуто ліміт: ${MAX_PAGES} сторінок у дошці.`);
    }
  },true);
}

document.querySelectorAll('.instrument-btn').forEach(button=>{
  button.addEventListener('click',event=>{
    if(document.querySelectorAll('#instrumentLayer .geometry-tool').length>=MAX_INSTRUMENTS_PER_PAGE){
      stopWithNotice(event,`На сторінці вже ${MAX_INSTRUMENTS_PER_PAGE} геометричних інструментів.`);
    }
  },true);
});

window.addEventListener('teacherboard:capacity-limit',event=>{
  const kind=event.detail?.kind;
  const message=kind==='objects'
    ? 'На цій сторінці досягнуто безпечний ліміт об’єктів.'
    : 'Досягнуто безпечний ліміт елементів дошки.';
  showNotice(message,{type:'error',duration:4200});
});
