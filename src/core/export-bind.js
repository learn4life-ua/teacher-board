import { exportScenePng } from './export-png.js';
import { showNotice } from '../ui/notices.js';

const button=document.querySelector('#savePngBtn');
if(button){
  button.addEventListener('click',async()=>{
    const previous=button.textContent;
    button.disabled=true;button.textContent='Експорт…';
    try{
      const active=document.querySelector('.page-tab.active')?.textContent?.replace(/^\d+\.\s*/,'')||'teacherboard';
      await exportScenePng({scene:document.querySelector('#scene'),canvas:document.querySelector('#drawingCanvas'),objectLayer:document.querySelector('#objectLayer'),instrumentLayer:document.querySelector('#instrumentLayer'),fileName:active});
      showNotice('PNG збережено.',{type:'success',duration:2200});
    }catch(error){
      console.error(error);
      showNotice('Не вдалося створити PNG. Спробуйте ще раз або приберіть проблемне зображення з дошки.',{type:'error',duration:5200});
    }finally{button.disabled=false;button.textContent=previous;}
  });
}
