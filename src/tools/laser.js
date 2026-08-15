const button=document.querySelector('#laserBtn');
const scene=document.querySelector('#scene');
const dot=document.querySelector('#laserDot');

if(button&&scene&&dot){
  Object.assign(dot.style,{position:'absolute',width:'20px',height:'20px',borderRadius:'50%',background:'#ff2b2b',boxShadow:'0 0 0 6px rgba(255,43,43,.18),transform:'translate(-50%,-50%)',pointerEvents:'none',zIndex:'120'});
  let active=false;
  let pressed=false;
  const setActive=value=>{
    active=Boolean(value);
    pressed=false;
    button.classList.toggle('active',active);
    dot.hidden=true;
    document.body.classList.toggle('laser-active',active);
  };
  const move=e=>{
    if(!active||!pressed)return;
    const rect=scene.getBoundingClientRect();
    const sx=1600/rect.width,sy=900/rect.height;
    const x=(e.clientX-rect.left)*sx,y=(e.clientY-rect.top)*sy;
    dot.style.left=`${x}px`;dot.style.top=`${y}px`;dot.hidden=false;
  };
  button.addEventListener('click',()=>setActive(!active));
  scene.addEventListener('pointerdown',e=>{if(!active)return;e.preventDefault();e.stopImmediatePropagation();pressed=true;scene.setPointerCapture?.(e.pointerId);move(e);},true);
  scene.addEventListener('pointermove',e=>{if(!active)return;if(pressed){e.preventDefault();e.stopImmediatePropagation();move(e);}},true);
  const finish=e=>{if(!active)return;if(pressed){e?.preventDefault?.();e?.stopImmediatePropagation?.();}pressed=false;setTimeout(()=>{dot.hidden=true;},180);};
  scene.addEventListener('pointerup',finish,true);
  scene.addEventListener('pointercancel',finish,true);
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&active)setActive(false);});
}
