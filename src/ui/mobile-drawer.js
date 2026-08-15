const panel=document.querySelector('#sidePanel');
const scrim=document.querySelector('#panelScrim');
const toggle=document.querySelector('#mobilePanelBtn');

if(panel&&scrim&&toggle){
  const media=window.matchMedia('(max-width: 900px)');
  const panelHome=document.createComment('teacherboard-side-panel-home');
  const scrimHome=document.createComment('teacherboard-panel-scrim-home');
  panel.parentNode.insertBefore(panelHome,panel);
  scrim.parentNode.insertBefore(scrimHome,scrim);

  const clearInline=(el,props)=>props.forEach(prop=>el.style.removeProperty(prop));

  const sync=()=>{
    if(!media.matches){
      if(panel.parentNode!==panelHome.parentNode)panelHome.parentNode.insertBefore(panel,panelHome.nextSibling);
      if(scrim.parentNode!==scrimHome.parentNode)scrimHome.parentNode.insertBefore(scrim,scrimHome.nextSibling);
      clearInline(panel,['position','right','top','bottom','width','max-width','height','display','overflow-y','z-index','background','pointer-events','visibility','transform']);
      clearInline(scrim,['position','inset','z-index','pointer-events']);
      scrim.hidden=true;
      document.body.classList.remove('side-panel-open');
      return;
    }

    if(panel.parentNode!==document.body)document.body.append(scrim,panel);
    Object.assign(scrim.style,{position:'fixed',inset:'0',zIndex:'2147483000',pointerEvents:'none'});
    Object.assign(panel.style,{position:'fixed',right:'0',top:'0',bottom:'0',width:'min(88vw,340px)',maxWidth:'340px',height:'100dvh',display:'block',overflowY:'auto',zIndex:'2147483640',background:'#fff'});

    const open=document.body.classList.contains('side-panel-open');
    panel.style.pointerEvents=open?'auto':'none';
    panel.style.visibility=open?'visible':'hidden';
    panel.style.transform=open?'translateX(0)':'translateX(105%)';
    scrim.hidden=!open;
  };

  sync();
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
  media.addEventListener?.('change',sync);

  document.addEventListener('pointerdown',event=>{
    if(!media.matches||!document.body.classList.contains('side-panel-open'))return;
    const target=event.target;
    if(panel.contains(target)||toggle.contains(target))return;
    event.preventDefault();
    event.stopPropagation();
    document.body.classList.remove('side-panel-open');
  },true);
}
