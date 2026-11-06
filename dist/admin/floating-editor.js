const VIDEO_TYPES={
  'video/mp4':'mp4',
  'video/webm':'webm',
  'video/quicktime':'mov'
};
const MAX_VIDEO_SIZE=50*1024*1024;
let tusLoader=null;
function loadTus(){
  if(window.tus?.Upload)return Promise.resolve(window.tus);
  tusLoader ||= new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/tus-js-client@4.3.1/dist/tus.min.js';
    script.onload=()=>window.tus?.Upload?resolve(window.tus):reject(new Error('影片上傳工具無法載入。'));
    script.onerror=()=>reject(new Error('影片上傳工具無法載入。'));
    document.head.append(script);
  });
  return tusLoader;
}

function youtubeId(value){
  try{
    const url=new URL(value.trim());
    if(url.protocol!=='https:')return null;
    const host=url.hostname.toLowerCase();
    let id=null;
    if(host==='youtu.be')id=url.pathname.slice(1).split('/')[0];
    else if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(host)){
      id=url.pathname==='/watch'?url.searchParams.get('v'):url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
    }
    return /^[\w-]{11}$/.test(id||'')?id:null;
  }catch{return null}
}

export function createFloatingEditor({frame,supabase,onChange,onMessage}){
  function bindFrame(){
    const doc=frame.contentDocument,win=frame.contentWindow,main=doc.querySelector('main');
    if(!main)return;
    let savedRange=null,lastTarget=null,selectedLevel='text';
    const style=doc.createElement('style');
    style.textContent='.inline-edit-ui{position:fixed;z-index:1000;font:14px/1.4 system-ui,sans-serif}.inline-edit-ui[hidden],.inline-edit-menu[hidden],.inline-media-form[hidden]{display:none!important}.inline-edit-toggle{display:flex;align-items:center;gap:5px;height:32px;padding:0 9px;border:1px solid #b5966a;border-radius:7px;background:#fff;color:#5d4931;box-shadow:0 3px 12px #0002;font:600 12px/1 system-ui;cursor:pointer}.inline-edit-toggle svg{width:16px;height:16px;flex:none}.inline-edit-toggle[aria-expanded=true]{background:#4a6984;color:#fff}.inline-edit-menu{position:absolute;top:38px;left:0;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;width:min(500px,calc(100vw - 24px));box-sizing:border-box;padding:8px;border:1px solid #c9c5bc;border-radius:10px;background:#fff;box-shadow:0 12px 30px #0003}.inline-edit-ui.open-up .inline-edit-menu{top:auto;bottom:38px}.inline-edit-menu button{border:0;border-radius:6px;background:#f1efeb;color:#303b43;padding:7px 2px;font:11px/1.25 system-ui;cursor:pointer}.inline-edit-menu>.inline-edit-action{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-width:0;min-height:53px;white-space:nowrap}.inline-edit-action svg{width:18px;height:18px;flex:none}.inline-edit-menu button:hover,.inline-edit-menu button:focus-visible{background:#dce7ed;outline:2px solid #4a6984}.inline-edit-menu button:disabled{opacity:.45;cursor:not-allowed}.inline-edit-menu .inline-delete-action{color:#8e3530;background:#fff1ef}.inline-media-form{grid-column:1/-1;display:grid;gap:7px;padding-top:6px;border-top:1px solid #dedbd4}.inline-media-form label{font-size:12px;color:#53616a}.inline-media-form input{box-sizing:border-box;width:100%;padding:8px;border:1px solid #c9c8c0;border-radius:5px;font:13px system-ui}.inline-media-form .inline-media-actions{display:flex;gap:6px}.inline-media-form .inline-media-actions button{flex:1}.inline-media-status{grid-column:1/-1;color:#526574;font-size:12px;min-height:1em}.inline-media-status.error{color:#ad392f}';
    doc.head.append(style);
    style.textContent+='.inline-edit-action[hidden]{display:none!important}';
    style.textContent+='.inline-edit-ui[data-level="feature"] .inline-edit-menu{width:min(360px,calc(100vw - 24px));grid-template-columns:repeat(4,minmax(0,1fr))}.inline-edit-ui[data-level="block"] .inline-edit-menu{width:110px;grid-template-columns:1fr}';
    const root=doc.createElement('div');root.className='inline-edit-ui';root.hidden=true;root.dataset.editorUi='';
    const icon=paths=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
    const icons={
      edit:icon('<path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13 7 4 4"/>'),
      bold:icon('<path d="M7 4h6a4 4 0 0 1 0 8H7V4Zm0 8h7a4 4 0 0 1 0 8H7v-8Z"/>'),
      link:icon('<path d="M10 13a5 5 0 0 0 7 .4l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7-.4l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>'),
      image:icon('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 3-3 4 4"/>'),
      crop:icon('<path d="M7 3v13a2 2 0 0 0 2 2h12M3 7h13a2 2 0 0 1 2 2v12"/>'),
      video:icon('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3V9Z"/>'),
      add:icon('<path d="M12 5v14M5 12h14"/>'),
      up:icon('<path d="m6 14 6-6 6 6"/>'),
      down:icon('<path d="m6 10 6 6 6-6"/>'),
      delete:icon('<path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"/>')
    };
    const toggle=doc.createElement('button');toggle.type='button';toggle.className='inline-edit-toggle';toggle.innerHTML=`${icons.edit}<span>編輯</span>`;toggle.title='編輯工具';toggle.setAttribute('aria-label','開啟編輯工具');toggle.setAttribute('aria-expanded','false');
    const menu=doc.createElement('div');menu.className='inline-edit-menu';menu.hidden=true;
    const action=(label,shortLabel,iconName,run)=>{const b=doc.createElement('button');b.type='button';b.className='inline-edit-action';b.innerHTML=`${icons[iconName]}<span>${shortLabel}</span>`;b.setAttribute('aria-label',label);b.title=label;b.onclick=run;menu.append(b);return b};
    const status=doc.createElement('div');status.className='inline-media-status';status.setAttribute('role','status');
    const media=doc.createElement('div');media.className='inline-media-form';media.hidden=true;
    const label=doc.createElement('label');label.textContent='YouTube 網址';
    const urlInput=doc.createElement('input');urlInput.type='url';urlInput.placeholder='https://www.youtube.com/watch?v=...';label.append(urlInput);
    const mediaActions=doc.createElement('div');mediaActions.className='inline-media-actions';
    const embed=doc.createElement('button');embed.type='button';embed.textContent='嵌入 YouTube';
    const upload=doc.createElement('button');upload.type='button';upload.textContent='上傳影片檔';
    const fileInput=doc.createElement('input');fileInput.type='file';fileInput.accept='.mp4,.webm,.mov,video/mp4,video/webm,video/quicktime';fileInput.hidden=true;
    mediaActions.append(embed,upload);media.append(label,mediaActions,fileInput,status);
    const report=(text,error=false)=>{status.textContent=text;status.classList.toggle('error',error);onMessage(text,error)};
    const restore=()=>{if(savedRange&&doc.contains(savedRange.commonAncestorContainer)){const selection=win.getSelection();selection.removeAllRanges();selection.addRange(savedRange)}};
    function insertMedia(figure){
      if(main.dataset.blockVersion==='1'){
        const block=lastTarget?.closest('[data-block]');
        const section=doc.createElement('section');section.dataset.block='gallery';section.append(figure);
        const parts=[...main.children].filter(el=>el.dataset.block);
        const after=block&&block.dataset.block!=='footer'?parts[parts.indexOf(block)+1]:main.querySelector('[data-block="footer"]');
        main.insertBefore(section,after||null);
        main.dispatchEvent(new CustomEvent('yuanjie:media-inserted',{detail:{block:section}}));
      }else{
        const node=savedRange?.startContainer;
        const parent=node?.nodeType===1?node:node?.parentElement;
        const anchor=parent?.closest('p,li,h1,h2,h3,figure')||lastTarget?.closest('p,li,h1,h2,h3,figure');
        if(anchor&&main.contains(anchor))anchor.after(figure);
        else if(lastTarget&&main.contains(lastTarget)){
          const section=lastTarget.closest('section,article');
          (section&&main.contains(section)?section:main).append(figure);
        }else main.append(figure);
      }
      onChange();menu.hidden=true;toggle.setAttribute('aria-expanded','false');
      figure.scrollIntoView({block:'center'});
    }
    function figureWith(child,caption){
      const figure=doc.createElement('figure');figure.className='site-media';figure.append(child);
      const figcaption=doc.createElement('figcaption');figcaption.textContent=caption;figure.append(figcaption);
      return figure;
    }
    const textActions=[];
    textActions.push(action('粗體','粗體','bold',()=>{restore();if(doc.execCommand('bold',false,null))onChange();menu.hidden=true;toggle.setAttribute('aria-expanded','false')}));
    textActions.push(action('加入連結','連結','link',()=>{
      const value=prompt('請輸入連結網址（https://、mailto: 或 tel:）');
      if(!value)return;
      if(!/^(https:\/\/|mailto:|tel:)/i.test(value)){report('請輸入有效的連結網址。',true);return}
      restore();if(doc.execCommand('createLink',false,value))onChange();menu.hidden=true;toggle.setAttribute('aria-expanded','false');
    }));
    textActions.push(action('上傳圖片','上傳圖片','image',()=>{restore();document.getElementById('imageUploadButton').click();menu.hidden=true;toggle.setAttribute('aria-expanded','false')}));
    const editButton=action('編輯選取圖片','編輯圖片','crop',()=>{document.getElementById('editImage').click();menu.hidden=true;toggle.setAttribute('aria-expanded','false')});
    textActions.push(editButton);
    textActions.push(action('插入媒體','媒體','video',()=>{media.hidden=!media.hidden;if(!media.hidden)urlInput.focus()}));
    const deleteButton=action('刪除所選資料欄位','刪除欄位','delete',()=>{
      const row=lastTarget?.closest('[data-block="specs"] dl.specs > div');
      if(!row||!main.contains(row))return;
      const name=row.querySelector('dt')?.textContent.trim()||'此欄位';
      if(!win.confirm(`刪除「${name}」及其資料？`))return;
      row.remove();root.hidden=true;onChange();
    });
    deleteButton.classList.add('inline-delete-action');deleteButton.hidden=true;
    const featureActions=[];
    const featureBlock=()=>lastTarget?.closest('[data-block="features"]');
    const featureList=()=>featureBlock()?.querySelector('.case-highlights,.heping-highlights,.features,ul');
    const featureItem=()=>lastTarget?.closest('[data-block="features"] li,[data-block="features"] article');
    const notifyBlock=block=>main.dispatchEvent(new CustomEvent('yuanjie:block-changed',{detail:{block}}));
    featureActions.push(action('新增特色','新增特色','add',()=>{const block=featureBlock(),list=featureList();if(!list)return;const item=featureItem()||list.lastElementChild;if(!item)return;const clone=item.cloneNode(true);clone.querySelectorAll('[data-editor-ui]').forEach(node=>node.remove());item.after(clone);notifyBlock(block);root.hidden=true}));
    featureActions.push(action('特色上移','上移','up',()=>{const item=featureItem(),block=featureBlock();if(item?.previousElementSibling){item.previousElementSibling.before(item);notifyBlock(block)}root.hidden=true}));
    featureActions.push(action('特色下移','下移','down',()=>{const item=featureItem(),block=featureBlock();if(item?.nextElementSibling){item.nextElementSibling.after(item);notifyBlock(block)}root.hidden=true}));
    const removeFeature=action('刪除所選特色','刪除特色','delete',()=>{const item=featureItem(),block=featureBlock();if(item&&win.confirm('刪除此項特色？')){item.remove();notifyBlock(block)}root.hidden=true});removeFeature.classList.add('inline-delete-action');featureActions.push(removeFeature);
    const removeBlock=action('刪除所選區塊','刪除區塊','delete',()=>{const block=lastTarget?.closest('[data-block],[data-company-block]');if(!block||['cover','footer'].includes(block.dataset.block))return;const name=window.ProjectBlocks.types[block.dataset.block]||block.querySelector('h2,h1')?.textContent.trim()||'此區塊';if(win.confirm(`刪除整個「${name}」區塊及其內容？`)){block.remove();notifyBlock(null)}root.hidden=true});removeBlock.classList.add('inline-delete-action','inline-block-action');
    menu.append(media);root.append(toggle,menu);doc.body.append(root);
    root.addEventListener('pointerdown',event=>{if(event.target!==urlInput&&event.target!==fileInput)event.preventDefault()});
    toggle.onclick=()=>{
      menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));
      editButton.disabled=document.getElementById('editImage').disabled;
      const isBlock=selectedLevel==='block',isFeature=selectedLevel==='feature',isRow=selectedLevel==='row';
      root.dataset.level=selectedLevel;
      textActions.forEach(button=>button.hidden=isBlock||isFeature);
      featureActions.forEach(button=>button.hidden=!isFeature);
      removeBlock.hidden=!isBlock;
      deleteButton.hidden=!isRow;
      media.hidden=true;
      if(!menu.hidden){
        const left=root.getBoundingClientRect().left;
        menu.style.left=`${Math.min(0,win.innerWidth-left-menu.offsetWidth-12)}px`;
        root.classList.toggle('open-up',root.getBoundingClientRect().bottom+300>win.innerHeight);
      }
    };
    embed.onclick=()=>{
      const id=youtubeId(urlInput.value);
      if(!id){report('請貼上有效的 YouTube 影片網址。',true);return}
      const iframe=doc.createElement('iframe');iframe.src=`https://www.youtube-nocookie.com/embed/${id}`;
      iframe.title='YouTube 影片';iframe.loading='lazy';iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';iframe.allowFullscreen=true;
      insertMedia(figureWith(iframe,'影片'));
      urlInput.value='';report('YouTube 影片已加入預覽，請儲存草稿。');
    };
    upload.onclick=()=>fileInput.click();
    fileInput.onchange=async()=>{
      const file=fileInput.files?.[0];fileInput.value='';if(!file)return;
      const type=VIDEO_TYPES[file.type];
      if(!type){report('請選擇 MP4、WebM 或 MOV 影片。',true);return}
      if(file.size>MAX_VIDEO_SIZE){report('影片檔不可超過 50 MB；較大的影片請使用 YouTube 網址。',true);return}
      upload.disabled=true;embed.disabled=true;
      try{
        const {data:{session},error:sessionError}=await supabase.auth.getSession();
        if(sessionError||!session?.access_token)throw new Error('登入已失效，請重新登入後再上傳。');
        const tus=await loadTus();
        const projectId=new URL(window.YUANJIE_CONFIG.supabaseUrl).hostname.split('.')[0];
        const path=`videos/${Date.now()}-${crypto.randomUUID()}.${type}`;
        report('正在上傳影片… 0%');
        await new Promise((resolve,reject)=>{
          const task=new tus.Upload(file,{
            endpoint:`https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
            headers:{authorization:`Bearer ${session.access_token}`},
            uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,
            metadata:{bucketName:'site-media',objectName:path,contentType:file.type,cacheControl:'3600'},
            chunkSize:6*1024*1024,retryDelays:[0,3000,5000,10000,20000],
            onError:reject,onProgress:(sent,total)=>report(`正在上傳影片… ${Math.round(sent/total*100)}%`),onSuccess:resolve
          });
          task.start();
        });
        const {data}=supabase.storage.from('site-media').getPublicUrl(path);
        const video=doc.createElement('video');video.src=data.publicUrl;video.controls=true;video.preload='metadata';video.playsInline=true;
        insertMedia(figureWith(video,file.name));
        report('影片已加入預覽，請儲存草稿。');
      }catch(error){report(error.message||'影片上傳失敗，請重試。',true)}
      finally{upload.disabled=false;embed.disabled=false}
    };
    function show(event){
      if(event.target.closest('.inline-edit-ui,[data-editor-ui],button,input,textarea,select'))return;
      const target=event.target.closest('main');if(target!==main){root.hidden=true;return}
      lastTarget=event.target;
      const selection=win.getSelection();
      savedRange=selection?.rangeCount&&main.contains(selection.anchorNode)?selection.getRangeAt(0).cloneRange():null;
      const block=lastTarget.closest('[data-block],[data-company-block]');
      const textSelected=Boolean(savedRange&&!savedRange.collapsed);
      selectedLevel=block&&(event.forceBlock||(!textSelected&&(event.target===block||event.target.matches('[data-block] > .wrap,[data-block] > .page-head,[data-block] > .case-overview,[data-block] > .details'))))?'block':
        lastTarget.closest('[data-block="features"] li,[data-block="features"] article')&&!textSelected?'feature':
        lastTarget.closest('[data-block="specs"] dl.specs > div')?'row':'text';
      const rect=savedRange?.getBoundingClientRect();
      const x=rect?.right||event.clientX||40,y=rect?.top||event.clientY||40;
      root.style.left=`${Math.max(10,Math.min(x+8,win.innerWidth-44))}px`;
      root.style.top=`${Math.max(10,Math.min(y-40,win.innerHeight-44))}px`;
      toggle.querySelector('span').textContent=selectedLevel==='block'?'區塊':selectedLevel==='feature'?'特色':selectedLevel==='row'?'欄位':'編輯';
      root.hidden=false;menu.hidden=true;media.hidden=true;toggle.setAttribute('aria-expanded','false');
    }
    doc.addEventListener('mouseup',show);
    main.addEventListener('yuanjie:select-block',event=>{const block=event.detail?.block;if(!block||!main.contains(block))return;show({target:block,clientX:event.detail.x,clientY:event.detail.y,forceBlock:true});toggle.click()});
    doc.addEventListener('keyup',event=>{if(['Shift','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&doc.activeElement?.closest('main'))show({target:doc.activeElement,clientX:40,clientY:40})});
    doc.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.hidden=true;root.hidden=true}});
  }
  return {bindFrame};
}
