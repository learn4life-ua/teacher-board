import { exportScenePng } from './export-png.js';

const button=document.querySelector('#savePngBtn');
if(button){
  button.addEventListener('click',async()=>{
    const previous=button.textContent;
    button.disabled=true;button.textContent='Експорт…';
    try{
      const active=document.querySelector('.page-tab.active')?.textContent?.replace(/^\d+\.\s*/,'')||'teacherboard';
      await exportScenePng({scene:document.querySelector('#scene'),canvas:document.querySelector('#drawingCanvas'),objectLayer:document.querySelector('#objectLayer'),instrumentLayer:document.querySelector('#instrumentLayer'),fileName:active});
    }catch(error){
      console.error(error);
      alert('Не вдалося створити PNG. Спробуйте ще раз або приберіть зовнішнє зображення з дошки.');
    }finally{button.disabled=false;button.textContent=previous;}
  });
}
