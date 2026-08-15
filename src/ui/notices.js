let timer=null;

export function showNotice(message,{type='info',duration=3600}={}){
  const el=document.querySelector('#statusToast');
  if(!el)return;
  if(timer){clearTimeout(timer);timer=null;}
  el.textContent=String(message||'');
  el.dataset.type=type;
  el.hidden=false;
  requestAnimationFrame(()=>el.classList.add('show'));
  timer=setTimeout(()=>{
    el.classList.remove('show');
    timer=setTimeout(()=>{el.hidden=true;timer=null;},180);
  },Math.max(1200,Number(duration)||3600));
}
