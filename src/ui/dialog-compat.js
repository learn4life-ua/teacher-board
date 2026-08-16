function dialogPrototype(){
  if(typeof HTMLDialogElement!=='undefined')return HTMLDialogElement.prototype;
  if(typeof HTMLElement!=='undefined')return HTMLElement.prototype;
  return null;
}

export function ensureDialogCompatibility(){
  const proto=dialogPrototype();
  if(!proto)return;
  if(typeof proto.showModal!=='function'){
    Object.defineProperty(proto,'showModal',{configurable:true,writable:true,value:function(){this.setAttribute?.('open','');}});
  }
  if(typeof proto.close!=='function'){
    Object.defineProperty(proto,'close',{configurable:true,writable:true,value:function(returnValue=''){
      this.returnValue=String(returnValue||'');
      this.removeAttribute?.('open');
      try{this.dispatchEvent?.(new Event('close'));}catch{}
    }});
  }
}

export function openDialog(dialog){
  if(!dialog)return false;
  if(typeof dialog.showModal==='function'){
    if(!dialog.open)dialog.showModal();
  }else dialog.setAttribute('open','');
  return true;
}

export function closeDialog(dialog,returnValue=''){
  if(!dialog)return false;
  if(typeof dialog.close==='function')dialog.close(returnValue);
  else{
    dialog.returnValue=String(returnValue||'');
    dialog.removeAttribute('open');
    try{dialog.dispatchEvent(new Event('close'));}catch{}
  }
  return true;
}

ensureDialogCompatibility();
