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
    let savedRange=null,lastTarget=null;
    const style=doc.createElement('style');
    style.textContent='.inline-edit-ui{position:fixed;z-index:1000;font:14px/1.4 system-ui,sans-serif}.inline-edit-ui[hidden],.inline-edit-menu[hidden],.inline-media-form[hidden]{display:none!important}.inline-edit-toggle{width:34px;height:34px;border:1px solid #b5966a;border-radius:50%;background:#fff;color:#5d4931;box-shadow:0 3px 12px #0003;font:600 19px/1 system-ui;cursor:pointer}.inline-edit-toggle[aria-expanded=true]{background:#4a6984;color:#fff}.inline-edit-menu{position:absolute;top:40px;left:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;width:min(290px,calc(100vw - 24px));padding:10px;border:1px solid #c9c5bc;border-radius:10px;background:#fff;box-shadow:0 12px 30px #0003}.inline-edit-ui.open-up .inline-edit-menu{top:auto;bottom:40px}.inline-edit-menu button{border:0;border-radius:6px;background:#f1efeb;color:#303b43;padding:8px 6px;font:13px/1.3 system-ui;cursor:pointer}.inline-edit-menu button:hover,.inline-edit-menu button:focus-visible{background:#dce7ed;outline:2px solid #4a6984}.inline-edit-menu button:disabled{opacity:.45;cursor:not-allowed}.inline-media-form{grid-column:1/-1;display:grid;gap:7px;padding-top:6px;border-top:1px solid #dedbd4}.inline-media-form label{font-size:12px;color:#53616a}.inline-media-form input{box-sizing:border-box;width:100%;padding:8px;border:1px solid #c9c8c0;border-radius:5px;font:13px system-ui}.inline-media-form .inline-media-actions{display:flex;gap:6px}.inline-media-form .inline-media-actions button{flex:1}.inline-media-status{grid-column:1/-1;color:#526574;font-size:12px;min-height:1em}.inline-media-status.error{color:#ad392f}';
    doc.head.append(style);
    const root=doc.createElement('div');root.className='inline-edit-ui';root.hidden=true;root.dataset.editorUi='';
    const toggle=doc.createElement('button');toggle.type='button';toggle.className='inline-edit-toggle';toggle.textContent='✦';toggle.title='編輯工具';toggle.setAttribute('aria-label','開啟編輯工具');toggle.setAttribute('aria-expanded','false');
    const menu=doc.createElement('div');menu.className='inline-edit-menu';menu.hidden=true;
    const action=(label,run)=>{const b=doc.createElement('button');b.type='button';b.textContent=label;b.onclick=run;menu.append(b);return b};
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
    action('粗體',()=>{restore();if(doc.execCommand('bold',false,null))onChange();menu.hidden=true;toggle.setAttribute('aria-expanded','false')});
    action('加入連結',()=>{
      const value=prompt('請輸入連結網址（https://、mailto: 或 tel:）');
      if(!value)return;
      if(!/^(https:\/\/|mailto:|tel:)/i.test(value)){report('請輸入有效的連結網址。',true);return}
      restore();if(doc.execCommand('createLink',false,value))onChange();menu.hidden=true;toggle.setAttribute('aria-expanded','false');
    });
    action('上傳圖片',()=>{restore();document.getElementById('imageUploadButton').click();menu.hidden=true;toggle.setAttribute('aria-expanded','false')});
    const editButton=action('編輯選取圖片',()=>{document.getElementById('editImage').click();menu.hidden=true;toggle.setAttribute('aria-expanded','false')});
    action('插入媒體',()=>{media.hidden=!media.hidden;if(!media.hidden)urlInput.focus()});
    menu.append(media);root.append(toggle,menu);doc.body.append(root);
    root.addEventListener('pointerdown',event=>{if(event.target!==urlInput&&event.target!==fileInput)event.preventDefault()});
    toggle.onclick=()=>{
      menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));
      editButton.disabled=document.getElementById('editImage').disabled;
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
      const rect=savedRange?.getBoundingClientRect();
      const x=rect?.right||event.clientX||40,y=rect?.top||event.clientY||40;
      root.style.left=`${Math.max(10,Math.min(x+8,win.innerWidth-44))}px`;
      root.style.top=`${Math.max(10,Math.min(y-40,win.innerHeight-44))}px`;
      root.hidden=false;menu.hidden=true;media.hidden=true;toggle.setAttribute('aria-expanded','false');
    }
    doc.addEventListener('mouseup',show);
    doc.addEventListener('keyup',event=>{if(['Shift','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&doc.activeElement?.closest('main'))show({target:doc.activeElement,clientX:40,clientY:40})});
    doc.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.hidden=true;root.hidden=true}});
  }
  return {bindFrame};
}
