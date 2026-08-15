const button=document.querySelector('#laserBtn');
const scene=document.querySelector('#scene');
const dot=document.querySelector('#laserDot');

if(button&&scene&&dot){
  Object.assign(dot.style,{position:'absolute',width:'20px',height:'20px',borderRadius:'50%',background:'#ff2b2b',boxShadow:'0 0 0 6px rgba(255,43,43,.18)',transform:'translate(-50%,-50%)',pointerEvents:'none',zIndex:'120'});
  let active=false;
  let pressed=false;
  let activePointerId=null;
  let hideTimer=null;

  const hideDot=()=>{
    if(hideTimer)clearTimeout(hideTimer);
    hideTimer=null;
    dot.hidden=true;
  };

  const setActive=value=>{
    active=Boolean(value);
    pressed=false;
    activePointerId=null;
    button.classList.toggle('active',active);
    hideDot();
    document.body.classList.toggle('laser-active',active);
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
  scene.addEventListener('pointerdown',e=>{
    if(!active)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    pressed=true;
    activePointerId=e.pointerId??null;
    move(e);
  },true);

  // Track the active gesture globally instead of relying on pointer capture.
  // This keeps the laser responsive when the pointer/finger leaves the board,
  // and avoids browser-specific capture issues on touch devices.
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
