import { renderSceneCanvas, safeExportName } from './export-png.js';

const PAGE_W=800;
const PAGE_H=450;
const encoder=new TextEncoder();
const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

function concatChunks(chunks,total){
  const out=new Uint8Array(total);let offset=0;
  for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.length;}
  return out;
}

function buildPdf(images){
  if(!images.length)throw new Error('Немає сторінок для PDF');
  const chunks=[];const offsets=[0];let length=0;
  const pushBytes=bytes=>{chunks.push(bytes);length+=bytes.length;};
  const pushText=text=>pushBytes(encoder.encode(text));
  const objectCount=2+images.length*3;
  const pageRefs=images.map((_,i)=>`${3+i*3} 0 R`).join(' ');
  const beginObject=n=>{offsets[n]=length;pushText(`${n} 0 obj\n`);};
  const endObject=()=>pushText('endobj\n');

  pushText('%PDF-1.4\n%TeacherBoard\n');
  beginObject(1);pushText('<< /Type /Catalog /Pages 2 0 R >>\n');endObject();
  beginObject(2);pushText(`<< /Type /Pages /Count ${images.length} /Kids [${pageRefs}] >>\n`);endObject();

  images.forEach((image,i)=>{
    const pageObj=3+i*3,imageObj=pageObj+1,contentObj=pageObj+2,imageName=`Im${i+1}`;
    beginObject(pageObj);
    pushText(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /XObject << /${imageName} ${imageObj} 0 R >> >> /Contents ${contentObj} 0 R >>\n`);
    endObject();

    beginObject(imageObj);
    pushText(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`);
    pushBytes(image.bytes);pushText('\nendstream\n');endObject();

    const content=`q\n${PAGE_W} 0 0 ${PAGE_H} 0 0 cm\n/${imageName} Do\nQ\n`;
    const contentBytes=encoder.encode(content);
    beginObject(contentObj);pushText(`<< /Length ${contentBytes.length} >>\nstream\n`);pushBytes(contentBytes);pushText('endstream\n');endObject();
  });

  const xrefOffset=length;
  pushText(`xref\n0 ${objectCount+1}\n0000000000 65535 f \n`);
  for(let i=1;i<=objectCount;i++)pushText(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);
  pushText(`trailer\n<< /Size ${objectCount+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return new Blob([concatChunks(chunks,length)],{type:'application/pdf'});
}

async function canvasToJpeg(canvas){
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.9));
  if(!blob)throw new Error('Не вдалося підготувати сторінку PDF');
  return {width:canvas.width,height:canvas.height,bytes:new Uint8Array(await blob.arrayBuffer())};
}

export async function exportAllPagesPdf({state,renderAll,scene,canvas,objectLayer,instrumentLayer,fileName='teacherboard'}){
  if(!state?.pages?.length||typeof renderAll!=='function')throw new Error('Дошка не готова до PDF-експорту');
  const originalPage=state.activePage;
  const originalSelection=state.selection;
  const images=[];
  try{
    state.selection=null;
    for(let i=0;i<state.pages.length;i++){
      state.activePage=i;
      renderAll();
      await nextPaint();
      const pageCanvas=await renderSceneCanvas({scene,canvas,objectLayer,instrumentLayer});
      images.push(await canvasToJpeg(pageCanvas));
    }
  }finally{
    state.activePage=originalPage;
    state.selection=originalSelection;
    renderAll();
  }
  const pdf=buildPdf(images);
  const url=URL.createObjectURL(pdf);
  try{
    const a=document.createElement('a');
    a.download=`${safeExportName(fileName)}.pdf`;
    a.href=url;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }finally{setTimeout(()=>URL.revokeObjectURL(url),1500);}
}
