export function openDialog(dialog){
  if(!dialog)return false;
  if(typeof dialog.showModal==='function'){
    if(!dialog.open)dialog.showModal();
  }else{
    dialog.setAttribute('open','');
  }
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
