const panel=document.querySelector('#sidePanel');
const scrim=document.querySelector('#panelScrim');
const toggle=document.querySelector('#mobilePanelBtn');

if(panel&&scrim&&toggle){
  document.body.append(scrim,panel);

  Object.assign(scrim.style,{position:'fixed',inset:'0',zIndex:'2147483000',pointerEvents:'none'});
  Object.assign(panel.style,{position:'fixed',right:'0',top:'0',bottom:'0',width:'min(88vw,340px)',maxWidth:'340px',height:'100dvh',display:'block',overflowY:'auto',zIndex:'2147483640',background:'#fff',pointerEvents:'none',visibility:'hidden',transform:'translateX(105%)'});

  const sync=()=>{
    const open=document.body.classList.contains('side-panel-open');
    panel.style.pointerEvents=open?'auto':'none';
    panel.style.visibility=open?'visible':'hidden';
    panel.style.transform=open?'translateX(0)':'translateX(105%)';
    scrim.hidden=!open;
  };
  sync();
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});

  document.addEventListener('pointerdown',event=>{
    if(!document.body.classList.contains('side-panel-open'))return;
    const target=event.target;
    if(panel.contains(target)||toggle.contains(target))return;
    event.preventDefault();
    event.stopPropagation();
    document.body.classList.remove('side-panel-open');
  },true);
}
