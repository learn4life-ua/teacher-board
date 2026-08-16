const button=document.querySelector('#laserBtn');
const scene=document.querySelector('#scene');
const dot=document.querySelector('#laserDot');

if(button&&scene&&dot){
  Object.assign(dot.style,{position:'absolute',width:'20px',height:'20px',borderRadius:'50%',background:'#ff2b2b',boxShadow:'0 0 0 6px rgba(255,43,43,.18)',transform:'translate(-50%,-50%)',pointerEvents:'none',zIndex:'120'});
  let active=false;
  let pressed=false;
  let activePointerId=null;
  let hideTimer=null;
  let previousToolButton=null;

  const hideDot=()=>{
    if(hideTimer)clearTimeout(hideTimer);
    hideTimer=null;
    dot.hidden=true;
  };

  const restorePreviousTool=()=>{
    if(previousToolButton?.isConnected&&!document.querySelector('.tool.active:not(#laserBtn)'))previousToolButton.classList.add('active');
    previousToolButton=null;
  };

  const setActive=value=>{
    const next=Boolean(value);
    if(next===active)return;
    if(next){
      previousToolButton=document.querySelector('.tool.active:not(#laserBtn)');
      document.querySelectorAll('.tool').forEach(control=>control.classList.remove('active'));
    }
    active=next;
    pressed=false;
    activePointerId=null;
    button.classList.toggle('active',active);
    hideDot();
    document.body.classList.toggle('laser-active',active);
    if(!active)restorePreviousTool();
  };

  const pointFromEvent=e=>{
    const rect=scene.getBoundingClientRect();
    const sx=1600/rect.width,sy=900/rect.height;
    return{
      x:Math.max(0,Math.min(1600,(e.clientX-rect.left)*sx)),
      y:Math.max(0,Math.min(900,(e.clientY-rect.top)*sy))
    };
  };

  const move=e=>{
    if(!active||!pressed)return;
    if(activePointerId!==null&&e.pointerId!==undefined&&e.pointerId!==activePointerId)return;
    const p=pointFromEvent(e);
    dot.style.left=`${p.x}px`;
    dot.style.top=`${p.y}px`;
    dot.hidden=false;
  };

  const finish=e=>{
    if(!active||!pressed)return;
    if(activePointerId!==null&&e?.pointerId!==undefined&&e.pointerId!==activePointerId)return;
    e?.preventDefault?.();
    pressed=false;
    activePointerId=null;
    if(hideTimer)clearTimeout(hideTimer);
    hideTimer=setTimeout(()=>{dot.hidden=true;hideTimer=null;},180);
  };

  button.addEventListener('click',()=>setActive(!active));

  // If another module changes the toolbar state (for example after adding a graph
  // from the side panel), keep the internal laser state synchronized with it.
  new MutationObserver(()=>{
    if(active&&!button.classList.contains('active'))setActive(false);
  }).observe(button,{attributes:true,attributeFilter:['class']});

  // Laser is an exclusive presentation tool. Choosing any normal board tool or
  // geometry instrument must release it before that control handles the click.
  document.addEventListener('click',e=>{
    if(!active)return;
    const control=e.target.closest?.('.tool,.instrument-btn');
    if(!control||control===button)return;
    setActive(false);
  },true);

  scene.addEventListener('pointerdown',e=>{
    if(!active)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    pressed=true;
    activePointerId=e.pointerId??null;
    move(e);
  },true);

  // Track the active gesture globally instead of relying on pointer capture.
  window.addEventListener('pointermove',e=>{
    if(!active||!pressed)return;
    e.preventDefault();
    move(e);
  },{capture:true,passive:false});
  window.addEventListener('pointerup',finish,{capture:true,passive:false});
  window.addEventListener('pointercancel',finish,{capture:true,passive:false});
  window.addEventListener('blur',()=>{if(pressed){pressed=false;activePointerId=null;hideDot();}});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&active)setActive(false);});
}
