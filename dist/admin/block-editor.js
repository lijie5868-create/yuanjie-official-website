const customHtmlTemplate='<section class="custom-html-example" style="padding:32px;border:1px solid #d8d5cd;border-radius:12px;background-color:#f7f5f1"><p style="color:#4a6984;letter-spacing:.12em">CUSTOM SECTION</p><h2>自訂區塊標題</h2><p>可貼上 ChatGPT 產生的 HTML，再於右側預覽。</p></section>';
const customHtmlTags=new Set('a article aside b blockquote br caption dd div dl dt em figcaption figure footer h1 h2 h3 h4 h5 h6 header hr i img li ol p section small span strong sub sup table tbody td th thead tr ul'.split(' '));
const customHtmlAttrs=new Set('alt aria-hidden aria-label class colspan decoding height href loading rel role rowspan scope src style target title width'.split(' '));
const customStyleProps=new Set('align-items aspect-ratio background-color border border-bottom border-color border-radius border-style border-top border-width box-shadow color column-gap display flex-direction flex-wrap font-size font-style font-weight gap grid-template-columns height justify-content letter-spacing line-height margin margin-bottom margin-left margin-right margin-top max-height max-width min-height min-width object-fit padding padding-bottom padding-left padding-right padding-top row-gap text-align width'.split(' '));
export function sanitizeCustomHtml(source=''){
  source=String(source).trim().replace(/^```(?:html)?\s*/i,'').replace(/\s*```\s*$/,'');
  const doc=new DOMParser().parseFromString(source,'text/html');
  const forbidden=new Set('script style iframe object embed form input button textarea select option link meta base svg math template'.split(' '));
  for(const node of [...doc.body.querySelectorAll('*')].reverse()){
    if(forbidden.has(node.tagName.toLowerCase())){node.remove();continue}
    if(!customHtmlTags.has(node.tagName.toLowerCase())){node.replaceWith(...node.childNodes);continue}
    for(const attr of [...node.attributes]){
      const name=attr.name.toLowerCase(),value=attr.value.trim();
      if(!customHtmlAttrs.has(name)||name.startsWith('on')){node.removeAttribute(attr.name);continue}
      if(['href','src'].includes(name)&&value&&!/^(https?:\/\/|mailto:|tel:|#|\.?\.?\/|assets\/|[\w.-]+\.html(?:[?#]|$))/i.test(value)){node.removeAttribute(attr.name);continue}
      if(name==='style'){
        const safe=value.split(';').map(part=>{const split=part.indexOf(':');if(split<1)return '';const property=part.slice(0,split).trim().toLowerCase(),styleValue=part.slice(split+1).trim();if(!customStyleProps.has(property)||!styleValue||/[<>\\{}]|url\s*\(|expression|javascript|@import/i.test(styleValue))return '';return `${property}:${styleValue}`}).filter(Boolean).join(';');
        if(safe)node.setAttribute('style',safe);else node.removeAttribute('style');
      }
      if(name==='target'&&value==='_blank')node.setAttribute('rel','noopener noreferrer');
    }
  }
  const walker=doc.createTreeWalker(doc.body,NodeFilter.SHOW_COMMENT);const comments=[];while(walker.nextNode())comments.push(walker.currentNode);comments.forEach(node=>node.remove());
  return doc.body.innerHTML;
}

export function bindBlocks(main,panel,changed){
  const doc=main.ownerDocument;
  const api=window.ProjectBlocks;
  panel.hidden=false;
  panel.open=false;
  panel.replaceChildren();
  const list=document.createElement('div'), fields=document.createElement('div');
  const tools=document.createElement('div');
  const option=(select,value,label)=>select.add(new Option(label,value));
  function button(target,label,action){
    const el=document.createElement('button');el.type='button';el.textContent=label;
    el.onclick=action;target.append(el);return el;
  }
  const dragKey='application/x-yuanjie-project-block';
  const insertTypes=Object.entries(api.types).slice(2).filter(([type])=>!['features','journal','metrics','team'].includes(type));
  let pending=null;
  const blocks=()=>[...main.children].filter(el=>el.dataset.block);
  const nextBlock=block=>blocks()[blocks().indexOf(block)+1]||null;
  const fixed=el=>['cover','specs','footer'].includes(el?.dataset.block);
  function insert(type,before){
    const block=api.newBlock(doc,type);
    main.insertBefore(block,before);
    api.refresh(main);
    select(block);changed();block.scrollIntoView({block:'center'});
  }
  for(const [type,label] of insertTypes){
    const tile=button(tools,label,()=>insert(type,active&&active.dataset.block!=='footer'?nextBlock(active):main.querySelector('[data-block="footer"]')));
    tile.draggable=true;
    tile.ondragstart=e=>{pending={type};e.dataTransfer.setData(dragKey,type);e.dataTransfer.effectAllowed='copy'};
    tile.ondragend=()=>{pending=null;clearDrop()};
  }
  const clearDrop=()=>main.querySelectorAll('[data-drop]').forEach(n=>delete n.dataset.drop);
  function targetAt(e){
    const slot=e.target.closest('.block-insert-slot');
    if(slot)return nextBlock(slot.previousElementSibling);
    const block=e.target.closest('[data-block]');
    if(!block)return main.querySelector('[data-block="footer"]');
    if(block.dataset.block==='cover')return nextBlock(block);
    if(block.dataset.block==='footer')return block;
    const rect=block.getBoundingClientRect();
    return e.clientY<rect.top+rect.height/2?block:nextBlock(block);
  }
  main.addEventListener('dragover',e=>{
    if(!pending)return;
    e.preventDefault();clearDrop();
    const target=targetAt(e);
    if(target)target.dataset.drop='before';else main.lastElementChild.dataset.drop='after';
  });
  main.addEventListener('drop',e=>{
    if(!pending)return;
    e.preventDefault();const target=targetAt(e);clearDrop();
    if(pending.type)insert(pending.type,target);
    else{main.insertBefore(pending.block,target);select(pending.block);changed()}
    pending=null;
  });
  main.addEventListener('click',e=>{
    const block=e.target.closest('[data-block]');if(block&&active!==block)select(block);
  });
  main.addEventListener('input',()=>{api.refresh(main);changed()});
  function editCoverPartners(cover){
    const modalDoc=document;
    const dialog=modalDoc.createElement('dialog');dialog.className='cover-partners-dialog';dialog.dataset.editorUi='';
    const header=modalDoc.createElement('div');header.className='cover-partners-dialog-header';
    const heading=modalDoc.createElement('h2');heading.textContent='編輯封面團隊';
    const close=modalDoc.createElement('button');close.type='button';close.className='cover-partners-dialog-close';close.setAttribute('aria-label','關閉');close.textContent='×';close.onclick=()=>dialog.close();header.append(heading,close);
    const hint=modalDoc.createElement('p');hint.textContent='最多四組。填寫職稱及任一行團隊名稱即可顯示，留空的組別不顯示。';
    const form=modalDoc.createElement('form');form.noValidate=true;
    const existing=[...cover.querySelectorAll('.cover-partners .cover-partner')].slice(0,4);
    const rows=[];
    for(let index=0;index<4;index++){
      const row=modalDoc.createElement('div');row.className='cover-partners-dialog-row';
      const number=modalDoc.createElement('strong');number.textContent=String(index+1).padStart(2,'0');
      const icon=modalDoc.createElement('span');icon.className='cover-partners-dialog-icon';icon.setAttribute('aria-hidden','true');
      const existingRole=existing[index]?.querySelector('small')?.textContent.trim()||'';
      icon.innerHTML=api.partnerIcon(existingRole);
      const roleLabel=modalDoc.createElement('label');roleLabel.textContent='職稱';
      const role=modalDoc.createElement('input');role.maxLength=40;role.placeholder='例如：實施者';role.value=existingRole;roleLabel.append(role);
      role.addEventListener('input',()=>{icon.innerHTML=api.partnerIcon(role.value)});
      const name=existing[index]?.querySelector('strong');
      const lineOneLabel=modalDoc.createElement('label');lineOneLabel.textContent='團隊名稱・第一行';
      const lineOne=modalDoc.createElement('input');lineOne.maxLength=100;lineOne.placeholder='例如：元捷建設';lineOne.value=name?.querySelector('[data-partner-line="1"]')?.textContent.trim()||(!name?.querySelector('[data-partner-line]')?name?.textContent.trim()||'':'');lineOneLabel.append(lineOne);
      const lineTwoLabel=modalDoc.createElement('label');lineTwoLabel.textContent='團隊名稱・第二行';
      const lineTwo=modalDoc.createElement('input');lineTwo.maxLength=100;lineTwo.placeholder='選填';lineTwo.value=name?.querySelector('[data-partner-line="2"]')?.textContent.trim()||'';lineTwoLabel.append(lineTwo);
      row.append(number,icon,roleLabel,lineOneLabel,lineTwoLabel);form.append(row);rows.push({role,lineOne,lineTwo});
    }
    const error=modalDoc.createElement('p');error.className='cover-partners-dialog-error';error.setAttribute('role','alert');
    const actions=modalDoc.createElement('div');actions.className='cover-partners-dialog-actions';
    const cancel=modalDoc.createElement('button');cancel.type='button';cancel.textContent='取消';cancel.onclick=()=>dialog.close();
    const save=modalDoc.createElement('button');save.type='button';save.textContent='確定';actions.append(cancel,save);form.append(error,actions);
    save.onclick=()=>{const entries=rows.map(({role,lineOne,lineTwo})=>({role:role.value.trim(),lineOne:lineOne.value.trim(),lineTwo:lineTwo.value.trim()}));if(entries.some(entry=>Boolean(entry.role)!==Boolean(entry.lineOne||entry.lineTwo))){error.textContent='每組請填寫職稱及至少一行名稱，或全部留空。';return}api.setCoverPartners(cover,entries);dialog.close();select(cover);changed()};
    dialog.append(header,hint,form);dialog.addEventListener('close',()=>dialog.remove(),{once:true});modalDoc.body.append(dialog);dialog.showModal();rows[0].role.focus();
  }
  function editAlbum(album){
    const grid=album.closest('.project-album-grid');
    const dialog=document.createElement('dialog');dialog.className='album-edit-dialog';dialog.dataset.editorUi='';
    const header=document.createElement('header'),title=document.createElement('h2'),close=document.createElement('button');
    title.textContent='編輯相簿';close.type='button';close.textContent='×';close.setAttribute('aria-label','關閉');close.onclick=()=>dialog.close();header.append(title,close);
    const body=document.createElement('div');body.className='album-edit-body';dialog.append(header,body);
    const update=()=>{api.refresh(main);changed();render()};
    const upload=(image)=>{
      const picker=document.createElement('input');picker.type='file';picker.accept='image/jpeg,image/png,image/webp';picker.hidden=true;dialog.append(picker);
      picker.onchange=()=>{
        const file=picker.files?.[0];picker.remove();if(!file)return;
        main.dispatchEvent(new CustomEvent('yuanjie:select-image',{detail:{image}}));
        const input=document.getElementById('imageUpload');
        const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
        const observer=new MutationObserver(()=>{observer.disconnect();update()});observer.observe(image,{attributes:true,attributeFilter:['src']});
      };
      picker.click();
    };
    const action=(parent,label,handler)=>{const control=document.createElement('button');control.type='button';control.textContent=label;control.onclick=handler;parent.append(control);return control};
    function render(){
      body.replaceChildren();
      const cover=album.querySelector('.project-album-cover'),coverImage=cover?.querySelector('img'),name=cover?.querySelector('strong'),items=album.querySelector('.project-album-items');
      if(!coverImage||!name||!items)return;
      const label=document.createElement('label');label.textContent='相簿名稱';const nameInput=document.createElement('input');nameInput.value=name.textContent.trim();nameInput.maxLength=80;nameInput.onchange=()=>{name.textContent=nameInput.value.trim()||'未命名相簿';update()};label.append(nameInput);body.append(label);
      const coverRow=document.createElement('section');coverRow.className='album-edit-cover';const preview=document.createElement('img');preview.src=coverImage.src;preview.alt='相簿封面';const coverActions=document.createElement('div');const coverTitle=document.createElement('h3');coverTitle.textContent='相簿封面';coverActions.append(coverTitle);action(coverActions,'更換封面照片',()=>upload(coverImage));coverRow.append(preview,coverActions);body.append(coverRow);
      const order=document.createElement('div');order.className='album-edit-actions';const all=[...grid.children].filter(node=>node.classList.contains('project-album'));const position=all.indexOf(album);const positionText=document.createElement('span');positionText.textContent=`相簿順序 ${position+1} / ${all.length}`;order.append(positionText);
      action(order,'相簿往前',()=>{if(position>0){all[position-1].before(album);update()}}).disabled=position===0;
      action(order,'相簿往後',()=>{if(position<all.length-1){all[position+1].after(album);update()}}).disabled=position===all.length-1;
      action(order,'移除相簿',()=>{if(!confirm(`確定移除「${name.textContent.trim()}」及其中所有照片？`))return;const block=album.closest('[data-block="albums"]');album.remove();api.refresh(main);changed();dialog.close();if(block)select(block)}).className='album-delete-button';
      body.append(order);
      const heading=document.createElement('h3');heading.textContent=`內頁照片 ${items.querySelectorAll(':scope > figure').length} / 39`;body.append(heading);
      const photos=document.createElement('div');photos.className='album-edit-photos';body.append(photos);
      const figures=[...items.querySelectorAll(':scope > figure')];
      figures.forEach((figure,index)=>{
        const card=document.createElement('article'),image=figure.querySelector('img'),caption=figure.querySelector('figcaption');
        const thumb=document.createElement('img');thumb.src=image?.src||'';thumb.alt=`內頁照片 ${index+1}`;card.append(thumb);
        const captionInput=document.createElement('input');captionInput.value=caption?.textContent.trim()||'';captionInput.placeholder='照片說明';captionInput.setAttribute('aria-label',`照片 ${index+1} 說明`);captionInput.onchange=()=>{caption.textContent=captionInput.value.trim();update()};card.append(captionInput);
        const controls=document.createElement('div');controls.className='album-edit-photo-actions';
        action(controls,'設為封面',()=>{coverImage.setAttribute('src',image.dataset.originalSrc||image.getAttribute('src'));coverImage.alt=image.alt;if(image.dataset.originalSrc)coverImage.dataset.originalSrc=image.dataset.originalSrc;else delete coverImage.dataset.originalSrc;update()});
        action(controls,'更換',()=>upload(image));
        action(controls,'←',()=>{if(figure.previousElementSibling){figure.previousElementSibling.before(figure);update()}}).disabled=index===0;
        action(controls,'→',()=>{if(figure.nextElementSibling){figure.nextElementSibling.after(figure);update()}}).disabled=index===figures.length-1;
        action(controls,'刪除',()=>{if(confirm('刪除這張照片？')){figure.remove();update()}});
        card.append(controls);photos.append(card);
      });
      action(body,'＋ 新增內頁照片',()=>{if(figures.length>=39){alert('每個相簿最多 40 張照片，包含封面。');return}const figure=doc.createElement('figure');figure.innerHTML='<img alt="相簿照片"><figcaption>照片說明</figcaption>';figure.querySelector('img').src=new URL('../assets/project-placeholder.svg',import.meta.url).href;items.append(figure);update();upload(figure.querySelector('img'))});
    }
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);render();dialog.showModal();
  }
  function addAlbum(block){
    const grid=block.querySelector('.project-album-grid');
    if(!grid)return;
    const album=doc.createElement('article');album.className='project-album';
    const cover=doc.createElement('button');cover.type='button';cover.className='project-album-cover';
    const figure=doc.createElement('figure'),image=doc.createElement('img'),caption=doc.createElement('figcaption');
    image.src='assets/project-placeholder.svg';image.alt='新相簿封面';
    const name=doc.createElement('strong');name.textContent=`新相簿 ${grid.querySelectorAll(':scope > .project-album').length+1}`;
    const hint=doc.createElement('small');hint.textContent='點選查看相簿';
    caption.append(name,hint);figure.append(image,caption);cover.append(figure);
    const items=doc.createElement('div');items.className='project-album-items';items.hidden=true;
    album.append(cover,items);grid.dataset.albumCollection='managed';grid.append(album);
    api.refresh(main);changed();select(block);editAlbum(album);
  }
  main.addEventListener('click',event=>{
    const cover=event.target.closest('.project-album-cover');if(!cover||!main.contains(cover))return;
    event.preventDefault();event.stopImmediatePropagation();
    const album=cover.closest('.project-album');if(album){select(album.closest('[data-block="albums"]'));editAlbum(album)}
  },true);
  function decorate(block){
    for(const node of block.querySelectorAll('h1,h2,h3,p,dt,dd,li,figcaption,small,time,strong,em,label,span,a,.eyebrow,.case-amount')){
      if(node.closest('[data-editor-ui],[data-metric-ref],.cover-explore')||node.querySelector('img,button,p,h3'))continue;
      node.setAttribute('contenteditable','true');
    }
    if(block.dataset.block==='cover'){
      if(document.getElementById('projectSelectingImplementer')&&!block.querySelector('.cover-stage-control')){
        const master=document.getElementById('projectSelectingImplementer');
        if(master){
          const label=doc.createElement('label');label.className='cover-stage-control';label.dataset.editorUi='';
          const check=doc.createElement('input');check.type='checkbox';check.checked=master.checked;
          label.append(check,doc.createTextNode('遴選實施者中（進行個案列表顯示標示）'));
          label.onclick=event=>event.stopPropagation();
          check.onchange=()=>{master.checked=check.checked;main.dataset.selectingImplementer=String(check.checked);changed()};
          master.onchange=()=>{check.checked=master.checked;main.dataset.selectingImplementer=String(master.checked)};
          (block.querySelector(':scope > .page-head .cover-narrative')||block.querySelector(':scope > .page-head .project-location')||block.querySelector(':scope > .page-head h1'))?.after(label);
        }
      }
      if(!block.querySelector('.cover-team-editor-slot')){
        const slot=doc.createElement('div');slot.className='cover-team-editor-slot';slot.dataset.editorUi='';
        const edit=doc.createElement('button');edit.type='button';edit.className='cover-team-editor-button';edit.textContent='編輯封面團隊';edit.onclick=event=>{event.stopPropagation();editCoverPartners(block)};
        slot.append(edit);const copy=block.querySelector(':scope > .page-head');(copy?.querySelector('.cover-partners')||copy?.querySelector('.cover-narrative')||copy?.querySelector('h1'))?.after(slot);
      }
      return;
    }
    if(block.dataset.block==='specs'&&!block.querySelector('.admin-sales-field')){
      const summary=block.querySelector('.case-profile-summary');
      if(summary){
        const salesRow=[...block.querySelectorAll('dl.specs > div')].find(row=>row.querySelector('dt')?.textContent.trim()==='預估總銷');
        const existing=summary.querySelector(':scope > .case-amount');
        const field=doc.createElement('label');field.className='admin-sales-field';field.dataset.editorUi='';
        const label=doc.createElement('span');label.textContent='預估總銷（留白不顯示）';
        const input=doc.createElement('input');input.type='text';input.placeholder='例如：112 億元';input.value=existing?.textContent.trim()||salesRow?.querySelector('dd')?.textContent.trim()||'';
        input.setAttribute('aria-label','預估總銷');
        input.oninput=()=>{
          const value=input.value.trim();
          let amount=summary.querySelector(':scope > .case-amount');
          if(value){
            if(!amount){amount=doc.createElement('div');amount.className='case-amount';field.before(amount)}
            amount.textContent=value;
            let caption=amount.nextElementSibling;
            if(!caption||caption===field){caption=doc.createElement('p');caption.className='case-amount-caption';caption.textContent='預估總銷售額';amount.after(caption)}
          }else{
            if(amount){const caption=amount.nextElementSibling;if(caption?.textContent.trim()==='預估總銷售額')caption.remove();amount.remove()}
          }
          changed();
        };
        field.append(label,input);summary.append(field);
        salesRow?.remove();
      }
    }
    if(block.dataset.block==='albums'&&!block.querySelector('.album-add-control')){
      const grid=block.querySelector('.project-album-grid');
      if(grid){
        const control=doc.createElement('div');control.className='album-add-control';control.dataset.editorUi='';
        const add=doc.createElement('button');add.type='button';add.textContent='＋ 新增相簿';
        add.onclick=event=>{event.preventDefault();event.stopPropagation();addAlbum(block)};
        control.append(add);grid.after(control);
      }
    }
    if(block.dataset.block==='footer'||block.querySelector(':scope > [data-editor-ui]'))return;
    const actions=doc.createElement('div');actions.className='block-editor-actions';actions.dataset.editorUi='';
    const grip=doc.createElement('button');grip.type='button';grip.dataset.editorUi='';
    grip.textContent=fixed(block)?'編輯'+api.types[block.dataset.block]:'⠿ '+api.types[block.dataset.block];grip.draggable=!fixed(block);
    grip.onclick=()=>{select(block);const rect=grip.getBoundingClientRect();main.dispatchEvent(new CustomEvent('yuanjie:select-block',{detail:{block,x:rect.right,y:rect.top}}))};
    grip.ondragstart=e=>{pending={block};e.dataTransfer.setData(dragKey,'move');e.dataTransfer.effectAllowed='move'};
    grip.ondragend=()=>{pending=null;clearDrop()};
    actions.append(grip);
    if(!fixed(block)){
      const remove=doc.createElement('button');remove.type='button';remove.className='block-delete-button';remove.textContent='刪除區塊';remove.setAttribute('aria-label',`刪除${api.types[block.dataset.block]||'此'}區塊`);
      remove.onclick=event=>{event.stopPropagation();if(confirm(`刪除「${api.types[block.dataset.block]||'此區塊'}」及其內容？`)){block.remove();select(blocks()[0]);changed()}};
      actions.append(remove);
    }
    block.prepend(actions);
  }
  const style=doc.createElement('style');style.textContent='[data-block]{position:relative}[data-selected-block]{outline:2px solid #a68b65;outline-offset:3px}[data-drop=before]{box-shadow:inset 0 5px #49728c}[data-drop=after]{box-shadow:inset 0 -5px #49728c}.block-editor-actions[data-editor-ui]{background:#ece6dc;color:#574531;margin-bottom:12px}[data-block="specs"]>[data-editor-ui]{cursor:pointer}[contenteditable]:focus{outline:1px solid #ad9370}.block-insert-slot{position:relative;display:flex;justify-content:center;align-items:center;height:48px;margin:-24px 0;z-index:3;pointer-events:none}.block-insert-slot:before{content:"";position:absolute;left:0;right:0;top:50%;border-top:1px dashed #b9b5ab;opacity:.7}.block-insert-toggle{position:relative;width:34px;height:34px;border:1px solid #a88a61;border-radius:50%;background:#fff;color:#6f5634;font:600 24px/1 sans-serif;cursor:pointer;box-shadow:0 3px 12px #0002;pointer-events:auto}.block-insert-toggle:hover,.block-insert-toggle[aria-expanded=true]{background:#4a6984;color:#fff;border-color:#4a6984}.block-insert-menu{position:absolute;left:50%;top:calc(50% + 22px);transform:translateX(-50%);display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;width:min(340px,calc(100vw - 38px));padding:12px;border:1px solid #c9c5bc;border-radius:12px;background:#fff;box-shadow:0 12px 32px #0003;pointer-events:auto}.block-insert-menu[hidden]{display:none}.block-insert-menu strong{grid-column:1/-1;font:600 14px/1.4 sans-serif;color:#344d60;margin-bottom:3px}.block-insert-menu button{border:0;border-radius:6px;background:#f1efeb;color:#303b43;padding:9px 7px;font:14px/1.3 sans-serif;cursor:pointer}.block-insert-menu button:hover,.block-insert-menu button:focus-visible{background:#dce7ed;outline:2px solid #4a6984}@media(max-width:600px){.block-insert-slot{height:42px;margin:-21px 0}.block-insert-menu{grid-template-columns:1fr 1fr}}';doc.head.append(style);
  style.textContent+='.block-editor-actions[data-editor-ui]{display:flex;align-items:center;gap:8px;width:max-content;max-width:100%;padding:5px 8px;border-radius:7px;cursor:auto}.block-editor-actions button{border:0;border-radius:5px;padding:7px 10px;background:#fff;color:#354957;font:600 12px/1.3 system-ui;cursor:pointer}.block-editor-actions .block-delete-button{background:#fff1ef;color:#a43f36}.cover-team-editor-slot[data-editor-ui]{display:flex;justify-content:flex-end;margin:12px 0 0;padding:0;background:transparent;cursor:auto}.cover-team-editor-button{border:1px solid #b5c4cd;border-radius:999px;background:#fff;color:#4a6984;padding:8px 13px;font:600 13px/1.3 system-ui;cursor:pointer}';
  style.textContent+='.cover-stage-control[data-editor-ui]{display:inline-flex;align-items:center;gap:8px;width:max-content;max-width:100%;margin:12px 0;padding:8px 12px;border:1px solid #b5c4cd;border-radius:999px;background:#fff;color:#4a6984;font:600 13px/1.3 system-ui;cursor:pointer}.cover-stage-control input{width:17px;height:17px;margin:0;accent-color:#4a6984}';
  style.textContent+='.admin-sales-field[data-editor-ui]{display:grid;gap:6px;width:min(100%,340px);margin:18px 0 8px;color:#526574;font:600 13px/1.4 system-ui;cursor:auto}.admin-sales-field input{box-sizing:border-box;width:100%;padding:10px 12px;border:1px solid #b8c7ce;border-radius:8px;background:#fff;color:#25333a;font:16px/1.4 system-ui}.admin-sales-field input:focus{outline:2px solid #4a6984;outline-offset:1px}';
  style.textContent+='.album-add-control[data-editor-ui]{display:flex;justify-content:center;margin:20px 0 8px}.album-add-control button{padding:10px 20px;border:1px solid #b8c8d1;border-radius:999px;background:#fff;color:#4a6984;font:600 14px/1.3 system-ui;cursor:pointer}.album-add-control button:hover,.album-add-control button:focus-visible{background:#e8eff3;outline:2px solid #4a6984}';
  style.textContent+='.block-insert-slot{gap:7px}.block-slot-action{position:relative;display:grid;place-items:center;width:32px;height:32px;flex:none;border:1px solid #c5cbd0;border-radius:50%;background:#fff;color:#4a6984;font:600 18px/1 system-ui;cursor:pointer;pointer-events:auto;box-shadow:0 2px 8px #0001}.block-slot-action:hover,.block-slot-action:focus-visible{background:#e8eff3;outline:2px solid #4a6984}.block-slot-delete{color:#a43f36}.block-slot-delete:hover{background:#fff1ef}.block-slot-action svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}';
  const heading=document.createElement('summary');heading.textContent='進階區塊設定';panel.append(heading,tools,list,fields);
  let active,dragged;
  const itemRows=el=>el.querySelector('.specs,.pb-items,.case-highlights,.meeting-gallery,.gallery,.heping-gallery,.taian-journal-grid,.features,.feature-story-grid,.heping-highlights,.team,.metrics,ul');
  function renderInsertControls(){
    main.querySelectorAll(':scope > .block-insert-slot').forEach(slot=>slot.remove());
    for(const [index,block] of blocks().entries()){
      if(block.dataset.block==='footer')continue;
      const slot=doc.createElement('div');slot.className='block-insert-slot';slot.dataset.editorUi='';
      const toggle=doc.createElement('button');toggle.type='button';toggle.className='block-insert-toggle';toggle.textContent='+';
      toggle.setAttribute('aria-label',`在「${api.types[block.dataset.block]||'此區塊'}」後新增區塊`);
      toggle.setAttribute('aria-expanded','false');
      const menu=doc.createElement('div');menu.className='block-insert-menu';menu.hidden=true;
      const title=doc.createElement('strong');title.textContent='在此處新增區塊';menu.append(title);
      for(const [type,label] of insertTypes)button(menu,label,()=>insert(type,nextBlock(block)));
      toggle.onclick=()=>{
        const open=menu.hidden;
        main.querySelectorAll('.block-insert-menu').forEach(other=>{other.hidden=true;other.previousElementSibling?.setAttribute('aria-expanded','false')});
        menu.hidden=!open;toggle.setAttribute('aria-expanded',String(open));
      };
      slot.append(toggle,menu);
      if(!fixed(block)){
        const action=(symbol,label,handler,className='')=>{
          const control=doc.createElement('button');control.type='button';control.className=`block-slot-action ${className}`.trim();control.textContent=symbol;control.setAttribute('aria-label',label);control.title=label;
          control.onclick=event=>{event.stopPropagation();handler()};slot.append(control);
        };
        if(index>1)action('↑','區塊上移',()=>{main.insertBefore(block,blocks()[index-1]);select(block);changed()});
        const following=blocks()[index+1];
        if(following&&!fixed(following))action('↓','區塊下移',()=>{following.after(block);select(block);changed()});
        action('','刪除區塊',()=>{if(confirm(`刪除「${api.types[block.dataset.block]||'此區塊'}」及其內容？`)){block.remove();select(blocks()[Math.max(0,index-1)]);changed()}},'block-slot-delete');
        slot.lastElementChild.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v6m4-6v6"/></svg>';
      }
      block.after(slot);
    }
  }
  doc.addEventListener('click',e=>{
    if(e.target.closest('.block-insert-slot'))return;
    main.querySelectorAll('.block-insert-menu').forEach(menu=>{menu.hidden=true;menu.previousElementSibling?.setAttribute('aria-expanded','false')});
  });
  doc.addEventListener('keydown',e=>{if(e.key==='Escape')main.querySelectorAll('.block-insert-menu').forEach(menu=>{menu.hidden=true;menu.previousElementSibling?.setAttribute('aria-expanded','false')})});
  function select(el){
    active=el;list.replaceChildren();fields.replaceChildren();
    for(const block of blocks()){block.toggleAttribute('data-selected-block',block===el);decorate(block)}
    renderInsertControls();
    for(const block of blocks()){
      const b=button(list,api.types[block.dataset.block]||'頁尾備註',()=>select(block));
      b.setAttribute('aria-pressed',String(active===block));b.draggable=!fixed(block);
      b.ondragstart=()=>{dragged=block};
      b.ondragover=e=>{if(!fixed(block))e.preventDefault()};
      b.ondrop=e=>{e.preventDefault();if(dragged&&!fixed(block)){main.insertBefore(dragged,block);select(dragged);changed()}dragged=null};
      b.ondragend=()=>{dragged=null};
    }
    if(!el)return;
    if(['gallery','albums','journal','featureStory','team'].includes(el.dataset.block)){
      const layout=document.createElement('select');layout.ariaLabel='區塊排列';
      option(layout,'auto','自動分欄');option(layout,'wide','單欄展開');
      layout.value=el.dataset.layout||'auto';
      layout.onchange=()=>{el.dataset.layout=layout.value;changed()};
      fields.append(layout);
    }
    if(!fixed(el)){
      const siblings=blocks(),index=siblings.indexOf(el);
      button(fields,'上移',()=>{main.insertBefore(el,siblings[index-1]);select(el);changed()}).disabled=index<=1;
      button(fields,'下移',()=>{siblings[index+1].after(el);select(el);changed()}).disabled=index===siblings.length-1||siblings[index+1]?.dataset.block==='footer';
      button(fields,'複製區塊',()=>{const clone=el.cloneNode(true);for(const n of [clone,...clone.querySelectorAll('[id]')])n.removeAttribute('id');clone.querySelector('[data-editor-ui]')?.remove();el.after(clone);select(clone);changed()});
      button(fields,'刪除區塊',()=>{if(confirm('刪除此區塊及其內容？')){el.remove();select(blocks()[0]);changed()}});
    }
    function input(label,value,write,target=fields){
      const l=document.createElement('label'),i=document.createElement('textarea');l.textContent=label;i.rows=1;i.value=value;
      i.oninput=()=>{write(i.value);api.refresh(main);changed()};l.append(i);target.append(l);
    }
    if(el.dataset.block==='cover'){
      button(fields,'編輯封面團隊',()=>editCoverPartners(el));
    }
    if(['story','journal'].includes(el.dataset.block)){
      button(fields,'加入圖片',()=>{
        const figure=doc.createElement('figure');figure.innerHTML='<img alt="個案照片"><figcaption>照片說明</figcaption>';
        figure.firstChild.setAttribute('src','assets/project-placeholder.svg');
        (el.querySelector('.pb-items article:last-child')||el).append(figure);
        select(el);changed();
      });
    }
    if(['story','team'].includes(el.dataset.block)){
      button(fields,'新增連結',()=>{
        const href=prompt('連結網址');if(!href||!/^https?:\/\//i.test(href))return;
        const a=doc.createElement('a');a.href=href;a.textContent='連結文字';el.append(a);select(el);changed();
      });
    }
    if(el.dataset.block==='albums'){
      const note=document.createElement('p');note.textContent='在預覽畫面點選相簿封面，即可編輯封面、照片及順序。';fields.append(note);
      return;
    }
    if(el.dataset.block==='customHtml'){
      const content=el.querySelector(':scope > .custom-html-content');
      const note=document.createElement('p');note.className='custom-html-note';note.textContent='請貼上 HTML 原始碼（可含 ChatGPT 的 ```html 程式碼圍欄），右側頁面會即時預覽。只接受安全的 inline 樣式；程式碼、樣式表與嵌入式框架會移除。影片請用「插入媒體」。';fields.append(note);
      const copy=button(fields,'複製預設 HTML 範本',async event=>{
        const target=event.currentTarget;
        try{
          if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(customHtmlTemplate);
          else{const temp=document.createElement('textarea');temp.value=customHtmlTemplate;document.body.append(temp);temp.select();document.execCommand('copy');temp.remove()}
          const original=target.textContent;target.textContent='已複製範本';setTimeout(()=>{target.textContent=original},1400);
        }catch{window.prompt('複製以下預設 HTML 範本：',customHtmlTemplate)}
      });copy.classList.add('custom-html-copy');
      const label=document.createElement('label');label.className='custom-html-editor-label';label.textContent='HTML 原始碼';
      const textarea=document.createElement('textarea');textarea.className='custom-html-source';textarea.rows=14;textarea.spellcheck=false;textarea.value=content?.innerHTML||'';textarea.setAttribute('aria-label','自訂 HTML 原始碼');
      textarea.addEventListener('input',()=>{if(!content)return;content.innerHTML=sanitizeCustomHtml(textarea.value);api.refresh(main);changed()});
      label.append(textarea);fields.append(label);
      button(fields,'在右側預覽此區塊',()=>{el.scrollIntoView({behavior:'smooth',block:'center'})});
      return;
    }
    for(const link of el.querySelectorAll('a[href]'))input('連結網址',link.getAttribute('href'),v=>{if(/^(https?:|mailto:|tel:|#|[\w.-]+\.html)/i.test(v))link.setAttribute('href',v)});
    for(const img of el.dataset.block==='albums'?[]:el.querySelectorAll('img')){
      button(fields,'圖片說明',()=>{const v=prompt('圖片替代文字',img.alt);if(v!==null){img.alt=v;changed()}});
      button(fields,'更換這張圖片',()=>{img.click();document.getElementById('imageUploadButton').click()});
    }
    for(const metric of el.querySelectorAll('[data-metric-ref]')){
      const pick=document.createElement('select');pick.ariaLabel='數據來源';option(pick,'','選取資料表欄位');
      for(const dt of main.querySelectorAll('[data-block="specs"] dt')){
        dt.parentElement.dataset.fieldId ||= crypto.randomUUID();option(pick,dt.parentElement.dataset.fieldId,dt.textContent);
      }
      pick.value=metric.dataset.metricRef;pick.onchange=()=>{metric.dataset.metricRef=pick.value;api.refresh(main);changed()};fields.append(pick);
    }
    const rows=itemRows(el);
    if(rows?.children.length){
      const pick=document.createElement('select');pick.ariaLabel='選擇項目';
      [...rows.children].forEach((r,i)=>option(pick,String(i),`項目 ${i+1}　${r.textContent.trim().slice(0,20)}`));
      fields.append(pick);
      const row=()=>rows.children[pick.selectedIndex];
      const isTeam=el.dataset.block==='team';
      button(fields,isTeam?'新增單位':'新增同類項目',()=>{const clone=row().cloneNode(true);delete clone.dataset.fieldId;rows.append(clone);select(el);changed()});
      button(fields,isTeam?'單位上移':'項目上移',()=>{const r=row();if(r.previousElementSibling){r.previousElementSibling.before(r);select(el);changed()}});
      button(fields,isTeam?'單位下移':'項目下移',()=>{const r=row();if(r.nextElementSibling){r.nextElementSibling.after(r);select(el);changed()}});
      button(fields,isTeam?'刪除單位':'移除項目',()=>{if(rows.children.length>1&&confirm(isTeam?'刪除此參與單位？':'移除所選項目？')){row().remove();api.refresh(main);select(el);changed()}}).disabled=rows.children.length===1;
    }
  }
  main.addEventListener('yuanjie:media-inserted',event=>select(event.detail.block));
  main.addEventListener('yuanjie:block-changed',event=>{select(event.detail?.block&&main.contains(event.detail.block)?event.detail.block:blocks()[0]);changed()});
  select(blocks()[0]);
}
