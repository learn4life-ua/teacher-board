const STORAGE_KEY='teacherboard.ui.sidePanelCollapsed';
const button=document.querySelector('#desktopPanelToggleBtn');

function setCollapsed(collapsed,{persist=true}={}){
  document.body.classList.toggle('side-panel-collapsed',collapsed);
  if(button){
    button.setAttribute('aria-pressed',collapsed?'true':'false');
    button.textContent=collapsed?'▣ Показати панель':'▤ Сховати панель';
    button.title=collapsed?'Показати математичну панель':'Сховати математичну панель';
  }
  if(persist){
    try{localStorage.setItem(STORAGE_KEY,collapsed?'1':'0');}catch{}
  }
}

if(button){
  let collapsed=false;
  try{collapsed=localStorage.getItem(STORAGE_KEY)==='1';}catch{}
  setCollapsed(collapsed,{persist:false});
  button.addEventListener('click',()=>setCollapsed(!document.body.classList.contains('side-panel-collapsed')));

  document.querySelector('#textBtn')?.addEventListener('click',()=>setCollapsed(false));
  document.querySelector('#objectLayer')?.addEventListener('objectedit',()=>setCollapsed(false));
}
