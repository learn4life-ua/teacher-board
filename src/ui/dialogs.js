export function confirmDialog(dialog,{title='Підтвердження',message='',confirmText='Підтвердити',danger=false}={}){
  if(!dialog)return Promise.resolve(false);
  const titleEl=dialog.querySelector('[data-dialog-title]');
  const messageEl=dialog.querySelector('[data-dialog-message]');
  const form=dialog.querySelector('form');
  const cancelBtn=dialog.querySelector('[data-dialog-cancel]');
  const confirmBtn=dialog.querySelector('[data-dialog-confirm]');
  if(!form||!cancelBtn||!confirmBtn)return Promise.resolve(false);
  if(titleEl)titleEl.textContent=title;
  if(messageEl)messageEl.textContent=message;
  confirmBtn.textContent=confirmText;
  confirmBtn.classList.toggle('danger',Boolean(danger));

  return new Promise(resolve=>{
    let settled=false;
    const cleanup=()=>{
      form.removeEventListener('submit',onSubmit);
      cancelBtn.removeEventListener('click',onCancelClick);
      dialog.removeEventListener('cancel',onCancelEvent);
      dialog.removeEventListener('close',onUnexpectedClose);
    };
    const finish=(value,returnValue)=>{
      if(settled)return;
      settled=true;
      cleanup();
      if(dialog.open)dialog.close?.(returnValue);
      else dialog.removeAttribute('open');
      resolve(value);
    };
    const onSubmit=e=>{e.preventDefault();finish(true,'confirm');};
    const onCancelClick=e=>{e.preventDefault();finish(false,'cancel');};
    const onCancelEvent=e=>{e.preventDefault();finish(false,'cancel');};
    const onUnexpectedClose=()=>{if(!settled){settled=true;cleanup();resolve(false);}};
    form.addEventListener('submit',onSubmit);
    cancelBtn.addEventListener('click',onCancelClick);
    dialog.addEventListener('cancel',onCancelEvent);
    dialog.addEventListener('close',onUnexpectedClose);
    if(typeof dialog.showModal==='function'&&!dialog.open)dialog.showModal();
    else dialog.setAttribute('open','');
    requestAnimationFrame(()=>confirmBtn.focus());
  });
}
