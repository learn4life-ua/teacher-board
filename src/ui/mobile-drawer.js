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
  const visual=()=>window.visualViewport;
  let lockedScrollY=0;

  const lockPage=()=>{
    if(document.body.dataset.tbScrollLocked==='1')return;
    lockedScrollY=window.scrollY||0;
    document.body.dataset.tbScrollLocked='1';
    Object.assign(document.documentElement.style,{overflow:'hidden',overscrollBehavior:'none'});
    Object.assign(document.body.style,{overflow:'hidden',overscrollBehavior:'none',position:'fixed',top:`-${lockedScrollY}px`,left:'0',right:'0',width:'100%'});
  };
  const unlockPage=()=>{
    if(document.body.dataset.tbScrollLocked!=='1')return;
    delete document.body.dataset.tbScrollLocked;
    ['overflow','overscroll-behavior'].forEach(p=>document.documentElement.style.removeProperty(p));
    ['overflow','overscroll-behavior','position','top','left','right','width'].forEach(p=>document.body.style.removeProperty(p));
    window.scrollTo(0,lockedScrollY);
  };

  const fitVisualViewport=()=>{
    if(!media.matches||panel.parentNode!==document.body)return;
    const vv=visual();
    const top=vv?.offsetTop||0;
    const height=vv?.height||window.innerHeight;
    const width=vv?.width||window.innerWidth;
    panel.style.top=`${top}px`;
    panel.style.bottom='auto';
    panel.style.height=`${height}px`;
    panel.style.maxHeight=`${height}px`;
    panel.style.width=`${Math.min(width*.88,340)}px`;
  };

  const sync=()=>{
    if(!media.matches){
      unlockPage();
      if(panel.parentNode!==panelHome.parentNode)panelHome.parentNode.insertBefore(panel,panelHome.nextSibling);
      if(scrim.parentNode!==scrimHome.parentNode)scrimHome.parentNode.insertBefore(scrim,scrimHome.nextSibling);
      clearInline(panel,['position','right','top','bottom','width','max-width','height','max-height','display','overflow-y','z-index','background','pointer-events','visibility','transform']);
      clearInline(scrim,['position','inset','z-index','pointer-events']);
      scrim.hidden=true;
      document.body.classList.remove('side-panel-open');
      return;
    }

    if(panel.parentNode!==document.body)document.body.append(scrim,panel);
    Object.assign(scrim.style,{position:'fixed',inset:'0',zIndex:'2147483000',pointerEvents:'none'});
    Object.assign(panel.style,{position:'fixed',right:'0',maxWidth:'340px',display:'block',overflowY:'auto',overscrollBehavior:'contain',zIndex:'2147483640',background:'#fff'});

    const open=document.body.classList.contains('side-panel-open');
    if(open)lockPage();else unlockPage();
    fitVisualViewport();
    panel.style.pointerEvents=open?'auto':'none';
    panel.style.visibility=open?'visible':'hidden';
    panel.style.transform=open?'translateX(0)':'translateX(105%)';
    scrim.hidden=!open;
  };

  sync();
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
  media.addEventListener?.('change',sync);
  visual()?.addEventListener('resize',fitVisualViewport,{passive:true});
  visual()?.addEventListener('scroll',fitVisualViewport,{passive:true});

  document.addEventListener('focusin',event=>{
    if(media.matches&&panel.contains(event.target))requestAnimationFrame(fitVisualViewport);
  });

  document.addEventListener('pointerdown',event=>{
    if(!media.matches||!document.body.classList.contains('side-panel-open'))return;
    const target=event.target;
    if(panel.contains(target)||toggle.contains(target))return;
    event.preventDefault();
    event.stopPropagation();
    document.body.classList.remove('side-panel-open');
  },true);
}
