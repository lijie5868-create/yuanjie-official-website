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
    style.textContent='.inline-edit-ui{position:fixed;z-index:1000;font:14px/1.4 system-ui,sans-serif}.inline-edit-ui[hidden],.inline-edit-menu[hidden],.inline-media-form[hidden]{display:none!important}.inline-edit-toggle{display:flex;align-items:center;gap:5px;height:30px;padding:0 9px;border:1px solid #d8dfe3;border-radius:7px;background:#fff;color:#4a6984;box-shadow:0 4px 14px #23313d20;font:600 12px/1 system-ui;cursor:pointer}.inline-edit-toggle svg{width:15px;height:15px;flex:none}.inline-edit-toggle[aria-expanded=true]{background:#4a6984;color:#fff}.inline-edit-menu{position:absolute;top:35px;left:0;display:flex;flex-wrap:wrap;align-items:center;gap:10px;width:max-content;max-width:min(520px,calc(100vw - 24px));box-sizing:border-box;padding:8px;border:1px solid #e1e5e7;border-radius:10px;background:#fff;box-shadow:0 8px 24px #23313d26}.inline-edit-ui.open-up .inline-edit-menu{top:auto;bottom:35px}.inline-edit-menu button{border:0;border-radius:6px;background:transparent;color:#34434b;padding:6px;font:12px/1.25 system-ui;cursor:pointer}.inline-edit-menu>.inline-edit-action{display:flex;align-items:center;justify-content:center;gap:5px;min-width:32px;min-height:32px;white-space:nowrap}.inline-edit-action svg{width:17px;height:17px;flex:none}.inline-edit-menu button:hover,.inline-edit-menu button:focus-visible{background:#edf2f4;outline:2px solid #4a6984;outline-offset:1px}.inline-edit-menu button:disabled{opacity:.45;cursor:not-allowed}.inline-edit-menu .inline-delete-action{color:#a43f36;background:#fff1ef}.inline-edit-ui[data-selection=true] .inline-edit-menu>.inline-edit-action span{display:none}.inline-edit-ui[data-selection=true] .inline-edit-menu>.inline-edit-action{width:32px;height:32px;padding:0}.inline-edit-ui[data-selection=true] .inline-edit-toggle{display:none}.inline-edit-ui[data-selection=true] .inline-edit-menu{position:relative;top:auto;left:auto;bottom:auto}.inline-style-tool{position:relative;display:flex;align-items:center}.inline-style-tool>button{display:grid;place-items:center;width:32px;height:32px;padding:0}.inline-style-tool>button svg{width:17px;height:17px}.inline-style-tool>button .color-mark{position:absolute;bottom:4px;left:9px;width:14px;height:3px;border-radius:3px;background:var(--mark-color,#4a6984)}.inline-style-palette{position:absolute;z-index:2;left:0;top:38px;display:grid;grid-template-columns:repeat(5,24px);gap:4px;padding:7px;border:1px solid #e1e5e7;border-radius:9px;background:#fff;box-shadow:0 6px 18px #23313d26}.inline-style-tool.open-up .inline-style-palette{top:auto;bottom:38px}.inline-style-palette[hidden]{display:none}.inline-style-palette button{width:24px;height:24px;padding:0;border:1px solid #d8dde0;border-radius:50%;font-size:13px}.inline-style-palette button[aria-label^="移除"]{background:linear-gradient(135deg,#fff 45%,#b54b45 46%,#b54b45 53%,#fff 54%)}.inline-font-size{height:30px;max-width:66px;padding:0 6px;border:0;border-radius:6px;background:#f5f7f8;color:#34434b;font:12px system-ui}.inline-size-tool{margin-left:2px;padding-left:9px;border-left:1px solid #e1e5e7}.inline-paragraph-style{height:30px;max-width:70px;padding:0 6px;border:0;border-radius:6px;background:#f5f7f8;color:#34434b;font:12px system-ui}.inline-media-form{flex-basis:100%;display:grid;gap:7px;padding-top:6px;border-top:1px solid #e1e5e7}.inline-media-form label{font-size:12px;color:#53616a}.inline-media-form input{box-sizing:border-box;width:100%;padding:8px;border:1px solid #c9c8c0;border-radius:5px;font:13px system-ui}.inline-media-form .inline-media-actions{display:flex;gap:6px}.inline-media-form .inline-media-actions button{flex:1}.inline-media-status{grid-column:1/-1;color:#526574;font-size:12px;min-height:1em}.inline-media-status.error{color:#ad392f}';
    doc.head.append(style);
    style.textContent+='.inline-edit-action[hidden],.inline-style-tool[hidden]{display:none!important}';
    style.textContent+='[data-block="specs"] .specs>div:has(>dd:empty){display:grid!important}[data-block="specs"] .specs dd:empty::before{content:"點此填寫";color:#98a3a8;pointer-events:none}';
    style.textContent+='.inline-edit-ui[data-level="feature"] .inline-edit-menu,.inline-edit-ui[data-level="team"] .inline-edit-menu{width:min(360px,calc(100vw - 24px));grid-template-columns:repeat(4,minmax(0,1fr))}.inline-edit-ui[data-level="album"] .inline-edit-menu{width:min(420px,calc(100vw - 24px));grid-template-columns:repeat(4,minmax(0,1fr))}.inline-edit-ui[data-level="block"] .inline-edit-menu{width:110px;grid-template-columns:1fr}';
    style.textContent+='.inline-edit-ui [data-tooltip]{position:relative}.inline-edit-ui [data-tooltip]::after{content:attr(data-tooltip);position:absolute;z-index:30;top:calc(100% + 8px);left:50%;padding:5px 8px;border:1px solid #34434b;border-radius:6px;background:#263238;color:#fff;box-shadow:0 4px 12px #18232b30;font:11px/1.2 system-ui,sans-serif;white-space:nowrap;pointer-events:none;visibility:hidden;opacity:0;transform:translate(-50%,4px);transition:opacity .12s ease,transform .12s ease,visibility .12s}.inline-edit-ui [data-tooltip]:hover::after,.inline-edit-ui [data-tooltip]:focus-visible::after{visibility:visible;opacity:1;transform:translate(-50%,0)}.inline-edit-ui.open-up [data-tooltip]::after{top:auto;bottom:calc(100% + 8px);transform:translate(-50%,-4px)}.inline-edit-ui.open-up [data-tooltip]:hover::after,.inline-edit-ui.open-up [data-tooltip]:focus-visible::after{transform:translate(-50%,0)}';
    style.textContent+='.inline-edit-ui[data-level="image"] .inline-edit-toggle{display:none}.inline-edit-ui[data-level="image"] .inline-edit-menu{position:relative;top:auto;left:auto;bottom:auto}';
    const root=doc.createElement('div');root.className='inline-edit-ui';root.hidden=true;root.dataset.editorUi='';
    doc.addEventListener('keydown',event=>{
      if(!(event.ctrlKey||event.metaKey)||event.altKey)return;
      const editable=event.target.closest?.('[contenteditable="true"]');
      if(!editable||!main.contains(editable))return;
      const key=event.key.toLowerCase();let command=null;
      if(key==='z')command=event.shiftKey?'redo':'undo';
      else if(key==='y')command='redo';
      else if(key==='c'||key==='x'){
        const selection=win.getSelection();if(!selection||selection.isCollapsed)return;
        command=key==='c'?'copy':'cut';
      }
      if(!command)return;
      try{if(doc.execCommand(command))event.preventDefault()}catch{}
    });
    main.addEventListener('paste',event=>{
      const editable=event.target.closest?.('[contenteditable="true"]');
      if(!editable||!main.contains(editable))return;
      const text=event.clipboardData?.getData('text/plain');if(text==null)return;
      event.preventDefault();doc.execCommand('insertText',false,text);
    });
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
      delete:icon('<path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"/>'),
      textColor:icon('<path d="m4 19 6-14 6 14M6.5 14h7M18 15v4m-2-2h4"/>'),
      highlight:icon('<path d="m9 5 7 7-5 5-7-7 5-5Z"/><path d="m14 10 4-4 3 3-4 4M3 21h18"/>')
    };
    const toggle=doc.createElement('button');toggle.type='button';toggle.className='inline-edit-toggle';toggle.innerHTML=`${icons.edit}<span>編輯</span>`;toggle.dataset.tooltip='編輯工具';toggle.setAttribute('aria-label','開啟編輯工具');toggle.setAttribute('aria-expanded','false');
    const menu=doc.createElement('div');menu.className='inline-edit-menu';menu.hidden=true;
    const action=(label,shortLabel,iconName,run)=>{const b=doc.createElement('button');b.type='button';b.className='inline-edit-action';b.innerHTML=`${icons[iconName]}<span>${shortLabel}</span>`;b.setAttribute('aria-label',label);b.dataset.tooltip=label;b.onclick=run;menu.append(b);return b};
    const styleAction=(label,iconName,property,colors)=>{
      const wrap=doc.createElement('div');wrap.className='inline-edit-action inline-style-tool';
      const button=doc.createElement('button');button.type='button';button.className='inline-edit-action';button.innerHTML=`${icons[iconName]}${property==='color'?'<i class="color-mark"></i>':''}`;button.setAttribute('aria-label',label);button.dataset.tooltip=label;
      const palette=doc.createElement('div');palette.className='inline-style-palette';palette.hidden=true;palette.setAttribute('role','group');palette.setAttribute('aria-label',label+'色彩');
      colors.forEach(({name,value,remove})=>{const swatch=doc.createElement('button');swatch.type='button';swatch.setAttribute('aria-label',name);swatch.dataset.tooltip=name;if(remove){swatch.textContent='×'}else{swatch.style.backgroundColor=value;swatch.style.setProperty('--swatch-color',value)}swatch.onclick=()=>{applyTextStyle(property,remove?null:value);palette.hidden=true;wrap.classList.remove('open-up')};palette.append(swatch)});
      button.onclick=()=>{palette.hidden=!palette.hidden;wrap.classList.toggle('open-up',root.getBoundingClientRect().bottom+180>win.innerHeight)};
      wrap.append(button,palette);menu.append(wrap);return wrap;
    };
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
    function applyTextStyle(property,value){
      restore();
      const selection=win.getSelection(),range=selection?.rangeCount?selection.getRangeAt(0):null;
      if(!range||range.collapsed||!main.contains(range.commonAncestorContainer))return;
      const walker=doc.createTreeWalker(main,win.NodeFilter.SHOW_TEXT),nodes=[];
      while(walker.nextNode()){const node=walker.currentNode;if(node.nodeValue&&range.intersectsNode(node))nodes.push(node)}
      const spans=[];
      nodes.forEach(node=>{
        const start=node===range.startContainer?range.startOffset:0,end=node===range.endContainer?range.endOffset:node.length;
        if(end<=start)return;
        if(end<node.length)node.splitText(end);
        const selected=start?node.splitText(start):node,span=doc.createElement('span');
        span.style[property]=value||(property==='color'?'inherit':'transparent');
        selected.parentNode.insertBefore(span,selected);span.append(selected);spans.push(span);
      });
      if(!spans.length)return;
      const nextRange=doc.createRange();nextRange.setStartBefore(spans[0]);nextRange.setEndAfter(spans[spans.length-1]);
      selection.removeAllRanges();selection.addRange(nextRange);savedRange=nextRange.cloneRange();onChange();
    }
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
    textActions.push(styleAction('字體顏色','textColor','color',[
      {name:'移除文字顏色',remove:true},{name:'深灰',value:'#263238'},{name:'品牌藍',value:'#4a6984'},{name:'暖金',value:'#a47c48'},
      {name:'磚紅',value:'#a34f48'},{name:'森林綠',value:'#57745d'},{name:'紫灰',value:'#76628b'},{name:'石板灰',value:'#66727a'}
    ]));
    textActions.push(styleAction('螢光筆顏色','highlight','backgroundColor',[
      {name:'移除螢光筆',remove:true},{name:'淡黃',value:'#fff0a8'},{name:'淡綠',value:'#d9f2cf'},{name:'淡藍',value:'#d4eff4'},
      {name:'淡紅',value:'#f9d9d4'},{name:'淡紫',value:'#eadcf4'}
    ]));
    const paragraphTool=doc.createElement('div');paragraphTool.className='inline-edit-action inline-paragraph-tool';paragraphTool.dataset.tooltip='標題層級';
    const paragraphStyle=doc.createElement('select');paragraphStyle.className='inline-paragraph-style';paragraphStyle.setAttribute('aria-label','段落樣式');
    [['標題',''],['內文','p'],['大標題','h2'],['副標題','h3'],['小標題','h4']].forEach(([label,value])=>{const option=doc.createElement('option');option.value=value;option.textContent=label;paragraphStyle.append(option)});
    paragraphStyle.onchange=()=>{if(!paragraphStyle.value)return;restore();const selection=win.getSelection();if(doc.execCommand('formatBlock',false,paragraphStyle.value)){savedRange=selection?.rangeCount?selection.getRangeAt(0).cloneRange():savedRange;onChange()}paragraphStyle.value=''};
    paragraphTool.append(paragraphStyle);menu.append(paragraphTool);textActions.push(paragraphTool);
    const fontSizeTool=doc.createElement('div');fontSizeTool.className='inline-edit-action inline-size-tool';fontSizeTool.dataset.tooltip='字體大小';
    const fontSize=doc.createElement('select');fontSize.className='inline-font-size';fontSize.setAttribute('aria-label','字體大小');
    [['字級',''],...Array.from({length:19},(_,index)=>{const size=12+index*2;return [`${size} px`,`${size}px`]})].forEach(([label,value])=>{const option=doc.createElement('option');option.value=value;option.textContent=label;fontSize.append(option)});
    fontSize.onchange=()=>{if(fontSize.value)applyTextStyle('fontSize',fontSize.value);fontSize.value=''};
    fontSizeTool.append(fontSize);menu.append(fontSizeTool);textActions.push(fontSizeTool);
    textActions.push(action('上傳圖片','上傳圖片','image',()=>{restore();document.getElementById('imageUploadButton').click();menu.hidden=true;toggle.setAttribute('aria-expanded','false')}));
    const imageActions=[];
    imageActions.push(action('更換選取照片','更換照片','image',()=>{document.getElementById('imageUploadButton').click();menu.hidden=true;toggle.setAttribute('aria-expanded','false')}));
    const editButton=action('編輯選取圖片','編輯圖片','crop',()=>{document.getElementById('editImage').click();menu.hidden=true;toggle.setAttribute('aria-expanded','false')});
    imageActions.push(editButton);
    textActions.push(action('插入媒體','媒體','video',()=>{media.hidden=!media.hidden;if(!media.hidden)urlInput.focus()}));
    const addFieldButton=action('在此欄位下方新增資料欄位','新增欄位','add',()=>{
      const row=lastTarget?.closest('[data-block="specs"] dl.specs > div');
      if(!row||!main.contains(row))return;
      const next=doc.createElement('div');
      const label=doc.createElement('dt'),value=doc.createElement('dd');
      label.textContent='新欄位';value.textContent='';
      label.contentEditable='true';value.contentEditable='true';
      next.append(label,value);row.after(next);
      notifyBlock(row.closest('[data-block="specs"]'));
      label.focus();root.hidden=true;
    });
    const deleteButton=action('刪除所選資料欄位','刪除欄位','delete',()=>{
      const row=lastTarget?.closest('[data-block="specs"] dl.specs > div');
      if(!row||!main.contains(row))return;
      const name=row.querySelector('dt')?.textContent.trim()||'此欄位';
      if(!win.confirm(`刪除「${name}」及其資料？`))return;
      row.remove();root.hidden=true;onChange();
    });
    deleteButton.classList.add('inline-delete-action');deleteButton.hidden=true;
    const featureActions=[];
    const featureBlock=()=>lastTarget?.closest('[data-block="features"],[data-block="featureStory"]');
    const featureList=()=>featureBlock()?.querySelector('.case-highlights,.heping-highlights,.features,.feature-story-grid,ul');
    const featureItem=()=>lastTarget?.closest('[data-block="features"] li,[data-block="features"] article,[data-block="featureStory"] article');
    const notifyBlock=block=>main.dispatchEvent(new CustomEvent('yuanjie:block-changed',{detail:{block}}));
    const setFeatureMode=mode=>{
      const item=featureItem(),block=featureBlock();if(!item)return;
      if(mode==='title-body'&&!item.querySelector(':scope > p')){
        const description=win.prompt('請輸入這張特色卡的內文');
        if(!description?.trim())return;
        const paragraph=doc.createElement('p');paragraph.textContent=description.trim();item.append(paragraph);
      }
      item.dataset.featureMode=mode;notifyBlock(block);root.hidden=true;
    };
    const titleBodyAction=action('顯示大標與內文','大標＋內文','add',()=>setFeatureMode('title-body'));
    const titleOnlyAction=action('只顯示大標','只有大標','bold',()=>setFeatureMode('title-only'));
    featureActions.push(titleBodyAction,titleOnlyAction);
    featureActions.push(action('新增特色','新增特色','add',()=>{const block=featureBlock(),list=featureList();if(!list)return;const item=featureItem()||list.lastElementChild;if(!item)return;const clone=item.cloneNode(true);clone.querySelectorAll('[data-editor-ui]').forEach(node=>node.remove());item.after(clone);notifyBlock(block);root.hidden=true}));
    featureActions.push(action('特色上移','上移','up',()=>{const item=featureItem(),block=featureBlock();if(item?.previousElementSibling){item.previousElementSibling.before(item);notifyBlock(block)}root.hidden=true}));
    featureActions.push(action('特色下移','下移','down',()=>{const item=featureItem(),block=featureBlock();if(item?.nextElementSibling){item.nextElementSibling.after(item);notifyBlock(block)}root.hidden=true}));
    const removeFeature=action('刪除所選特色','刪除特色','delete',()=>{const item=featureItem(),block=featureBlock();if(item&&win.confirm('刪除此項特色？')){item.remove();notifyBlock(block)}root.hidden=true});removeFeature.classList.add('inline-delete-action');featureActions.push(removeFeature);
    const teamActions=[];
    const teamBlock=()=>lastTarget?.closest('[data-block="team"]');
    const teamList=()=>teamBlock()?.querySelector('.team,.pb-items');
    const teamItem=()=>lastTarget?.closest('[data-block="team"] .team > div,[data-block="team"] .pb-items > article');
    teamActions.push(action('新增參與單位','新增單位','add',()=>{const block=teamBlock(),list=teamList(),item=teamItem()||list?.lastElementChild;if(!item)return;const clone=item.cloneNode(true);clone.querySelectorAll('[data-editor-ui]').forEach(node=>node.remove());item.after(clone);notifyBlock(block);root.hidden=true}));
    teamActions.push(action('單位上移','上移','up',()=>{const item=teamItem(),block=teamBlock();if(item?.previousElementSibling){item.previousElementSibling.before(item);notifyBlock(block)}root.hidden=true}));
    teamActions.push(action('單位下移','下移','down',()=>{const item=teamItem(),block=teamBlock();if(item?.nextElementSibling){item.nextElementSibling.after(item);notifyBlock(block)}root.hidden=true}));
    const removeTeam=action('刪除所選參與單位','刪除單位','delete',()=>{const item=teamItem(),block=teamBlock(),list=teamList();if(item&&list?.children.length>1&&win.confirm('刪除此參與單位？')){item.remove();notifyBlock(block)}root.hidden=true});removeTeam.classList.add('inline-delete-action');teamActions.push(removeTeam);
    const albumActions=[];
    const albumBlock=()=>lastTarget?.closest('[data-block="albums"]');
    const albumList=()=>albumBlock()?.querySelector('.project-album-grid');
    const albumItem=()=>lastTarget?.closest('[data-block="albums"] .project-album');
    albumActions.push(action('在此相簿新增一張照片','新增照片','image',()=>{const block=albumBlock(),item=albumItem();if(!block||!item)return;const items=item.querySelector('.project-album-items'),count=1+items.querySelectorAll('figure').length;if(count>=40){win.alert('每個相簿最多 40 張照片。');return}const figure=doc.createElement('figure');figure.innerHTML='<img alt="相簿照片"><figcaption>照片說明</figcaption>';const image=figure.querySelector('img');image.src=new URL('../assets/project-placeholder.svg',import.meta.url).href;items.append(figure);notifyBlock(block);main.dispatchEvent(new CustomEvent('yuanjie:select-image',{detail:{image}}));document.getElementById('imageUploadButton').click();root.hidden=true}));
    const removePhoto=action('刪除選取的這張照片','刪除這張','delete',()=>{const block=albumBlock(),item=albumItem(),photo=lastTarget?.closest('.project-album-items figure');if(!item)return;const inner=item.querySelector('.project-album-items');if(!photo&&!inner.firstElementChild){win.alert('這是區塊內最後一張照片；若要移除整個圖片集，請刪除區塊。');return}if(!win.confirm('刪除選取的這張照片？'))return;if(photo)photo.remove();else{const next=inner.firstElementChild.querySelector('img'),current=item.querySelector('.project-album-cover img');current.src=next.src;current.alt=next.alt;inner.firstElementChild.remove()}notifyBlock(block);root.hidden=true});removePhoto.classList.add('inline-delete-action');albumActions.push(removePhoto);
    albumActions.push(action('更換選取的照片','更換照片','crop',()=>{const image=lastTarget?.closest('figure')?.querySelector('img');image?.click();document.getElementById('imageUploadButton').click();root.hidden=true}));
    albumActions.push(action('編輯選取的照片','編輯照片','crop',()=>{const image=lastTarget?.closest('figure')?.querySelector('img');image?.click();document.getElementById('editImage').click();root.hidden=true}));
    const removeBlock=action('刪除所選區塊','刪除區塊','delete',()=>{const block=lastTarget?.closest('[data-block],[data-company-block]');if(!block||['cover','footer'].includes(block.dataset.block))return;const name=window.ProjectBlocks.types[block.dataset.block]||block.querySelector('h2,h1')?.textContent.trim()||'此區塊';if(win.confirm(`刪除整個「${name}」區塊及其內容？`)){block.remove();notifyBlock(null)}root.hidden=true});removeBlock.classList.add('inline-delete-action','inline-block-action');
    menu.append(media);root.append(toggle,menu);doc.body.append(root);
    root.addEventListener('pointerdown',event=>{if(event.target.closest('input,select,textarea'))return;event.preventDefault()});
    function updateActions(){
      editButton.disabled=document.getElementById('editImage').disabled;
      const isBlock=selectedLevel==='block',isFeature=selectedLevel==='feature',isTeam=selectedLevel==='team',isAlbum=selectedLevel==='album',isRow=selectedLevel==='row';
      root.dataset.level=selectedLevel;
      textActions.forEach(button=>button.hidden=isBlock||isFeature||isTeam||isAlbum||selectedLevel==='image');
      imageActions.forEach(button=>button.hidden=selectedLevel!=='image');
      featureActions.forEach(button=>button.hidden=!isFeature);
      if(isFeature){
        const item=featureItem();
        const mode=item?.dataset.featureMode==='title-only'||!item?.querySelector(':scope > p')?'title-only':'title-body';
        titleBodyAction.disabled=mode==='title-body';titleOnlyAction.disabled=mode==='title-only';
      }
      teamActions.forEach(button=>button.hidden=!isTeam);
      albumActions.forEach(button=>button.hidden=!isAlbum);
      if(isAlbum){albumActions[0].disabled=1+(albumItem()?.querySelectorAll('.project-album-items figure').length||0)>=40;removePhoto.disabled=false}
      removeBlock.hidden=!isBlock;
      addFieldButton.hidden=!isRow;
      deleteButton.hidden=!isRow;
    }
    toggle.onclick=()=>{
      menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));
      updateActions();
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
      if(event.target.closest?.('[data-block="albums"] .project-album')){root.hidden=true;return}
      if(event.target.closest('.inline-edit-ui,[data-editor-ui],input,textarea,select')||(event.target.closest('button')&&!event.target.closest('.project-album-cover')&&!event.target.closest('img,image')))return;
      const target=event.target.closest('main');if(target!==main){root.hidden=true;return}
      lastTarget=event.target;
      const selection=win.getSelection();
      savedRange=selection?.rangeCount&&main.contains(selection.anchorNode)?selection.getRangeAt(0).cloneRange():null;
      const block=lastTarget.closest('[data-block],[data-company-block]');
      const textSelected=Boolean(savedRange&&!savedRange.collapsed);
      const imageSelected=Boolean(lastTarget.closest('img,image'));
      selectedLevel=block&&(event.forceBlock||(!textSelected&&(event.target===block||event.target.matches('[data-block] > .wrap,[data-block] > .page-head,[data-block] > .case-overview,[data-block] > .details'))))?'block':
        lastTarget.closest('[data-block="albums"] .project-album')&&!textSelected?'album':
        imageSelected?'image':
        lastTarget.closest('[data-block="features"] li,[data-block="features"] article,[data-block="featureStory"] article')&&!textSelected?'feature':
        lastTarget.closest('[data-block="team"] .team > div,[data-block="team"] .pb-items > article')&&!textSelected?'team':
        lastTarget.closest('[data-block="specs"] dl.specs > div')?'row':'text';
      const rect=savedRange?.getBoundingClientRect();
      const x=rect?.right||event.clientX||40,y=rect?.top||event.clientY||40;
      root.style.left=`${Math.max(10,Math.min(x+8,win.innerWidth-44))}px`;
      root.style.top=`${Math.max(10,Math.min(y-40,win.innerHeight-44))}px`;
      toggle.querySelector('span').textContent=selectedLevel==='block'?'區塊':selectedLevel==='feature'?'特色':selectedLevel==='team'?'單位':selectedLevel==='album'?'相簿':selectedLevel==='row'?'欄位':'編輯';
      root.dataset.selection=String(textSelected);root.hidden=false;menu.hidden=!(textSelected||imageSelected);menu.style.left='0px';media.hidden=true;toggle.setAttribute('aria-expanded',String(textSelected||imageSelected));
      updateActions();
      if(textSelected)root.style.left=`${Math.max(10,Math.min(x+8,win.innerWidth-menu.getBoundingClientRect().width-12))}px`;
      if(textSelected&&root.getBoundingClientRect().bottom+80>win.innerHeight)root.classList.add('open-up');else root.classList.remove('open-up');
    }
    doc.addEventListener('mouseup',show);
    main.addEventListener('yuanjie:select-block',event=>{const block=event.detail?.block;if(!block||!main.contains(block))return;show({target:block,clientX:event.detail.x,clientY:event.detail.y,forceBlock:true});toggle.click()});
    doc.addEventListener('keyup',event=>{if(['Shift','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&doc.activeElement?.closest('main'))show({target:doc.activeElement,clientX:40,clientY:40})});
    doc.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.hidden=true;root.hidden=true}});
  }
  return {bindFrame};
}
