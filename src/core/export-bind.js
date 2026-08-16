import { exportScenePng } from './export-png.js';
import { exportAllPagesPdf } from './export-pdf.js';
import { showNotice } from '../ui/notices.js';

const scene=document.querySelector('#scene');
const canvas=document.querySelector('#drawingCanvas');
const objectLayer=document.querySelector('#objectLayer');
const instrumentLayer=document.querySelector('#instrumentLayer');

const pngButton=document.querySelector('#savePngBtn');
if(pngButton){
  pngButton.addEventListener('click',async()=>{
    const previous=pngButton.textContent;
    pngButton.disabled=true;pngButton.textContent='Експорт…';
    try{
      const active=document.querySelector('.page-tab.active')?.textContent?.replace(/^\d+\.\s*/,'')||'teacherboard';
      await exportScenePng({scene,canvas,objectLayer,instrumentLayer,fileName:active});
      showNotice('PNG поточної сторінки збережено.',{type:'success',duration:2200});
    }catch(error){
      console.error(error);
      showNotice('Не вдалося створити PNG. Спробуйте ще раз або приберіть проблемне зображення з дошки.',{type:'error',duration:5200});
    }finally{pngButton.disabled=false;pngButton.textContent=previous;}
  });
}

const pdfButton=document.querySelector('#savePdfBtn');
if(pdfButton){
  pdfButton.addEventListener('click',async()=>{
    const previous=pdfButton.textContent;
    pdfButton.disabled=true;pdfButton.textContent='PDF…';
    try{
      const board=window.__teacherBoardExport;
      if(!board)throw new Error('TeacherBoard export hook is unavailable');
      const firstName=board.state.pages?.[0]?.name||'teacherboard';
      await exportAllPagesPdf({state:board.state,renderAll:board.renderAll,scene,canvas,objectLayer,instrumentLayer,fileName:`TeacherBoard — ${firstName}`});
      showNotice(`PDF збережено: ${board.state.pages.length} стор.`,{type:'success',duration:2600});
    }catch(error){
      console.error(error);
      showNotice('Не вдалося створити PDF. Спробуйте ще раз або приберіть проблемне зображення з дошки.',{type:'error',duration:5200});
    }finally{pdfButton.disabled=false;pdfButton.textContent=previous;}
  });
}
