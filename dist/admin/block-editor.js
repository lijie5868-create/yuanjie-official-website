export function bindBlocks(main,panel,changed){
  const doc=main.ownerDocument;
  const api=window.ProjectBlocks;
  panel.hidden=false;
  panel.replaceChildren();
  const list=document.createElement('div'), fields=document.createElement('div');
  const tools=document.createElement('div'), add=document.createElement('select');
  const option=(select,value,label)=>select.add(new Option(label,value));
  Object.entries(api.types).slice(2).forEach(([type,label])=>option(add,type,label));
  function button(target,label,action){
    const el=document.createElement('button');el.type='button';el.textContent=label;
    el.onclick=action;target.append(el);return el;
  }
  tools.append(add);
  button(tools,'加入區塊',()=>{
    const block=api.newBlock(doc,add.value);
    main.insertBefore(block,main.querySelector('[data-block="footer"]'));
    select(block);changed();
  });
  const heading=document.createElement('summary');heading.textContent='個案區塊編輯器';panel.append(heading,list,tools,fields);
  let active,dragged;
  const blocks=()=>[...main.children].filter(el=>el.dataset.block);
  const fixed=el=>['cover','specs','footer'].includes(el?.dataset.block);
  function select(el){
    active=el;list.replaceChildren();fields.replaceChildren();
    for(const block of blocks()){
      const b=button(list,api.types[block.dataset.block]||'頁尾備註',()=>select(block));
      b.setAttribute('aria-pressed',String(active===block));b.draggable=!fixed(block);
      b.ondragstart=()=>{dragged=block};
      b.ondragover=e=>{if(!fixed(block))e.preventDefault()};
      b.ondrop=e=>{e.preventDefault();if(dragged&&!fixed(block)){main.insertBefore(dragged,block);select(dragged);changed()}dragged=null};
      b.ondragend=()=>{dragged=null};
    }
    if(!el)return;
    if(!fixed(el)){
      const siblings=blocks(),index=siblings.indexOf(el);
      button(fields,'上移',()=>{main.insertBefore(el,siblings[index-1]);select(el);changed()}).disabled=index<=2;
      button(fields,'下移',()=>{siblings[index+1].after(el);select(el);changed()}).disabled=index===siblings.length-1||siblings[index+1]?.dataset.block==='footer';
      button(fields,'複製區塊',()=>{const clone=el.cloneNode(true);for(const n of [clone,...clone.querySelectorAll('[id]')])n.removeAttribute('id');el.after(clone);select(clone);changed()});
      button(fields,'刪除區塊',()=>{if(confirm('刪除此區塊及其內容？')){el.remove();select(blocks()[0]);changed()}});
    }
    function input(label,value,write){
      const l=document.createElement('label'),i=document.createElement('textarea');l.textContent=label;i.rows=1;i.value=value;
      i.oninput=()=>{write(i.value);api.refresh(main);changed()};l.append(i);fields.append(l);
    }
    const walker=doc.createTreeWalker(el,4);
    while(walker.nextNode()){
      const node=walker.currentNode,parent=node.parentElement;
      if(!node.textContent.trim()||parent.closest('[data-metric-ref]'))continue;
      const label=({H1:'案名',H2:'標題',H3:'小標題',DT:'欄名',DD:'欄位值',FIGCAPTION:'圖說',TIME:'日期',A:'連結文字'})[parent.tagName]||'文字';
      input(label,node.textContent,v=>{node.textContent=v;if(parent.matches('time'))parent.removeAttribute('datetime')});
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
      input('圖片替代文字',img.alt,v=>img.alt=v);
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
