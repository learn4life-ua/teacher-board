const panel=document.querySelector('#sidePanel');
const scrim=document.querySelector('#panelScrim');
const toggle=document.querySelector('#mobilePanelBtn');

if(panel&&scrim&&toggle){
  // Keep the drawer outside the board/workspace stacking contexts. The
  // scene uses transforms for zoom, so a body-level portal is the most
  // reliable way to keep mobile controls above the canvas on Android.
  document.body.append(scrim,panel);
  panel.style.zIndex='1000';
  scrim.style.zIndex='900';
  scrim.style.pointerEvents='none';

  document.addEventListener('pointerdown',event=>{
    if(!document.body.classList.contains('side-panel-open'))return;
    const target=event.target;
    if(panel.contains(target)||toggle.contains(target))return;
    event.preventDefault();
    event.stopPropagation();
    document.body.classList.remove('side-panel-open');
    scrim.hidden=true;
  },true);
}
