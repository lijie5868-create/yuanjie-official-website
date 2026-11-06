const templates={
  text:'<div class="wrap"><div class="eyebrow">COMPANY / 公司介紹</div><h2>段落標題</h2><p class="copy">請在此輸入內容。</p></div>',
  image:'<div class="wrap"><div class="eyebrow">COMPANY / 圖片</div><h2>圖片與說明</h2><figure><img src="../assets/project-placeholder.svg" alt="待上傳圖片"><figcaption>圖片說明</figcaption></figure></div>',
  cards:'<div class="wrap"><div class="eyebrow">COMPANY / 服務項目</div><h2>服務項目</h2><div class="service-grid"><article><h3>服務名稱</h3><p>服務說明</p></article><article><h3>服務名稱</h3><p>服務說明</p></article></div></div>'
};
const labels={intro:'公司頁首',text:'文字段落',image:'圖片段落',cards:'服務項目',content:'內容區塊'};

export function isCompanyPage(page){return /^(?:chengyu|jiutai|company-\d+)\.html$/.test(page?.file_name||'')}

export function bindCompanyBlocks(main,panel,changed){
  const doc=main.ownerDocument;
  const sections=()=>[...main.children].filter(node=>node.tagName==='SECTION');
  const typeOf=section=>section.dataset.companyBlock|| (section.classList.contains('page-head')?'intro':section.querySelector('.service-grid')?'cards':section.querySelector('img')?'image':'content');
  for(const section of sections())section.dataset.companyBlock=typeOf(section);
  main.dataset.companyBlocks='1';
  panel.hidden=false;panel.replaceChildren();
  const title=doc.createElement('summary');title.textContent='公司頁面區塊';
  const tools=doc.createElement('div'),list=doc.createElement('div'),fields=doc.createElement('div');
  panel.append(title,tools,list,fields);
  const button=(parent,label,run)=>{const node=doc.createElement('button');node.type='button';node.textContent=label;node.onclick=run;parent.append(node);return node};
  let active=null;
  function add(type,before){
    const section=doc.createElement('section');section.className='company-content-block';section.dataset.companyBlock=type;section.innerHTML=templates[type];
    main.insertBefore(section,before||null);render(section);changed();section.scrollIntoView({block:'center'});
  }
  for(const [type,label] of Object.entries(labels))if(templates[type])button(tools,'＋ '+label,()=>add(type,active?.nextElementSibling));
  const style=doc.createElement('style');style.textContent='[data-company-block]{position:relative}[data-company-block][data-selected-block]{outline:2px solid #a68b65;outline-offset:3px}.company-block-trigger{display:block;margin:8px 0 12px;padding:6px 12px;border:0;border-radius:5px;background:#ece6dc;color:#574531;font:13px system-ui;cursor:pointer}.company-block-slot{display:flex;justify-content:center;position:relative;z-index:3;margin:-12px 0}.company-block-slot>button{width:36px;height:36px;border:1px solid #a88a61;border-radius:50%;background:#fff;color:#6f5634;font:600 24px/1 sans-serif;cursor:pointer}.company-block-menu{position:absolute;top:38px;display:flex;gap:5px;flex-wrap:wrap;max-width:min(380px,90vw);padding:8px;border:1px solid #c9c5bc;border-radius:9px;background:#fff;box-shadow:0 12px 25px #0003}.company-block-menu[hidden]{display:none}.company-block-menu button{padding:8px;border:0;border-radius:5px;background:#f1efeb;color:#303b43;cursor:pointer}';doc.head.append(style);
  function render(selected=active){
    active=sections().includes(selected)?selected:sections()[0]||null;
    main.querySelectorAll('[data-editor-ui]').forEach(node=>node.remove());
    list.replaceChildren();fields.replaceChildren();
    for(const section of sections()){
      section.dataset.companyBlock=typeOf(section);section.toggleAttribute('data-selected-block',section===active);
      for(const node of section.querySelectorAll('h1,h2,h3,p,figcaption,small,time,strong,em,li,dt,dd,span'))if(!node.querySelector('img,button,p,h3'))node.contentEditable='true';
      const trigger=doc.createElement('button');trigger.type='button';trigger.className='company-block-trigger';trigger.dataset.editorUi='';trigger.textContent='編輯'+(labels[typeOf(section)]||'區塊');
      trigger.onclick=()=>{render(section);const rect=trigger.getBoundingClientRect();main.dispatchEvent(new CustomEvent('yuanjie:select-block',{detail:{block:section,x:rect.right,y:rect.top}}))};
      section.prepend(trigger);
      const slot=doc.createElement('div');slot.className='company-block-slot';slot.dataset.editorUi='';
      const plus=button(slot,'＋',()=>{menu.hidden=!menu.hidden});plus.setAttribute('aria-label','在此新增公司區塊');
      const menu=doc.createElement('div');menu.className='company-block-menu';menu.hidden=true;
      for(const type of Object.keys(templates))button(menu,labels[type],()=>add(type,section.nextElementSibling));
      slot.append(menu);section.after(slot);
      const pick=button(list,labels[typeOf(section)]||'內容區塊',()=>render(section));pick.setAttribute('aria-pressed',String(section===active));
    }
    if(!active)return;
    const all=sections(),index=all.indexOf(active);
    button(fields,'上移',()=>{all[index-1]?.before(active);render(active);changed()}).disabled=index===0;
    button(fields,'下移',()=>{all[index+1]?.after(active);render(active);changed()}).disabled=index===all.length-1;
    button(fields,'刪除區塊',()=>{if(!doc.defaultView.confirm('刪除整個區塊及其內容？'))return;active.remove();render(null);changed()});
  }
  main.addEventListener('click',event=>{const block=event.target.closest('[data-company-block]');if(block&&block!==active&&main.contains(block))render(block)});
  main.addEventListener('yuanjie:block-changed',event=>{render(event.detail?.block||null);changed()});
  render();
}
