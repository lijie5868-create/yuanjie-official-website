export function bindBlocks(main,panel,changed){
  const doc=main.ownerDocument;
  const api=window.ProjectBlocks;
  panel.hidden=false;
  panel.replaceChildren();
  const list=document.createElement('div'), fields=document.createElement('div');
  const tools=document.createElement('div');
  const option=(select,value,label)=>select.add(new Option(label,value));
  function button(target,label,action){
    const el=document.createElement('button');el.type='button';el.textContent=label;
    el.onclick=action;target.append(el);return el;
  }
  const dragKey='application/x-yuanjie-project-block';
  let pending=null;
  const blocks=()=>[...main.children].filter(el=>el.dataset.block);
  const nextBlock=block=>blocks()[blocks().indexOf(block)+1]||null;
  const fixed=el=>['cover','specs','footer'].includes(el?.dataset.block);
  function insert(type,before){
    const block=api.newBlock(doc,type);
    main.insertBefore(block,before);
    select(block);changed();block.scrollIntoView({block:'center'});
  }
  for(const [type,label] of Object.entries(api.types).slice(2)){
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
  main.addEventListener('paste',e=>{
    if(!e.target.closest('[contenteditable]'))return;
    e.preventDefault();doc.execCommand('insertText',false,e.clipboardData.getData('text/plain'));
  });
  function decorate(block){
    for(const node of block.querySelectorAll('h1,h2,h3,p,dt,dd,li,figcaption,small,time,strong,em,label,span,a,.eyebrow,.case-amount')){
      if(node.closest('[data-editor-ui],[data-metric-ref]')||node.querySelector('img,button,p,h3'))continue;
      node.setAttribute('contenteditable','true');
    }
    if(block.dataset.block==='cover'||block.dataset.block==='footer'||block.querySelector(':scope > [data-editor-ui]'))return;
    const grip=doc.createElement('button');grip.type='button';grip.dataset.editorUi='';
    grip.textContent=fixed(block)?'編輯'+api.types[block.dataset.block]:'⠿ '+api.types[block.dataset.block];grip.draggable=!fixed(block);
    grip.onclick=()=>{select(block);const rect=grip.getBoundingClientRect();main.dispatchEvent(new CustomEvent('yuanjie:select-block',{detail:{block,x:rect.right,y:rect.top}}))};
    grip.ondragstart=e=>{pending={block};e.dataTransfer.setData(dragKey,'move');e.dataTransfer.effectAllowed='move'};
    grip.ondragend=()=>{pending=null;clearDrop()};
    block.prepend(grip);
  }
  const style=doc.createElement('style');style.textContent='[data-block]{position:relative}[data-selected-block]{outline:2px solid #a68b65;outline-offset:3px}[data-drop=before]{box-shadow:inset 0 5px #49728c}[data-drop=after]{box-shadow:inset 0 -5px #49728c}[data-editor-ui]:not(.block-insert-slot){display:block;border:0;background:#ece6dc;color:#574531;padding:6px 12px;cursor:grab;margin-bottom:12px}[data-block="specs"]>[data-editor-ui]{cursor:pointer}[contenteditable]:focus{outline:1px solid #ad9370}.block-insert-slot{position:relative;display:flex;justify-content:center;align-items:center;height:48px;margin:-24px 0;z-index:3;pointer-events:none}.block-insert-slot:before{content:"";position:absolute;left:0;right:0;top:50%;border-top:1px dashed #b9b5ab;opacity:.7}.block-insert-toggle{position:relative;width:34px;height:34px;border:1px solid #a88a61;border-radius:50%;background:#fff;color:#6f5634;font:600 24px/1 sans-serif;cursor:pointer;box-shadow:0 3px 12px #0002;pointer-events:auto}.block-insert-toggle:hover,.block-insert-toggle[aria-expanded=true]{background:#4a6984;color:#fff;border-color:#4a6984}.block-insert-menu{position:absolute;left:50%;top:calc(50% + 22px);transform:translateX(-50%);display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;width:min(340px,calc(100vw - 38px));padding:12px;border:1px solid #c9c5bc;border-radius:12px;background:#fff;box-shadow:0 12px 32px #0003;pointer-events:auto}.block-insert-menu[hidden]{display:none}.block-insert-menu strong{grid-column:1/-1;font:600 14px/1.4 sans-serif;color:#344d60;margin-bottom:3px}.block-insert-menu button{border:0;border-radius:6px;background:#f1efeb;color:#303b43;padding:9px 7px;font:14px/1.3 sans-serif;cursor:pointer}.block-insert-menu button:hover,.block-insert-menu button:focus-visible{background:#dce7ed;outline:2px solid #4a6984}@media(max-width:600px){.block-insert-slot{height:42px;margin:-21px 0}.block-insert-menu{grid-template-columns:1fr 1fr}}';doc.head.append(style);
  const heading=document.createElement('summary');heading.textContent='拖曳元件到預覽頁面，或點選元件加入';panel.append(heading,tools,list,fields);
  let active,dragged;
  const itemRows=el=>el.querySelector('.specs,.pb-items,.case-highlights,.meeting-gallery,.gallery,.heping-gallery,.taian-journal-grid,.features,.feature-story-grid,.heping-highlights,.team,.metrics,ul');
  function renderInsertControls(){
    main.querySelectorAll(':scope > .block-insert-slot').forEach(slot=>slot.remove());
    for(const block of blocks()){
      if(block.dataset.block==='footer')continue;
      const slot=doc.createElement('div');slot.className='block-insert-slot';slot.dataset.editorUi='';
      const toggle=doc.createElement('button');toggle.type='button';toggle.className='block-insert-toggle';toggle.textContent='+';
      toggle.setAttribute('aria-label',`在「${api.types[block.dataset.block]||'此區塊'}」後新增區塊`);
      toggle.setAttribute('aria-expanded','false');
      const menu=doc.createElement('div');menu.className='block-insert-menu';menu.hidden=true;
      const title=doc.createElement('strong');title.textContent='在此處新增區塊';menu.append(title);
      for(const [type,label] of Object.entries(api.types).slice(2))button(menu,label,()=>insert(type,nextBlock(block)));
      toggle.onclick=()=>{
        const open=menu.hidden;
        main.querySelectorAll('.block-insert-menu').forEach(other=>{other.hidden=true;other.previousElementSibling?.setAttribute('aria-expanded','false')});
        menu.hidden=!open;toggle.setAttribute('aria-expanded',String(open));
      };
      slot.append(toggle,menu);block.after(slot);
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
    if(['gallery','albums','journal','features','featureStory','team'].includes(el.dataset.block)){
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
    function input(label,value,write){
      const l=document.createElement('label'),i=document.createElement('textarea');l.textContent=label;i.rows=1;i.value=value;
      i.oninput=()=>{write(i.value);api.refresh(main);changed()};l.append(i);fields.append(l);
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
      const grid=el.querySelector('.project-album-grid');
      const albumPick=document.createElement('select');albumPick.ariaLabel='選擇相簿';
      [...grid.children].forEach((album,i)=>option(albumPick,String(i),`相簿 ${i+1}　${album.querySelector('strong')?.textContent||''}`));fields.append(albumPick);
      const album=()=>grid.children[albumPick.selectedIndex];
      button(fields,'新增相簿',()=>{if(grid.children.length>=12)return alert('每個圖片集最多 12 個相簿。');const clone=api.newBlock(doc,'albums').querySelector('.project-album');grid.append(clone);select(el);changed()});
      button(fields,'相簿上移',()=>{const a=album();if(a.previousElementSibling){a.previousElementSibling.before(a);select(el);changed()}});
      button(fields,'相簿下移',()=>{const a=album();if(a.nextElementSibling){a.nextElementSibling.after(a);select(el);changed()}});
      button(fields,'刪除相簿',()=>{if(grid.children.length>1&&confirm('刪除此相簿及其中所有照片？')){album().remove();select(el);changed()}}).disabled=grid.children.length===1;
      button(fields,'更換相簿封面',()=>{album().querySelector('.project-album-cover img').click();document.getElementById('imageUploadButton').click()});
      button(fields,'新增相簿照片',()=>{const a=album(),count=1+a.querySelectorAll('.project-album-items figure').length;if(count>=40)return alert('每個相簿最多 40 張照片。');const figure=doc.createElement('figure');figure.innerHTML='<img alt="相簿照片"><figcaption>照片說明</figcaption>';figure.querySelector('img').src=new URL('../assets/project-placeholder.svg',import.meta.url).href;a.querySelector('.project-album-items').append(figure);select(el);figure.querySelector('img').click();document.getElementById('imageUploadButton').click();changed()});
      const photos=[...album().querySelectorAll('.project-album-items figure')];
      if(photos.length){
        const photoPick=document.createElement('select');photoPick.ariaLabel='選擇相簿內照片';photos.forEach((figure,i)=>option(photoPick,String(i),`內頁照片 ${i+1}　${figure.querySelector('figcaption')?.textContent||''}`));fields.append(photoPick);
        const photo=()=>album().querySelectorAll('.project-album-items figure')[photoPick.selectedIndex];
        button(fields,'更換內頁照片',()=>{photo().querySelector('img').click();document.getElementById('imageUploadButton').click()});
        button(fields,'照片上移',()=>{const p=photo();if(p.previousElementSibling){p.previousElementSibling.before(p);select(el);changed()}});
        button(fields,'照片下移',()=>{const p=photo();if(p.nextElementSibling){p.nextElementSibling.after(p);select(el);changed()}});
        button(fields,'刪除內頁照片',()=>{if(confirm('刪除這張相簿內頁照片？')){photo().remove();select(el);changed()}});
      }
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
      const featureItems=el.dataset.block==='features';
      if(featureItems)return;
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
