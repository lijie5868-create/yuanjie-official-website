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
  function insert(type,before){
    const block=api.newBlock(doc,type);
    main.insertBefore(block,before);
    select(block);changed();block.scrollIntoView({block:'center'});
  }
  for(const [type,label] of Object.entries(api.types).slice(2)){
    const tile=button(tools,label,()=>insert(type,active&&!fixed(active)?active.nextElementSibling:main.querySelector('[data-block="footer"]')));
    tile.draggable=true;
    tile.ondragstart=e=>{pending={type};e.dataTransfer.setData(dragKey,type);e.dataTransfer.effectAllowed='copy'};
    tile.ondragend=()=>{pending=null;clearDrop()};
  }
  const clearDrop=()=>main.querySelectorAll('[data-drop]').forEach(n=>delete n.dataset.drop);
  function targetAt(e){
    const block=e.target.closest('[data-block]');
    if(!block)return main.querySelector('[data-block="footer"]');
    if(['cover','specs'].includes(block.dataset.block))return blocks()[2]||null;
    if(block.dataset.block==='footer')return block;
    const rect=block.getBoundingClientRect();
    return e.clientY<rect.top+rect.height/2?block:block.nextElementSibling;
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
  function decorate(block){
    for(const node of block.querySelectorAll('h1,h2,h3,p,dt,dd,li,figcaption,small,time,strong,em,label,span,a,.eyebrow,.case-amount')){
      if(node.closest('[data-editor-ui],[data-metric-ref]')||node.querySelector('img,button,p,h3'))continue;
      node.setAttribute('contenteditable','plaintext-only');
    }
    if(fixed(block)||block.querySelector(':scope > [data-editor-ui]'))return;
    const grip=doc.createElement('button');grip.type='button';grip.dataset.editorUi='';
    grip.textContent='⠿ '+api.types[block.dataset.block];grip.draggable=true;
    grip.ondragstart=e=>{pending={block};e.dataTransfer.setData(dragKey,'move');e.dataTransfer.effectAllowed='move'};
    grip.ondragend=()=>{pending=null;clearDrop()};
    block.prepend(grip);
  }
  const style=doc.createElement('style');style.textContent='[data-block]{position:relative}[data-selected-block]{outline:2px solid #a68b65;outline-offset:3px}[data-drop=before]{box-shadow:inset 0 5px #49728c}[data-drop=after]{box-shadow:inset 0 -5px #49728c}[data-editor-ui]{display:block;border:0;background:#ece6dc;color:#574531;padding:6px 12px;cursor:grab;margin-bottom:12px}[contenteditable]:focus{outline:1px solid #ad9370}';doc.head.append(style);
  const heading=document.createElement('summary');heading.textContent='拖曳元件到預覽頁面，或點選元件加入';panel.append(heading,tools,list,fields);
  let active,dragged;
  const blocks=()=>[...main.children].filter(el=>el.dataset.block);
  const fixed=el=>['cover','specs','footer'].includes(el?.dataset.block);
  function select(el){
    active=el;list.replaceChildren();fields.replaceChildren();
    for(const block of blocks()){block.toggleAttribute('data-selected-block',block===el);decorate(block)}
    for(const block of blocks()){
      const b=button(list,api.types[block.dataset.block]||'頁尾備註',()=>select(block));
      b.setAttribute('aria-pressed',String(active===block));b.draggable=!fixed(block);
      b.ondragstart=()=>{dragged=block};
      b.ondragover=e=>{if(!fixed(block))e.preventDefault()};
      b.ondrop=e=>{e.preventDefault();if(dragged&&!fixed(block)){main.insertBefore(dragged,block);select(dragged);changed()}dragged=null};
      b.ondragend=()=>{dragged=null};
    }
    if(!el)return;
    if(['gallery','journal','features','team'].includes(el.dataset.block)){
      const layout=document.createElement('select');layout.ariaLabel='區塊排列';
      option(layout,'auto','自動分欄');option(layout,'wide','單欄展開');
      layout.value=el.dataset.layout||'auto';
      layout.onchange=()=>{el.dataset.layout=layout.value;changed()};
      fields.append(layout);
    }
    if(!fixed(el)){
      const siblings=blocks(),index=siblings.indexOf(el);
      button(fields,'上移',()=>{main.insertBefore(el,siblings[index-1]);select(el);changed()}).disabled=index<=2;
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
    for(const link of el.querySelectorAll('a[href]'))input('連結網址',link.getAttribute('href'),v=>{if(/^(https?:|mailto:|tel:|#|[\w.-]+\.html)/i.test(v))link.setAttribute('href',v)});
    for(const img of el.querySelectorAll('img')){
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
    const rows=el.querySelector('.specs,.pb-items,.case-highlights,.meeting-gallery,.gallery,.heping-gallery,.taian-journal-grid,.features,.heping-highlights,.team,.metrics,ul');
    if(rows?.children.length){
      const pick=document.createElement('select');pick.ariaLabel='選擇項目';
      [...rows.children].forEach((r,i)=>option(pick,String(i),(i+1)+' '+r.textContent.trim().slice(0,20)));
      fields.append(pick);
      const row=()=>rows.children[pick.selectedIndex];
      button(fields,'新增同類項目',()=>{const clone=row().cloneNode(true);delete clone.dataset.fieldId;rows.append(clone);select(el);changed()});
      button(fields,'項目上移',()=>{const r=row();if(r.previousElementSibling){r.previousElementSibling.before(r);select(el);changed()}});
      button(fields,'項目下移',()=>{const r=row();if(r.nextElementSibling){r.nextElementSibling.after(r);select(el);changed()}});
      button(fields,'移除項目',()=>{if(rows.children.length>1&&confirm('移除所選項目？')){row().remove();api.refresh(main);select(el);changed()}}).disabled=rows.children.length===1;
    }
  }
  select(blocks()[0]);
}
