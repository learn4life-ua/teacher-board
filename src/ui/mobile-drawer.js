const panel=document.querySelector('#sidePanel');
const scrim=document.querySelector('#panelScrim');
const toggle=document.querySelector('#mobilePanelBtn');

if(panel&&scrim&&toggle){
  // Scrim is visual only. Outside taps are handled in capture phase so
  // the overlay can never block controls inside the drawer on mobile.
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
