export function createImageEditor({frame,supabase,onChange,onMessage}){
  const $=id=>document.getElementById(id);
  const dialog=$('imageDialog');
  const canvas=$('cropCanvas');
  const context=canvas.getContext('2d');
  let image=null;
  let selected=null;
  let savedRange=null;
  let offsetX=0;
  let offsetY=0;
  let drawInfo=null;

  function setMessage(text,error=false){
    $('imageMessage').textContent=text;
    $('imageMessage').classList.toggle('error',error);
  }

  function setSelection(node){
    selected=node;
    const isImage=node?.tagName==='IMG';
    $('editImage').disabled=!isImage;
    $('imageUploadButton').textContent=isImage?'更換選取圖片':'上傳圖片';
    frame.contentDocument.querySelectorAll('[data-admin-selected]').forEach(item=>item.removeAttribute('data-admin-selected'));
    if(node)node.setAttribute('data-admin-selected','');
  }

  function bindFrame(){
    const doc=frame.contentDocument;
    setSelection(null);
    savedRange=null;
    doc.querySelector('main')?.addEventListener('yuanjie:select-image',event=>{
      const img=event.detail?.image;
      if(img?.tagName==='IMG'&&doc.contains(img))setSelection(img);
    });
    if(doc.querySelector('.case-grid')){
      for(const card of doc.querySelectorAll('a.case-card')){
        const target=card.querySelector('img, .case-placeholder');
        if(!target||card.querySelector('[data-admin-card-upload]'))continue;
        const hasImage=target.tagName==='IMG';
        const button=doc.createElement('button');
        button.type='button';
        button.dataset.adminCardUpload='';
        button.textContent=hasImage?'更換照片':'上傳照片';
        button.setAttribute('aria-label',`${hasImage?'更換':'上傳'}${card.querySelector('h2')?.textContent.trim()||'個案'}照片`);
        button.onclick=event=>{
          event.preventDefault();event.stopPropagation();
          setSelection(target);
          $('imageUpload').click();
        };
        card.append(button);
      }
    }
    for(const figure of doc.querySelectorAll('[data-block="cover"] figure.case-main')){
      const img=figure.querySelector('img');
      if(!img||figure.querySelector('[data-admin-card-upload]'))continue;
      const button=doc.createElement('button');
      button.type='button';
      button.dataset.adminCardUpload='';
      button.textContent='更換照片';
      button.setAttribute('aria-label','更換個案封面照片');
      button.onclick=event=>{
        event.preventDefault();event.stopPropagation();
        setSelection(img);
        $('imageUpload').click();
      };
      figure.append(button);
    }
    doc.addEventListener('mouseup',()=>{
      const selection=frame.contentWindow.getSelection();
      if(selection?.rangeCount)savedRange=selection.getRangeAt(0).cloneRange();
    });
    doc.addEventListener('click',event=>{
      const img=event.target.closest?.('img');
      if(img){
        event.preventDefault();
        setSelection(img);
      }
    },true);
  }

  function dimensions(){
    const ratio=$('cropRatio').value==='free'?image.naturalWidth/image.naturalHeight:Number($('cropRatio').value);
    if(ratio>=1){canvas.width=640;canvas.height=Math.round(640/ratio)}
    else {canvas.height=420;canvas.width=Math.round(420*ratio)}
  }

  function render(){
    if(!image)return;
    const zoom=Number($('cropZoom').value);
    const scale=Math.max(canvas.width/image.naturalWidth,canvas.height/image.naturalHeight)*zoom;
    const width=image.naturalWidth*scale,height=image.naturalHeight*scale;
    const x=Math.min(0,Math.max(canvas.width-width,(canvas.width-width)/2+offsetX));
    const y=Math.min(0,Math.max(canvas.height-height,(canvas.height-height)/2+offsetY));
    offsetX=x-(canvas.width-width)/2;
    offsetY=y-(canvas.height-height)/2;
    context.clearRect(0,0,canvas.width,canvas.height);
    context.drawImage(image,x,y,width,height);
    drawInfo={x,y,scale};
  }

  async function loadSource(source){
    const img=new Image();
    img.crossOrigin='anonymous';
    img.src=source;
    await img.decode();
    image=img;
    offsetX=offsetY=0;
    $('cropRatio').value='free';
    $('cropZoom').value='1';
    dimensions();
    render();
  }

  async function open(source,name,existing,showResize=Boolean(existing)){
    image=null;
    context.clearRect(0,0,canvas.width,canvas.height);
    setMessage('');
    $('resizeImage').hidden=!showResize;
    $('imageDialogTitle').textContent=existing?'更換或編輯圖片':'上傳並裁切圖片';
    $('imageAlt').value=existing?.alt||name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ');
    const currentWidth=existing?.style.width?.match(/^(\d+)%$/)?.[1]||'100';
    $('imageWidth').value=currentWidth;
    $('imageWidthValue').textContent=`${currentWidth}%`;
    dialog.showModal();
    try{await loadSource(source)}catch(error){setMessage('圖片無法載入，請選擇其他圖片。',true)}
  }

  function applySize(target){
    if(target.closest('a.case-card')){
      target.style.removeProperty('width');
      target.style.removeProperty('max-width');
      target.style.removeProperty('height');
    }else{
      target.style.width=`${$('imageWidth').value}%`;
      target.style.maxWidth='100%';
      target.style.height='auto';
    }
    target.alt=$('imageAlt').value.trim();
    target.removeAttribute('data-admin-selected');
    onChange(target);
    dialog.close();
    onMessage('圖片大小與說明已更新，請儲存草稿或發布。');
  }

  function insertImage(src,width,height){
    const doc=frame.contentDocument;
    const placeholder=selected?.classList?.contains('case-placeholder')&&doc.contains(selected)?selected:null;
    const target=selected?.tagName==='IMG'&&doc.contains(selected)?selected:doc.createElement('img');
    target.src=src;
    target.width=width;
    target.height=height;
    if(placeholder){
      placeholder.replaceWith(target);
    }else if(!target.isConnected){
      if(savedRange&&doc.contains(savedRange.commonAncestorContainer)){
        savedRange.collapse(false);
        savedRange.insertNode(target);
      }else{
        const paragraph=doc.createElement('p');
        paragraph.append(target);
        doc.querySelector('main').append(paragraph);
      }
    }
    applySize(target);
    setSelection(target);
  }

  $('imageUploadButton').onclick=()=>{
    const selection=frame.contentWindow.getSelection();
    if(selection?.rangeCount)savedRange=selection.getRangeAt(0).cloneRange();
    $('imageUpload').click();
  };
  $('imageUpload').onchange=async event=>{
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
      onMessage('請選擇 JPG、PNG 或 WebP 圖片。',true);return;
    }
    const objectUrl=URL.createObjectURL(file);
    await open(objectUrl,file.name,selected?.tagName==='IMG'?selected:null,false);
    URL.revokeObjectURL(objectUrl);
  };
  $('editImage').onclick=()=>{
    if(!selected)return;
    open(selected.src,selected.alt||'image',selected);
  };
  $('closeImageDialog').onclick=()=>dialog.close();
  $('cropRatio').onchange=()=>{if(image){dimensions();offsetX=offsetY=0;render()}};
  $('cropZoom').oninput=render;
  $('imageWidth').oninput=()=>{$('imageWidthValue').textContent=`${$('imageWidth').value}%`};
  $('resizeImage').onclick=()=>{if(selected)applySize(selected)};

  let drag=null;
  canvas.addEventListener('pointerdown',event=>{
    drag={x:event.clientX,y:event.clientY,startX:offsetX,startY:offsetY};
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(!drag)return;
    const rect=canvas.getBoundingClientRect();
    offsetX=drag.startX+(event.clientX-drag.x)*canvas.width/rect.width;
    offsetY=drag.startY+(event.clientY-drag.y)*canvas.height/rect.height;
    render();
  });
  canvas.addEventListener('pointerup',()=>{drag=null});
  canvas.addEventListener('pointercancel',()=>{drag=null});

  $('applyImage').onclick=async()=>{
    if(!image||!drawInfo)return;
    const button=$('applyImage');
    button.disabled=true;
    setMessage('正在處理並上傳圖片…');
    try{
      const {x,y,scale}=drawInfo;
      const sourceX=-x/scale,sourceY=-y/scale;
      const sourceWidth=canvas.width/scale,sourceHeight=canvas.height/scale;
      const output=document.createElement('canvas');
      output.width=Math.min(2000,Math.max(1,Math.round(sourceWidth)));
      output.height=Math.max(1,Math.round(output.width*canvas.height/canvas.width));
      output.getContext('2d').drawImage(image,sourceX,sourceY,sourceWidth,sourceHeight,0,0,output.width,output.height);
      const blob=await new Promise(resolve=>output.toBlob(resolve,'image/webp',0.88));
      if(!blob)throw new Error('無法產生裁切圖片。');
      const path=`${Date.now()}-${crypto.randomUUID()}.webp`;
      const {error}=await supabase.storage.from('site-media').upload(path,blob,{contentType:'image/webp',upsert:false});
      if(error)throw error;
      const {data}=supabase.storage.from('site-media').getPublicUrl(path);
      insertImage(data.publicUrl,output.width,output.height);
      onMessage('圖片已套用，請儲存草稿或發布。');
    }catch(error){setMessage(error.message||'圖片處理失敗，請重試。',true)}
    finally{button.disabled=false}
  };
  return {bindFrame};
}
